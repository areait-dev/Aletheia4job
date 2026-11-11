// Solo STAGING: crea (o rimuove con --drop) gli indici trigram sulle 7 colonne della ricerca.
import { PrismaClient } from '@prisma/client';
const url = process.env.STAGING_DIRECT_SESSION_URL;
const prodRef = process.env.DATABASE_URL?.match(/postgres\.([a-z0-9]+)/)?.[1];
if (!url || !prodRef || url.includes(prodRef)) throw new Error('RIFIUTATO: serve il database di staging e DATABASE_URL (produzione) per il confronto.');
const prisma = new PrismaClient({ datasourceUrl: url });
const cols = ['firstName', 'lastName', 'email', 'city', 'role', 'sector', 'skills'];
(async () => {
  if (process.argv.includes('--drop')) {
    for (const c of cols) await prisma.$executeRawUnsafe(`DROP INDEX IF EXISTS "Candidate_${c}_trgm_idx"`);
    console.log('indici trigram rimossi');
  } else {
    await prisma.$executeRawUnsafe(`CREATE EXTENSION IF NOT EXISTS pg_trgm WITH SCHEMA extensions`);
    for (const c of cols) {
      const t = Date.now();
      await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "Candidate_${c}_trgm_idx" ON "Candidate" USING gin ("${c}" extensions.gin_trgm_ops)`);
      console.log(c, Date.now() - t, 'ms');
    }
    const r: any = await prisma.$queryRawUnsafe(`select pg_size_pretty(sum(pg_relation_size(indexrelid))) s from pg_index where indrelid='"Candidate"'::regclass and indexrelid::regclass::text like '%trgm%'`);
    console.log('dimensione indici trigram:', r[0].s);
  }
  await prisma.$executeRawUnsafe(`ANALYZE "Candidate"`);
})().finally(() => prisma.$disconnect());
