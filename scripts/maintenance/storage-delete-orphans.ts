/**
 * Pulizia guidata dei file non collegati, in DUE tempi:
 *
 *  1) npx tsx scripts/maintenance/storage-delete-orphans.ts plan <analisi.csv> <storage-locale> <elenco-output.csv>
 *     Costruisce e VERIFICA l'elenco da eliminare (sola lettura). Non cancella nulla.
 *  2) npx tsx scripts/maintenance/storage-delete-orphans.ts apply <elenco.csv> <storage-locale>
 *     Elimina SOLO i file dell'elenco approvato, dopo aver ricontrollato che nessun candidato/annuncio li referenzi,
 *     da Supabase Storage e dalla copia locale (incluse le versioni in _versioni e il manifest). Scrive un log.
 *
 * Categorie (come da analisi): copie identiche di CV collegati; immagini di annunci non più usate;
 * PDF di prova da 220 byte; CV di form abbandonati (contatti ma nessun candidato).
 */
import 'dotenv/config';
import { config } from 'dotenv';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import { PrismaClient } from '@prisma/client';
import { listBucketObjects } from '../../utils/storageList';
import { resolveCvPath } from '../../utils/cvStorage';

config({ path: '.env.local' });

const parse = (f: string) =>
  fs.readFileSync(f, 'utf8').split(/\r?\n/).slice(1).filter(Boolean).map((l) => (l.match(/"([^"]*)"/g) ?? []).map((s) => s.slice(1, -1)));
const sha = (b: Buffer) => crypto.createHash('sha256').update(b).digest('hex');
const REASONS = {
  A: 'copia identica di un CV collegato',
  IMG: 'immagine di annuncio non piu usata',
  TEST: 'PDF di prova (220 byte)',
  G: 'CV di form abbandonato (nessun candidato)',
} as const;

function client() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Imposta NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY.');
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

async function loadReferences(prisma: PrismaClient) {
  const cands = await prisma.candidate.findMany({ where: { cvUrl: { not: null } }, select: { cvUrl: true } });
  const refs = new Set<string>();
  for (const c of cands) { const p = resolveCvPath(c.cvUrl); if (p) refs.add(p); }
  const jobs = await prisma.job.findMany({ where: { imageUrl: { not: null } }, select: { imageUrl: true } });
  const imgs = new Set<string>();
  for (const j of jobs) { const p = resolveCvPath(j.imageUrl); if (p) imgs.add(p); }
  return { cvRefs: refs, imageRefs: imgs, candidates: cands.length };
}

async function plan(analysisCsv: string, storageDir: string, outCsv: string) {
  const supabase = client();
  const prisma = new PrismaClient();
  try {
    const rows = parse(analysisCsv); // bucket,percorso,data,dim,classe,id,nota
    const { cvRefs, imageRefs } = await loadReferences(prisma);
    const inBucket = new Map<string, unknown>();
    for (const b of ['cvs', 'candidates']) for (const o of await listBucketObjects(supabase, b)) inBucket.set(`${b}/${o.path}`, o);
    const logosPaths = new Set((await listBucketObjects(supabase, 'logos')).map((o) => o.path));

    const list: { bucket: string; path: string; reason: string; size: number; date: string; note: string }[] = [];
    const skipped: string[] = [];
    const cands = await prisma.candidate.findMany({ select: { id: true, cvUrl: true } });
    const cvOfCandidate = new Map(cands.map((c) => [c.id, resolveCvPath(c.cvUrl)]));

    for (const r of rows) {
      const [bucket, p, date, size, cls, candId] = r;
      const c = cls[0];
      const obj = inBucket.get(`${bucket}/${p}`);
      if (!obj) { skipped.push(`${p}: non più presente nel bucket`); continue; }
      if (imageRefs.has(p)) { skipped.push(`${p}: originale di un'immagine in uso (copiata in logos): tenuto`); continue; }
      if (cvRefs.has(p)) { skipped.push(`${p}: ORA risulta collegato a un candidato, escluso`); continue; }

      if (c === 'A') {
        // la copia "gemella" deve esistere ancora, essere collegata e avere lo stesso contenuto
        const twin = cvOfCandidate.get(candId);
        const lf = path.join(storageDir, bucket, ...p.split('/'));
        const tf = twin ? path.join(storageDir, 'cvs', ...twin.split('/')) : '';
        if (!twin || !inBucket.has(`cvs/${twin}`) || !fs.existsSync(lf) || !fs.existsSync(tf) || sha(fs.readFileSync(lf)) !== sha(fs.readFileSync(tf))) {
          skipped.push(`${p}: gemella non verificabile, escluso`); continue;
        }
        list.push({ bucket, path: p, reason: REASONS.A, size: +size, date, note: 'gemella collegata e identica verificata' });
      } else if (c === 'E' && p.startsWith('job-images/') && p.endsWith('.jpg')) {
        if (logosPaths.has(p)) { skipped.push(`${p}: copia già in uso da logos (originale tenuto)`); continue; }
        list.push({ bucket, path: p, reason: REASONS.IMG, size: +size, date, note: 'non referenziata da nessun annuncio' });
      } else if (c === 'E' && p.endsWith('.pdf') && +size <= 300) {
        list.push({ bucket, path: p, reason: REASONS.TEST, size: +size, date, note: 'illeggibile, 220 byte' });
      } else if (c === 'G') {
        list.push({ bucket, path: p, reason: REASONS.G, size: +size, date, note: 'ha contatti ma nessun candidato' });
      }
      // B, D, H e gli altri: NON inclusi (collegamento possibile o debole)
    }
    fs.writeFileSync(outCsv, 'bucket,percorso,motivo,dimensione_byte,data,nota\n' + list.map((x) => [x.bucket, x.path, x.reason, x.size, x.date, x.note].map((v) => `"${v}"`).join(',')).join('\n'));

    const by: Record<string, { n: number; b: number }> = {};
    for (const x of list) { by[x.reason] = by[x.reason] ?? { n: 0, b: 0 }; by[x.reason].n++; by[x.reason].b += x.size; }
    console.log('ELENCO DA ELIMINARE (nulla è stato cancellato):');
    for (const [k, v] of Object.entries(by)) console.log(`  ${String(v.n).padStart(3)}  ${k}  (${(v.b / 1048576).toFixed(1)} MB)`);
    console.log(`  ---  totale ${list.length} file, ${(list.reduce((s, x) => s + x.size, 0) / 1048576).toFixed(1)} MB`);
    console.log(`Esclusi/ignorati: ${skipped.length}`); skipped.slice(0, 60).forEach((s) => console.log('   -', s));
    console.log(`Elenco completo: ${outCsv}`);
    console.log(`Riferimenti verificati nel database: ${cvRefs.size} CV collegati, ${imageRefs.size} immagini di annunci.`);
  } finally { await prisma.$disconnect(); }
}

async function apply(listCsv: string, storageDir: string) {
  const supabase = client();
  const prisma = new PrismaClient();
  const logDir = process.env.BACKUP_LOG_DIR ?? path.dirname(listCsv);
  const logFile = path.join(logDir, 'eliminazione-orfani.log');
  const log = (m: string) => { const l = `${new Date().toISOString()} ${m}`; console.log(l); fs.appendFileSync(logFile, l + '\n'); };
  try {
    const rows = parse(listCsv); // bucket,percorso,motivo,dim,data,nota
    const { cvRefs, imageRefs } = await loadReferences(prisma);
    const safe = rows.filter((r) => {
      const ok = !cvRefs.has(r[1]) && !imageRefs.has(r[1]);
      if (!ok) log(`SALTATO (ora collegato): ${r[1]}`);
      return ok;
    });
    log(`Eliminazione: ${safe.length}/${rows.length} file dell'elenco approvato`);

    // 1) Storage (a lotti)
    let removed = 0;
    for (const bucket of [...new Set(safe.map((r) => r[0]))]) {
      const paths = safe.filter((r) => r[0] === bucket).map((r) => r[1]);
      for (let i = 0; i < paths.length; i += 50) {
        const { error } = await supabase.storage.from(bucket).remove(paths.slice(i, i + 50));
        if (error) throw new Error(`remove(${bucket}): ${error.message}`);
        removed += Math.min(50, paths.length - i);
      }
    }
    log(`Storage: ${removed} file eliminati`);

    // 2) copia locale: file, versioni in _versioni e manifest
    let local = 0, versions = 0;
    const manifestFile = path.join(storageDir, '.backup-manifest.json');
    const manifest: Record<string, unknown> = fs.existsSync(manifestFile) ? JSON.parse(fs.readFileSync(manifestFile, 'utf8')) : {};
    const versDir = path.join(storageDir, '_versioni');
    const stamps = fs.existsSync(versDir) ? fs.readdirSync(versDir) : [];
    for (const r of safe) {
      const f = path.join(storageDir, r[0], ...r[1].split('/'));
      if (fs.existsSync(f)) { fs.unlinkSync(f); local++; }
      for (const s of stamps) {
        const vf = path.join(versDir, s, r[0], ...r[1].split('/'));
        if (fs.existsSync(vf)) { fs.unlinkSync(vf); versions++; }
      }
      delete manifest[`${r[0]}/${r[1]}`];
    }
    fs.writeFileSync(manifestFile, JSON.stringify(manifest));
    log(`Copia locale: ${local} file e ${versions} versioni eliminati; manifest aggiornato`);
    log('Nota: i backup giornalieri di Supabase conservano i file fino alla loro scadenza.');
  } finally { await prisma.$disconnect(); }
}

const [cmd, a, b, c] = process.argv.slice(2);
(async () => {
  if (cmd === 'plan' && a && b && c) return plan(a, b, c);
  if (cmd === 'apply' && a && b) return apply(a, b);
  throw new Error('Uso: plan <analisi.csv> <storage-locale> <elenco-output.csv>  |  apply <elenco.csv> <storage-locale>');
})().catch((e) => { console.error(e.message ?? e); process.exit(1); });
