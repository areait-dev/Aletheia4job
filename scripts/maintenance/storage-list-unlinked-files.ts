/**
 * Elenco (sola lettura) dei file dei bucket Storage NON collegati a nessun Candidate.cvUrl,
 * con data di creazione e dimensione. Non cancella nulla: serve a valutarli a mano.
 *
 * Uso:
 *   npx tsx scripts/maintenance/storage-list-unlinked-files.ts <file-csv-di-output> [--bucket=cvs,candidates]
 */
import 'dotenv/config';
import { config } from 'dotenv';
import { PrismaClient } from '@prisma/client';
import { createClient } from '@supabase/supabase-js';
import fs from 'node:fs';
import path from 'node:path';
import { resolveCvRef } from '../../utils/cvStorage';
import { listBucketObjects, type Obj } from './lib-storage-list';

config({ path: '.env.local' });

const prisma = new PrismaClient();

async function main() {
  const outFile = process.argv[2];
  if (!outFile || outFile.startsWith('--')) throw new Error('Indica il file CSV di output come primo argomento.');
  const bucketArg = process.argv.find((a) => a.startsWith('--bucket='))?.split('=')[1];
  const buckets = bucketArg ? bucketArg.split(',') : ['cvs', 'candidates'];

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Imposta NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY.');
  const supabase = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });

  // Percorsi referenziati, come "bucket/percorso" (vecchi URL pubblici e nuovi percorsi).
  const rows = await prisma.candidate.findMany({ where: { cvUrl: { not: null } }, select: { cvUrl: true } });
  const referenced = new Set<string>();
  for (const r of rows) {
    const ref = resolveCvRef(r.cvUrl);
    if (ref?.kind === 'storage') referenced.add(`${ref.bucket}/${ref.path}`);
  }

  const unlinked: Obj[] = [];
  let total = 0;
  for (const bucket of buckets) {
    const objs = await listBucketObjects(supabase, bucket);
    total += objs.length;
    for (const o of objs) {
      if (o.path.endsWith('/.keep') || o.path === '.keep') continue; // segnaposto cartelle
      if (!referenced.has(`${o.bucket}/${o.path}`)) unlinked.push(o);
    }
  }

  unlinked.sort((a, b) => (a.createdAt ?? '').localeCompare(b.createdAt ?? ''));
  const esc = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const csv = ['bucket,percorso,creato_il,dimensione_byte']
    .concat(unlinked.map((o) => [o.bucket, o.path, o.createdAt, o.size].map(esc).join(',')))
    .join('\n');
  fs.mkdirSync(path.dirname(outFile), { recursive: true });
  fs.writeFileSync(outFile, csv, 'utf8');

  const bytes = unlinked.reduce((s, o) => s + (o.size ?? 0), 0);
  console.log(`File nei bucket: ${total} | collegati a un candidato: ${referenced.size} | NON collegati: ${unlinked.length} (${(bytes / 1048576).toFixed(1)} MB)`);
  for (const b of buckets) console.log(`  ${b}: ${unlinked.filter((o) => o.bucket === b).length} non collegati`);
  console.log(`Elenco scritto in: ${outFile}`);
}

main().catch((e) => { console.error(e.message); process.exit(1); }).finally(() => prisma.$disconnect());
