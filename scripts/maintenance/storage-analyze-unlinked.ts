/**
 * Analisi (SOLA LETTURA) dei file non collegati a nessun candidato: prova a risalire a un candidato.
 * Legge i file dalla copia locale (backup-db\storage), il database con Prisma; non scrive né cancella nulla.
 * Scrive solo un CSV di esito (percorso, classe, id candidato) e stampa conteggi aggregati, senza nomi.
 *
 *   npx tsx scripts/maintenance/storage-analyze-unlinked.ts <cv-non-collegati.csv> <cartella-storage-locale> <csv-esito>
 */
import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { PrismaClient } from '@prisma/client';
import { extractTextFromCV } from '../../lib/cvParser';

const [csvIn, storageDir, csvOut] = process.argv.slice(2);
if (!csvIn || !storageDir || !csvOut) throw new Error('Uso: <csv-input> <cartella-storage> <csv-output>');
const prisma = new PrismaClient();

const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
const digits = (s: string | null | undefined) => (s ?? '').replace(/\D/g, '');
const sha = (b: Buffer) => crypto.createHash('sha256').update(b).digest('hex');
const withTimeout = <T,>(p: Promise<T>, ms: number) =>
  Promise.race([p, new Promise<T>((_, rej) => setTimeout(() => rej(new Error('timeout')), ms))]);

async function main() {
  const rows = fs.readFileSync(csvIn, 'utf8').split(/\r?\n/).slice(1).filter(Boolean).map((l) => {
    const m = l.match(/^"([^"]*)","([^"]*)","([^"]*)","([^"]*)"$/)!;
    return { bucket: m[1], p: m[2], created: m[3], size: Number(m[4]) };
  });

  const cands = await prisma.candidate.findMany({
    select: { id: true, organizationId: true, firstName: true, lastName: true, email: true, phone: true, cvUrl: true, createdAt: true },
  });
  const byEmail = new Map(cands.filter((c) => c.email).map((c) => [c.email.toLowerCase(), c]));
  const byPhone = new Map(cands.filter((c) => digits(c.phone).length >= 8).map((c) => [digits(c.phone).slice(-9), c]));

  // impronta dei file collegati (dalla copia locale)
  const linkedHash = new Map<string, string>();
  for (const c of cands) {
    if (!c.cvUrl || /^https?:/.test(c.cvUrl)) continue;
    const f = path.join(storageDir, 'cvs', ...c.cvUrl.split('/'));
    if (fs.existsSync(f)) linkedHash.set(sha(fs.readFileSync(f)), c.id);
  }

  const out: string[] = ['bucket,percorso,data_upload,dimensione,classe,id_candidato,nota'];
  const count: Record<string, number> = {};
  const byMonth: Record<string, number> = {};
  const sizes = new Map<number, number>();
  let i = 0;
  for (const r of rows) {
    i++;
    const f = path.join(storageDir, r.bucket, ...r.p.split('/'));
    const ts = Number(r.p.match(/_(\d{13})\./)?.[1]);
    const upDate = ts ? new Date(ts).toISOString().slice(0, 10) : r.created.slice(0, 10);
    byMonth[upDate.slice(0, 7)] = (byMonth[upDate.slice(0, 7)] ?? 0) + 1;
    sizes.set(r.size, (sizes.get(r.size) ?? 0) + 1);
    let cls = '', cid = '', note = '';
    if (!fs.existsSync(f)) { cls = 'F_file_assente_in_locale'; }
    else {
      const buf = fs.readFileSync(f);
      const h = sha(buf);
      if (linkedHash.has(h)) { cls = 'A_copia_identica_di_un_CV_collegato'; cid = linkedHash.get(h)!; }
      else {
        let text = '';
        try {
          const ext = r.p.split('.').pop()?.toLowerCase();
          const mime = ext === 'pdf' ? 'application/pdf' : ext === 'docx' ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' : ext === 'doc' ? 'application/msword' : undefined;
          text = await withTimeout(extractTextFromCV(buf, mime), 45000);
        } catch (e) { note = (e as Error).message; }
        if (text.trim().length < 40) { cls = 'E_illeggibile_o_senza_testo'; }
        else {
          const emails = Array.from(new Set((text.match(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g) ?? []).map((e) => e.toLowerCase())));
          const phones = Array.from(new Set((text.match(/(?:\+?\d[\d\s./-]{7,}\d)/g) ?? []).map((p) => digits(p).slice(-9)).filter((p) => p.length === 9)));
          const e = emails.map((x) => byEmail.get(x)).find(Boolean);
          const ph = phones.map((x) => byPhone.get(x)).find(Boolean);
          const t = ' ' + norm(text) + ' ';
          const nm = cands.find((c) => c.firstName && c.lastName && norm(c.firstName).length > 2 && norm(c.lastName).length > 2 && t.includes(' ' + norm(c.firstName) + ' ') && t.includes(' ' + norm(c.lastName) + ' '));
          if (e) { cls = 'B_email_corrisponde_a_un_candidato'; cid = e.id; note = e.cvUrl ? 'il candidato ha un altro CV collegato' : 'il candidato non ha CV collegato'; }
          else if (ph) { cls = 'C_telefono_corrisponde_a_un_candidato'; cid = ph.id; note = ph.cvUrl ? 'il candidato ha un altro CV collegato' : 'il candidato non ha CV collegato'; }
          else if (nm) { cls = 'D_solo_nome_e_cognome_corrispondono'; cid = nm.id; note = 'corrispondenza debole'; }
          else { cls = emails.length || phones.length ? 'G_ha_contatti_ma_nessun_candidato_nel_database' : 'H_leggibile_senza_contatti_e_nessuna_corrispondenza'; }
        }
      }
    }
    count[cls] = (count[cls] ?? 0) + 1;
    out.push([r.bucket, r.p, upDate, r.size, cls, cid, note].map((x) => `"${x}"`).join(','));
    if (i % 25 === 0) process.stderr.write(`  ${i}/${rows.length}\n`);
  }
  fs.writeFileSync(csvOut, out.join('\n'));
  console.log(`\nFile analizzati: ${rows.length}`);
  for (const k of Object.keys(count).sort()) console.log(`  ${k}: ${count[k]}`);
  console.log('Per mese di upload:', JSON.stringify(Object.fromEntries(Object.entries(byMonth).sort())));
  const dup = [...sizes.entries()].filter(([, n]) => n > 1);
  console.log(`Dimensioni identiche ripetute: ${dup.length} valori, ${dup.reduce((s, [, n]) => s + n, 0)} file`);
  console.log(`Candidati nel database: ${cands.length}; con CV collegato e file locale: ${linkedHash.size}`);
}
main().catch((e) => { console.error(e.message ?? e); process.exitCode = 1; }).finally(() => prisma.$disconnect());
