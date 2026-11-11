/**
 * Converte Candidate.cvUrl da URL pubblico a percorso nel bucket `cvs`.
 *
 * DRY-RUN di default: mostra cosa cambierebbe e verifica che ogni percorso corrisponda a un
 * file esistente nel bucket. Non scrive nulla finché non si passa --apply.
 * Con --apply aggiorna solo i record la cui conversione punta a un file esistente.
 *
 * Uso:
 *   npx tsx scripts/maintenance/migrate-cv-urls-to-paths.ts            -> dry-run
 *   npx tsx scripts/maintenance/migrate-cv-urls-to-paths.ts --apply    -> applica
 */
import 'dotenv/config';
import { config } from 'dotenv';
import { PrismaClient } from '@prisma/client';
import { createClient } from '@supabase/supabase-js';
import { resolveCvRef, CV_BUCKET } from '../../utils/cvStorage';
import { listBucketObjects } from './lib-storage-list';

config({ path: '.env.local' });

const prisma = new PrismaClient();

async function main() {
  const apply = process.argv.includes('--apply');
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Imposta NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY.');
  const supabase = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });

  const buckets = [CV_BUCKET, 'candidates'];
  const existing = new Set<string>();
  for (const b of buckets) for (const o of await listBucketObjects(supabase, b)) existing.add(`${b}/${o.path}`);

  const candidates = await prisma.candidate.findMany({
    where: { cvUrl: { not: null } },
    select: { id: true, organizationId: true, cvUrl: true },
  });

  type Change = { id: string; from: string; to: string };
  const toChange: Change[] = [];
  const alreadyPath: string[] = [];
  const missing: { id: string; cvUrl: string; reason: string }[] = [];
  const external: { id: string; cvUrl: string }[] = [];
  const wrongBucket: { id: string; cvUrl: string }[] = [];

  for (const c of candidates) {
    const raw = c.cvUrl!;
    const ref = resolveCvRef(raw);
    if (!ref) { missing.push({ id: c.id, cvUrl: raw, reason: 'valore non interpretabile' }); continue; }
    if (ref.kind === 'external') { external.push({ id: c.id, cvUrl: raw }); continue; }
    if (ref.bucket !== CV_BUCKET) { wrongBucket.push({ id: c.id, cvUrl: raw }); continue; }
    if (!existing.has(`${ref.bucket}/${ref.path}`)) { missing.push({ id: c.id, cvUrl: raw, reason: 'file non presente nel bucket' }); continue; }
    if (raw === ref.path) alreadyPath.push(c.id);
    else toChange.push({ id: c.id, from: raw, to: ref.path });
  }

  console.log(`\n=== Migrazione cvUrl -> percorso (${apply ? 'APPLICA' : 'DRY-RUN, nessuna scrittura'}) ===`);
  console.log(`Candidati con cvUrl: ${candidates.length}`);
  console.log(`  da convertire (URL pubblico -> percorso, file esistente): ${toChange.length}`);
  console.log(`  già percorso (nessuna modifica):                          ${alreadyPath.length}`);
  console.log(`  URL esterni (non toccati):                                ${external.length}`);
  console.log(`  in un altro bucket (da valutare):                         ${wrongBucket.length}`);
  console.log(`  NON CORRISPONDONO a un file esistente:                    ${missing.length}`);

  console.log('\nEsempi di conversione:');
  for (const c of toChange.slice(0, 8)) console.log(`  ${c.id.slice(0, 8)}…  ${c.from}\n             -> ${c.to}`);
  if (toChange.length > 8) console.log(`  … e altri ${toChange.length - 8}`);

  if (missing.length) {
    console.log('\nNON corrispondenti (non verrebbero modificati):');
    for (const m of missing) console.log(`  ${m.id}  ${m.reason}  ${m.cvUrl}`);
  }
  if (wrongBucket.length) {
    console.log('\nIn un bucket diverso da cvs:');
    for (const m of wrongBucket) console.log(`  ${m.id}  ${m.cvUrl}`);
  }

  if (!apply) {
    console.log('\nDry-run completato: nessun dato modificato. Per applicare: --apply');
    return;
  }

  let done = 0;
  for (const c of toChange) {
    await prisma.candidate.update({ where: { id: c.id }, data: { cvUrl: c.to } });
    done++;
  }
  console.log(`\nAggiornati ${done} candidati.`);
}

main().catch((e) => { console.error(e.message); process.exit(1); }).finally(() => prisma.$disconnect());
