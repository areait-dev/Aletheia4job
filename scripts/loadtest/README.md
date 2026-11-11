# Prova di carico (solo staging)

Tutti gli script rifiutano di partire se l'host/progetto coincide con quello di `DATABASE_URL` (produzione, letta da `.env`)
o se non riescono a verificarlo. Le chiavi di staging stanno in `.env.staging` (fuori da git, ignorato da `.env*`):

```
STAGING_DATABASE_URL="postgresql://postgres.<ref>:<password>@<host-pooler>:6543/postgres?pgbouncer=true"
STAGING_DIRECT_URL="..."   # non usato dagli script: dal PC la connessione diretta (db.<ref>.supabase.co) è solo IPv6
```

`run-staging.cjs` carica il file senza stamparlo e ricava la session-mode (porta 5432) dalla stringa 6543.
Usare `{HOST}` come segnaposto dell'host di staging.

## Procedura su un progetto di staging nuovo
```
# 1. migrazioni (session pooler 5432; DATABASE_URL e DIRECT_URL = staging)
node scripts/loadtest/run-staging.cjs npx prisma migrate deploy
# 2. 20.000 candidati finti (transaction pooler 6543)
node scripts/loadtest/run-staging.cjs npx tsx scripts/loadtest/seed-candidates.ts --confirm-host={HOST}
# 3. misure
node scripts/loadtest/run-staging.cjs npx tsx scripts/loadtest/explain.ts --label=PRIMA
# 4. (facoltativo) indici trigram e rimisura
node scripts/loadtest/run-staging.cjs npx tsx scripts/loadtest/trgm.ts
node scripts/loadtest/run-staging.cjs npx tsx scripts/loadtest/explain.ts --label=DOPO
# pulizia dati finti
node scripts/loadtest/run-staging.cjs npx tsx scripts/loadtest/seed-candidates.ts --confirm-host={HOST} --purge
```
Nota: per gli script TypeScript `run-staging.cjs` mette in `DATABASE_URL` la produzione, solo perché la guardia la confronti con
lo staging. Per i comandi `prisma ...` invece imposta `DATABASE_URL`/`DIRECT_URL` su staging (e rifiuta se coincidono con la produzione).
