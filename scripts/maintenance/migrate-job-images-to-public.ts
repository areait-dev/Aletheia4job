/**
 * Sposta le immagini degli annunci (Job.imageUrl) dal bucket privato `cvs` al bucket pubblico `logos`.
 * Le immagini di un annuncio sono pubbliche per natura (compaiono su home e pagina dell'offerta);
 * `cvs` deve restare privato e contenere solo CV.
 *
 *   npx tsx scripts/maintenance/migrate-job-images-to-public.ts            # prova (non scrive nulla)
 *   npx tsx scripts/maintenance/migrate-job-images-to-public.ts --apply    # crea il bucket, copia i file, aggiorna imageUrl
 *
 * - Copia (non sposta): i file originali in `cvs` NON vengono cancellati.
 * - Prima di aggiornare il database scrive un CSV con i vecchi valori (per tornare indietro).
 * - Controlla che ogni file sia davvero un'immagine (firma del file) prima di copiarlo.
 * - Alla fine verifica con una richiesta HEAD ogni nuovo URL.
 */
import 'dotenv/config';
import { config } from 'dotenv';
import fs from 'node:fs';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';
import { PrismaClient } from '@prisma/client';
import { detectImageType } from '../../utils/imageSignature';

config({ path: '.env.local' });

const SRC = 'cvs';
const DST = 'logos';
const MARK = `/storage/v1/object/public/${SRC}/`;
const CONTENT_TYPE: Record<string, string> = { png: 'image/png', jpeg: 'image/jpeg', webp: 'image/webp', svg: 'image/svg+xml' };

async function main() {
  const apply = process.argv.includes('--apply');
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Imposta NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY.');
  const supabase = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const prisma = new PrismaClient();

  try {
    const jobs = await prisma.job.findMany({ where: { imageUrl: { contains: MARK } }, select: { id: true, imageUrl: true } });
    console.log(`${apply ? 'APPLICO' : 'PROVA'}: ${jobs.length} annunci con imageUrl nel bucket ${SRC}`);

    // 1) bucket di destinazione: pubblico, solo immagini, 5 MB
    const { data: buckets } = await supabase.storage.listBuckets();
    const exists = buckets?.some((b) => b.id === DST);
    console.log(`Bucket ${DST}: ${exists ? 'esiste' : 'NON esiste'}`);
    if (apply && !exists) {
      const { error } = await supabase.storage.createBucket(DST, {
        public: true,
        fileSizeLimit: 5 * 1024 * 1024,
        allowedMimeTypes: Object.values(CONTENT_TYPE),
      });
      if (error) throw new Error(`createBucket: ${error.message}`);
      console.log(`Bucket ${DST} creato (pubblico, solo immagini, 5 MB)`);
    }

    // 2) copia i file e prepara la mappatura
    const plan: { id: string; oldUrl: string; newUrl: string; path: string }[] = [];
    const problems: string[] = [];
    for (const j of jobs) {
      const rel = decodeURIComponent(j.imageUrl!.split(MARK)[1].split('?')[0]);
      const { data, error } = await supabase.storage.from(SRC).download(rel);
      if (error || !data) { problems.push(`${j.id}: file non scaricabile (${error?.message})`); continue; }
      const buf = Buffer.from(await data.arrayBuffer());
      const type = detectImageType(buf);
      if (!type) { problems.push(`${j.id}: ${rel} NON è un'immagine riconosciuta: non copiato`); continue; }
      const newUrl = `${url}/storage/v1/object/public/${DST}/${rel}`;
      plan.push({ id: j.id, oldUrl: j.imageUrl!, newUrl, path: rel });
      if (apply) {
        const up = await supabase.storage.from(DST).upload(rel, buf, { contentType: CONTENT_TYPE[type], upsert: false });
        if (up.error && !/already exists|duplicate/i.test(up.error.message)) { problems.push(`${j.id}: upload ${up.error.message}`); plan.pop(); }
      }
    }
    console.log(`Immagini valide: ${plan.length}/${jobs.length}`);
    if (problems.length) console.error('PROBLEMI:\n  ' + problems.join('\n  '));

    // 3) CSV di ripristino, poi aggiornamento del database
    if (apply && plan.length) {
      const dir = process.env.BACKUP_LOG_DIR ?? path.join(process.cwd(), 'tmp');
      fs.mkdirSync(dir, { recursive: true });
      const csv = path.join(dir, `job-images-migrazione-${new Date().toISOString().replace(/[:.]/g, '-')}.csv`);
      fs.writeFileSync(csv, 'jobId,vecchio_imageUrl,nuovo_imageUrl\n' + plan.map((p) => `"${p.id}","${p.oldUrl}","${p.newUrl}"`).join('\n'));
      console.log(`CSV di ripristino: ${csv}`);
      for (const p of plan) await prisma.job.update({ where: { id: p.id }, data: { imageUrl: p.newUrl } });
      console.log(`imageUrl aggiornato su ${plan.length} annunci`);
    }

    // 4) verifica HEAD
    const targets = apply ? plan.map((p) => p.newUrl) : jobs.map((j) => j.imageUrl!);
    const codes: Record<string, number> = {};
    for (const t of targets) {
      const r = await fetch(t, { method: 'HEAD' });
      const k = `${r.status} ${r.headers.get('content-type') ?? ''}`.trim();
      codes[k] = (codes[k] ?? 0) + 1;
    }
    console.log(`Verifica HEAD (${apply ? 'nuovi URL' : 'URL attuali'}):`, JSON.stringify(codes));
    if (problems.length) process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}
main().catch((e) => { console.error(e.message ?? e); process.exit(1); });
