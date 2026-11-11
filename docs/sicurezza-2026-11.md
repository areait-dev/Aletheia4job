# Sicurezza e dati — interventi del 11 novembre 2026

Riepilogo di ciò che è stato fatto in preparazione al lancio pubblico della piattaforma.
Database: Supabase (PostgreSQL 17, piano Pro). Accesso ai dati dell'app solo via Prisma (ruolo `postgres`);
`supabase-js` è usato soltanto per Auth e Storage.

## 1. Backup prima degli interventi

- **Database:** backup fisici giornalieri del piano Pro (ultimo del 11/11/2026 alle 05:29 UTC), ripristinabili dal pannello Supabase.
  `pg_dump` non era disponibile sul PC di lavoro; non è stato eseguito un dump logico.
- **File dei bucket:** scaricati in locale con `scripts/maintenance/storage-download-buckets.ts`
  (523 file `cvs` + 2 `candidates`, 171 MB, dimensione verificata file per file).
  Cartella: `Desktop\Progetti next\backup-db\storage` (fuori dal repository; contiene dati personali).

## 2. Database: RLS e permessi

Migrazione `20261111100000_security_rls_revoke_anon`:

- RLS attiva su tutte le tabelle del schema `public` (senza policy: `anon` e `authenticated` non vedono nulla).
- `REVOKE ALL` su tabelle, sequenze e funzioni del schema `public` per `anon` e `authenticated`.
- `ALTER DEFAULT PRIVILEGES` per il ruolo `postgres`: le tabelle create dalle migrazioni future non nascono leggibili da `anon`/`authenticated`.

Motivo: prima dell'intervento `anon` aveva permessi completi (anche `TRUNCATE`) e la chiave `NEXT_PUBLIC_SUPABASE_ANON_KEY` è pubblica per definizione.

Verifica (curl con chiave anon): lettura di `Candidate`, `Job`, `Employee`, `Organization`, `Document`, `Membership` e INSERT su `Candidate` → 401 `permission denied`.
Prisma continua a leggere (309/310 candidati, 43 offerte).

Nota: i default privileges del ruolo `supabase_admin` **non** sono stati modificati (il ruolo `postgres` non ha i privilegi per farlo; la migrazione ha continuato con un avviso).
Impatto basso: `supabase_admin` crea solo oggetti interni di Supabase, non le tabelle dell'app.
Per le nuove tabelle create via Prisma ricordarsi di abilitare la RLS nella migrazione (`ALTER TABLE ... ENABLE ROW LEVEL SECURITY`).

### Rollback

`prisma/rollbacks/20261111100000_security_rls_revoke_anon.rollback.sql` (non eseguito): disattiva la RLS e ridà i permessi ad `anon`/`authenticated`.
Da eseguire dal SQL Editor di Supabase; poi `npx prisma migrate resolve --rolled-back 20261111100000_security_rls_revoke_anon`.
**Riapre l'accesso pubblico via REST ai dati**: usarlo solo se strettamente necessario.

## 3. Indici

Migrazione `20261111100100_add_query_indexes` (e `schema.prisma` allineato):

- `Candidate (organizationId, createdAt DESC)`, `(organizationId, status)`, `(organizationId, sector)` — archivio.
- `Job (organizationId, status, isActive)` — career page e feed.

Rollback: `DROP INDEX "Candidate_organizationId_createdAt_idx", "Candidate_organizationId_status_idx", "Candidate_organizationId_sector_idx", "Job_organizationId_status_isActive_idx";`

## 4. CV: bucket privati e link firmati

- **`Candidate.cvUrl` salva il percorso** nel bucket `cvs` (es. `<organizationId>/abc.pdf`), non più l'URL pubblico.
  `utils/cvStorage.ts` interpreta sia i percorsi sia i vecchi URL pubblici sia gli URL esterni.
- **Upload** (`/api/upload-cv`): i CV vanno sempre in `cvs`, sotto `<organizationId>/…`. L'organizzazione è decisa dal server
  (annuncio → sessione → env dei form pubblici), mai dal client. Il bucket `candidates` non è più usato.
- **"Apri CV"**: `/api/candidates/<id>/cv` genera al clic un link firmato di 5 minuti e fa il redirect. Il link non è salvato nel DB.
  Senza sessione o per un candidato di un'altra organizzazione → 403 (senza cookie il middleware rimanda a `/login`).
