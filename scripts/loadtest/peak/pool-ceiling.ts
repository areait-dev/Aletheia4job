/**
 * Misure sul pooler di STAGING (mai produzione) per scegliere il connection_limit:
 *  A) tetto delle connessioni client del pooler: quante connessioni contemporanee accetta prima di rifiutarne;
 *  B) rischio di blocco con connection_limit=1: una transazione interattiva che, mentre tiene l'unica connessione,
 *     lancia una query con lo stesso client (succede se un hook di scoping/autenticazione interroga il database
 *     mentre una transazione è aperta) resta in attesa e fallisce per timeout del pool.
 *
 *   node scripts/loadtest/run-staging.cjs npx tsx scripts/loadtest/peak/pool-ceiling.ts
 */
import { PrismaClient } from '@prisma/client';

const base = process.env.STAGING_DATABASE_URL;
const prodRef = process.env.DATABASE_URL?.match(/postgres\.([a-z0-9]+)/)?.[1];
if (!base || !prodRef || base.includes(prodRef)) throw new Error('RIFIUTATO: serve il database di staging e DATABASE_URL (produzione) per il confronto.');
const withParams = (extra: string) => base + (base.includes('?') ? '&' : '?') + extra;

async function ceiling() {
  console.log('A) Tetto delle connessioni client del pooler (6543, transaction mode)');
  const clients: PrismaClient[] = [];
  let total = 0;
  for (const step of [20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20]) {
    const c = new PrismaClient({ datasourceUrl: withParams(`connection_limit=${step}&pool_timeout=20`) });
    clients.push(c);
    const results = await Promise.allSettled(Array.from({ length: step }, () => c.$queryRawUnsafe('select pg_sleep(0.05)::text as s, 1 as n')));
    const ok = results.filter((r) => r.status === 'fulfilled').length;
    const fail = results.filter((r): r is PromiseRejectedResult => r.status === 'rejected');
    total += ok;
    console.log(`   +${step} connessioni: riuscite ${ok}, rifiutate ${fail.length} | connessioni client aperte finora: ${total}${fail.length ? ' | errore: ' + String(fail[0].reason?.message ?? fail[0].reason).split('\n').pop()?.slice(0, 110) : ''}`);
    if (fail.length) break;
    await new Promise((r) => setTimeout(r, 500));
  }
  await Promise.all(clients.map((c) => c.$disconnect()));
}

async function deadlock() {
  console.log('\nB) connection_limit=1: transazione interattiva + query nidificata con lo stesso client');
  for (const limit of [1, 2, 3]) {
    const p = new PrismaClient({ datasourceUrl: withParams(`connection_limit=${limit}&pool_timeout=5`) });
    const t = Date.now();
    try {
      await p.$transaction(async (tx) => {
        await tx.$queryRawUnsafe('select 1');
        await p.$queryRawUnsafe('select 2'); // query "esterna" mentre la transazione tiene una connessione
      }, { timeout: 15000, maxWait: 5000 });
      console.log(`   connection_limit=${limit}: OK in ${Date.now() - t} ms`);
    } catch (e) {
      console.log(`   connection_limit=${limit}: ERRORE dopo ${Date.now() - t} ms — ${String((e as Error).message).split('\n').filter(Boolean).pop()?.slice(0, 140)}`);
    } finally { await p.$disconnect(); }
  }
}

(async () => { await ceiling(); await deadlock(); })().catch((e) => { console.error(e.message); process.exit(1); });
