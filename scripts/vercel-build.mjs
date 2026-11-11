/**
 * Build di Vercel: genera il client Prisma, applica le migrazioni (solo in produzione)
 * e poi compila Next.js.
 *
 * - Le migrazioni girano solo con VERCEL_ENV=production: i deploy di preview e le build
 *   locali/CI non toccano mai il database.
 * - Usano DIRECT_URL (connessione diretta/session pooler, porta 5432): il pooler in
 *   modalità transaction (6543, pgbouncer) non è adatto a `prisma migrate`.
 * - Se la migrazione fallisce lo script esce con errore PRIMA di `next build`: la build
 *   fallisce e Vercel lascia attivo il deploy precedente.
 *
 * Attenzione: la migrazione viene applicata prima che il nuovo codice sia online (e resta
 * applicata anche se `next build` fallisce dopo). Le migrazioni devono quindi essere
 * retro-compatibili con il codice in produzione (aggiungere prima, rimuovere in un
 * deploy successivo).
 */
import { spawnSync } from 'node:child_process';

function run(label, args, env = process.env) {
  console.log(`\n[build] ${label}`);
  const result = spawnSync('npx', args, {
    stdio: 'inherit',
    env,
    shell: process.platform === 'win32',
  });
  if (result.status !== 0) {
    console.error(`\n[build] ERRORE: "${label}" non riuscito (codice ${result.status ?? 'sconosciuto'}). Build interrotta.`);
    process.exit(result.status || 1);
  }
}

run('prisma generate', ['prisma', 'generate']);

if (process.env.VERCEL_ENV === 'production') {
  const directUrl = process.env.DIRECT_URL;
  if (!directUrl) {
    console.error('\n[build] ERRORE: DIRECT_URL non impostata, impossibile applicare le migrazioni in produzione. Build interrotta.');
    process.exit(1);
  }
  run('prisma migrate deploy (produzione, DIRECT_URL)', ['prisma', 'migrate', 'deploy'], {
    ...process.env,
    DATABASE_URL: directUrl,
  });
} else {
  console.log(`\n[build] VERCEL_ENV=${process.env.VERCEL_ENV ?? '(non impostata)'}: migrazioni non applicate.`);
}

run('next build', ['next', 'build']);