- **Appartenenza all'organizzazione:** tutte le azioni che salvano `cvUrl` (candidatura a un annuncio, spontanea, Long List, creazione/modifica dal
  gestionale, webhook) rifiutano percorsi con il prefisso di un'altra organizzazione. I CV storici senza prefisso sono accettati solo se
  coincidono con quello già salvato per quel candidato. Gli URL esterni sono ammessi solo dal webhook autenticato.
- **Processi interni** (analisi AI, Inngest `cv-processing`): scaricano con la chiave di servizio dal percorso.
- **Email Long List Docenti:** non contiene più il link al file, ma alla scheda del candidato nell'app (richiede login).
  Il destinatario (`TEACHER_LONGLIST_NOTIFY_EMAIL`) è un indirizzo aziendale interno con accesso all'app: nessun link firmato lungo. L'invio con Resend sarà configurato in seguito.
- **Migrazione dati** (`scripts/maintenance/migrate-cv-urls-to-paths.ts`, dry-run di default): 310/310 `cvUrl` convertiti, tutti con file esistente, 0 anomalie.
- **Bucket `cvs` e `candidates` resi privati** (stessi limiti di prima).

Verifiche finali: vecchio URL pubblico → 400 "Bucket not found"; link firmato → 200 PDF con scadenza di 300 s (un link da 3 s risponde 400 dopo 5 s);
`anon` elenca `[]` e non scarica (`Object not found`).
Prova end-to-end con PDF finto (upload gestionale + candidatura spontanea): percorso con prefisso organizzazione, `cvUrl` = percorso, "Apri CV" → 302 al link firmato → PDF;
utente di un'altra organizzazione → 403; percorso di un'altra organizzazione dal form pubblico → rifiutato. Dati di prova eliminati.

### Rollback / emergenza

- **Rendere di nuovo pubblici i bucket** (SQL Editor): `update storage.buckets set public = true where id in ('cvs', 'candidates');`
  oppure Storage → bucket → Edit bucket → Public. L'app continua a funzionare (i link firmati valgono anche a bucket pubblico), ma i file tornano raggiungibili da chi conosce l'URL.
- **Riportare `cvUrl` a URL pubblici** (di norma non serve, il codice legge entrambi i formati):
  `update "Candidate" set "cvUrl" = '<NEXT_PUBLIC_SUPABASE_URL>/storage/v1/object/public/cvs/' || "cvUrl" where "cvUrl" is not null and "cvUrl" not like 'http%';` — funziona solo con il bucket pubblico.

## 5. Altri interventi della giornata (non di sicurezza dei dati)

- URL delle pagine in italiano (`/archivio`, `/posizioni`, `/selezione`, …) con redirect permanenti dai vecchi indirizzi inglesi, `/cruscotto` → `/dashboard`, `/offerte-di-lavoro` → home.
- Reset password: "Password dimenticata?" nel login, pagine `/reimposta-password` e `/reimposta-password/nuova`;
  `/auth/callback` raggiungibile senza sessione. In Supabase: Site URL `https://aletheia4job.it/`, Redirect URL `https://aletheia4job.it/auth/callback**`.
- Archivio ridisegnato (tab, cartelle a griglia, righe compatte).

## 6. Multiposting disattivato

Nessun annuncio è collegato a LinkedIn, Indeed, Jooble o al provider di candidature: il multiposting è stato spento senza cancellare nulla.

- Flag `MULTIPOSTING_ENABLED` (solo lato server, **default spento**; si accende solo con il valore `true`).
- Flag spento: `/api/webhooks/multiposting`, `/api/feeds`, `/api/jobs/feed` e `/api/linkedin-feed` rispondono **404** (anche dal middleware, prima del login);
  le eccezioni pubbliche del middleware per questi endpoint valgono solo a flag acceso.
- Interfaccia nascosta: checkbox LinkedIn/Indeed/Jooble in `PositionForm`, badge nell'elenco posizioni, banner in dashboard,
  feed e piattaforme nella sezione Integrazioni di amministrazione (resta Cronofy).
- Schema e dati del database invariati (`Job.postTo*`, campi `broadbean*`); le candidature già arrivate restano visibili.
- **Riattivare:** impostare `MULTIPOSTING_ENABLED=true` su Vercel e rifare il deploy; servono poi `AGGREGATOR_FEED_TOKEN`, `MULTIPOSTING_WEBHOOK_SECRET` e (LinkedIn) le variabili `LINKEDIN_*`.
- Da fare lato proprietario: disdire eventuali abbonamenti/approvazioni presso le piattaforme (LinkedIn ATS, account recruiter Indeed/Jooble, provider che invia al webhook). Su Vercel non esistono variabili `MULTIPOSTING_*`, `AGGREGATOR_FEED_TOKEN` o `LINKEDIN_*` (verificato dal proprietario): nulla da rimuovere.

## 7. RLS automatica sulle nuove tabelle (applicata)

Migrazione `20261111120000_auto_enable_rls_on_new_tables`: un event trigger abilita la RLS a ogni `CREATE TABLE` / `CREATE TABLE AS` / `SELECT INTO` nello schema `public`,
così una tabella creata da una migrazione Prisma futura non resta esposta via API REST. Prisma (ruolo `postgres`) ignora la RLS: nessun effetto sull'app.
La funzione `public.rls_auto_enable()` non è richiamabile da `anon`/`authenticated`. Rollback: `prisma/rollbacks/20261111120000_auto_enable_rls_on_new_tables.rollback.sql`.
Provata in una transazione poi annullata (tabelle in `public` con RLS attiva, altri schemi non toccati, nulla rimasto nel database). Applicata con `prisma migrate deploy`; verificato che l'event trigger `rls_auto_enable` esista (`ddl_command_end`, tag `CREATE TABLE`/`CREATE TABLE AS`/`SELECT INTO`) e sia abilitato.
Resta comunque buona prassi non fare affidamento solo sul trigger: nessuna policy è definita, quindi le nuove tabelle sono inaccessibili da `anon`/`authenticated` finché non si scrivono policy esplicite.

## 8. Ancora aperto

- **File non collegati nei bucket:** 212 (210 in `cvs`, 2 in `candidates`; 43,8 MB), verificati dopo l'ultimo upload di prova.
  Elenco con data e dimensione: `backup-db\cv-non-collegati.csv` (rigenerabile con `scripts/maintenance/storage-list-unlinked-files.ts`). Nulla è stato cancellato.
- **PITR (Point-in-Time Recovery):** non attivo/non verificato; i backup giornalieri non permettono di tornare a un istante preciso. Valutare l'add-on.
- **`app/offerte-di-lavoro/[slug]/page.tsx`:** modificato in locale, volutamente escluso da tutti i commit; da rivedere e committare (o scartare) a parte.
- **Email Long List:** da confermare se il destinatario (`TEACHER_LONGLIST_NOTIFY_EMAIL`, solo su Vercel) ha un account. Se è esterno, serve un link firmato da 7 giorni generato all'invio.
- **CV storici senza prefisso organizzazione** (310): restano ai percorsi originali; eventualmente spostarli sotto `<organizationId>/`.
- **Default privileges di `supabase_admin`:** non modificabili da `postgres` (vedi sezione 2).
- **README:** descrive ancora gli URL e il flusso di autenticazione precedenti.
- **Evento funnel di prova:** durante la prova end-to-end è stato eliminato 1 evento `spontaneous_submitted` selezionato per finestra temporale (non è collegato a un candidato). Il conteggio coincide con l'unico evento atteso e non ne restano altri di quel tipo, ma non è dimostrabile al 100% che fosse quello di prova.
- **Candidati di prova:** un candidato creato per una prova manuale (1 riga `Candidate`, il suo CV nel bucket `cvs` e 1 riga di `AuditLog` di creazione) è stato eliminato su richiesta; non avevano candidature, note, colloqui né altri dati collegati.
  I candidati sono ora 309, tutti con `cvUrl` valido.
- **Capacità:** verificare piano e limiti di Supabase, Vercel e Inngest prima dell'invio di massa agli utenti.
- **Migrazioni nella build:** `scripts/vercel-build.mjs` applica `prisma migrate deploy` (via `DIRECT_URL`) solo con `VERCEL_ENV=production`. Verificato sul deploy `41d536d`: "18 migrations found", "No pending migrations to apply", build ok.
- **Preview e produzione condividono ancora i dati:** in Preview sono impostate `DATABASE_URL`, `DIRECT_URL`, `GROQ_API_KEY`, `NEXT_PUBLIC_SUPABASE_*`, `CRONOFY_*`, `INNGEST_SIGNING_KEY`, `PUBLIC_SPONTANEOUS_*`, `NEXT_PUBLIC_SITE_URL` (valori di produzione). Mitigazioni attuali: Vercel Authentication (Standard Protection) attiva sulle Preview; `SUPABASE_SERVICE_ROLE_KEY` solo in Production. Da separare con il progetto `aletheia-staging` (eu-west-2).
