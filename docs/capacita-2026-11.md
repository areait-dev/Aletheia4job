# Capacità, carico e backup — 11 novembre 2026

Preparazione dell'ATS a ricevere molti CV. Complementare a `docs/sicurezza-2026-11.md`.
Cosa è **misurato** è detto tale; cosa è **stimato dal codice** o **non verificato** è segnalato.
Non conosco i prezzi attuali né i limiti dei piani di Vercel, Inngest e Groq: vanno controllati nei rispettivi pannelli.
Supabase è sul piano Pro (backup fisici giornalieri); la dimensione di calcolo della produzione non è riportata qui.

## 1. Migrazioni nella build (fatto)

- `scripts/vercel-build.mjs`: `prisma generate`, poi `prisma migrate deploy` **solo con `VERCEL_ENV=production`** (via `DIRECT_URL`), poi `next build`.
  Se la migrazione fallisce la build si ferma e resta attivo il deploy precedente. Le Preview non toccano mai il database.
- Le migrazioni devono essere retro-compatibili con il codice in produzione (aggiungere prima, rimuovere in un deploy successivo).
- Verificato sul log di build (`41d536d`, `f7b8119`): "19 migrations found", "No pending migrations to apply".
- **Cronologia incompleta (trovata e sistemata):** 13 colonne dello schema (`Job.postToCareerPage`, campi `broadbean*`, campi di parsing/matching di `Application`)
  esistevano in produzione ma nessuna migrazione le creava: un database nuovo restava incompleto. Aggiunta `20261111130000_backfill_schema_drift`
  (idempotente), marcata come già applicata in produzione dopo un `migrate diff` vuoto. `migrate diff` produzione → schema: zero differenze.

## 2. Cosa succede a un CV

Nel database ci sono **0 candidature (`Application`)**: la pipeline AI su dati reali non ha mai girato. Le cifre sotto vengono dal codice, non da misure.

| Percorso | Passi |
|---|---|
| Candidatura a un annuncio | upload (`/api/upload-cv`) → azione `applyToJobAction` → evento Inngest `cv/process.requested` → `processCV`, 6 step: segna "in elaborazione", estrai testo (con OCR se serve), parsing AI, aggiorna candidato, punteggio AI, segna "completato" |
| Candidatura spontanea, Long List | solo upload e salvataggio: **nessuna analisi, nessun Inngest, nessuna AI** |
| `/nuovo-candidato` | una chiamata AI (`/api/extract-cv`) alla compilazione |

Per un CV (percorso candidatura a un annuncio):

| | Valore |
|---|---|
| Chiamate AI | 2 (parsing + punteggio), modello `openai/gpt-oss-120b` su Groq |
| Token (stima dai prompt) | circa 4.300 in ingresso, 1.400 in uscita (CV troncato a 8.000 caratteri) |
| Step Inngest | 6 |
| Invocazioni Vercel | circa 9 |
| `maxDuration` | non impostato: vale il default del piano |
| Storage (misurato, 390 CV veri) | media 408 KB, mediana 235 KB, 95° percentile 1 MB, massimo 10,6 MB |
| Database (misurato) | circa 6 KB per candidato, circa 7 KB con la candidatura; `resumeText` medio 7.000 caratteri (massimo 265.000) |

### Scala (stima; costo AI con prezzo di riferimento NON verificato: 0,15 $/M token in ingresso, 0,75 $/M in uscita)

| CV | Token AI (in / out) | Costo AI | Step Inngest | Invocazioni Vercel | Storage | Database |
|---|---|---|---|---|---|---|
| 1.000 | 4,3 M / 1,4 M | circa 1,7 $ | 6.000 | circa 9.000 | 0,4 GB | circa 7 MB |
| 10.000 | 43 M / 14 M | circa 17 $ | 60.000 | circa 90.000 | 4 GB | circa 70 MB |
| 50.000 | 215 M / 70 M | circa 85 $ | 300.000 | circa 450.000 | 20 GB | circa 350 MB |

Limiti dei piani: **non conosciuti**. Da verificare: esecuzioni/step mensili inclusi su Inngest (300.000 al mese è molto per un piano gratuito),
limiti di richieste e token al minuto di Groq (probabilmente il primo ostacolo in un'importazione massiva), durata massima delle funzioni su Vercel.

### Punti fragili (non ancora corretti)
1. Nessun `concurrency`/`throttle` sulle funzioni Inngest: molti CV insieme significano molte esecuzioni parallele contro Groq e contro il pool del database.
2. Errori AI ingoiati: dopo i tentativi il codice logga e marca la candidatura `COMPLETED` senza analisi né punteggio.
3. Upload limitato a 5 MB nell'app, ma Vercel accetta circa 4,5 MB di body: un PDF fra i due valori fallisce con 413 prima del codice.
4. OCR (`tesseract.js`) in serverless: lento e a rischio timeout su PDF scansionati.
5. `DATABASE_URL` senza `connection_limit`: molte istanze in parallelo possono esaurire il pool.
6. Nessuna analisi AI per i form pubblici (spontanea, Long List).
7. Testo CV molto lungo (fino a 265.000 caratteri) pesa su database e ricerche.

## 3. Prova di carico (staging, mai produzione)

Ambiente: progetto Supabase separato `aletheia-staging` (provato in eu-west-1; si ricrea in eu-west-2). Script in `scripts/loadtest/` (guardie contro l'host di produzione).
Dati: 20.000 candidati finti (`@example.invalid`) su 8 organizzazioni (la maggiore con 10.000), nessun file reale nello Storage.
Misure con `EXPLAIN (ANALYZE, BUFFERS)`, mediana di 3 esecuzioni, SQL equivalente a quello generato da Prisma.

| Query dell'app | Tempo | Piano |
|---|---|---|
| Archivio pagina 1, filtri stato/settore | 0,2–0,5 ms | indice `(org, createdAt)` |
| Archivio pagina 500 (offset 5000) | 6 ms | stesso indice |
| Conteggi totale/stato, cartelle per settore, dashboard | 1–2 ms | index only scan |
| Matching: 500 candidati (lato database) | 16 ms | bitmap + sort |
| Matching offerte, career page, feed | 0,2–0,6 ms | indici |
| Ricerca testuale 7 colonne, pagina con molti risultati | 1 ms | si ferma al `LIMIT` |
| **Ricerca testuale 7 colonne, conteggio** | **67–82 ms** | legge tutte le righe dell'org |

Nessuna query supera i 200 ms a questa dimensione. Il conteggio della ricerca cresce in modo lineare: a 50.000 candidati in una sola org sarebbe intorno ai 400 ms (estrapolazione, non misura).

**Indici `pg_trgm` (provati solo su staging):** un indice GIN `gin_trgm_ops` su ciascuna delle 7 colonne di ricerca, senza cambiare il codice (`contains` + `insensitive` produce `ILIKE`).
Conteggio "nessun risultato" 82 ms → 0,9 ms; conteggio "mar" 67 ms → 17,6 ms; ricerca con termine raro: da scansione completa a 0,9 ms. Peso: 7,7 MB a 20.000 candidati; scritture un po' più lente.
**Decisione: preparata ma NON applicata** in `prisma/pending/20261111140000_add_search_trgm_indexes/` (migrazione + rollback), fuori da `prisma/migrations` così nessun `migrate deploy` la applica.
Da rimettere in `prisma/migrations` solo quando deciso, indicativamente prima di superare circa 50.000 candidati in una organizzazione. A 309 candidati oggi non servono.
Uso `extensions.gin_trgm_ops` (estensione nello schema `extensions`). Fattibile dichiararli in `schema.prisma` così `migrate diff` non li mostra come differenza:
`@@index([firstName(ops: raw("gin_trgm_ops"))], type: Gin, map: "Candidate_firstName_trgm_idx")` (idem per le altre 6 colonne) — provato su una copia dello schema
contro lo staging con gli indici: diff vuoto, senza preview feature. Va dichiarato **insieme** alla migrazione, non prima (altrimenti il diff verso produzione li segnerebbe mancanti).

**Matching e `resumeText` (decisione: opzione A, nessuna modifica per ora).** `getMatchingCandidatesForJobAction` carica fino a 500 candidati con tutte le colonne, compreso `resumeText`
(2,7 MB di testo a 20.000 candidati; 0,65–0,7 s a caldo dal PC, 4 s a freddo), e `scoreCandidateForJob` usa quel testo per il punteggio delle parole chiave (fino a 60/100 punti):
toglierlo cambierebbe punteggi e ordine. **Opzione C, da fare sopra i 5.000 candidati per organizzazione:** pre-calcolare le parole chiave del candidato in una colonna al salvataggio del CV
e non leggere più il testo completo nel matching. Alternativa B: leggere solo i primi N caratteri (cambia leggermente i punteggi dei CV lunghi).

## 4. Preview e produzione

Stato al 11/11/2026: le Preview hanno variabili di produzione (`DATABASE_URL`, `DIRECT_URL`, `GROQ_API_KEY`, `NEXT_PUBLIC_SUPABASE_*`, `CRONOFY_*`, `INNGEST_SIGNING_KEY`,
`PUBLIC_SPONTANEOUS_*`, `NEXT_PUBLIC_SITE_URL`) e girano quindi sui dati veri. Mitigazioni: Vercel Authentication (Standard Protection) attiva; `SUPABASE_SERVICE_ROLE_KEY` solo in Production.
Decisione: usare `aletheia-staging` (eu-west-2, stessa regione della produzione) come database delle Preview, con integrazioni spente (email, Cronofy, firma documenti, AI).
Variabili da sostituire in ambito Preview: `DATABASE_URL`, `DIRECT_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `PUBLIC_SPONTANEOUS_*`, `TEACHER_LONGLIST_*`
(ID dell'organizzazione e dell'utente di staging), `APP_ENCRYPTION_KEY`, `SIGNED_STATE_SECRET`; da non impostare in Preview: `GROQ_API_KEY`, `RESEND_*`, `CRONOFY_*`, `DROPBOX_SIGN_*`, `NEXT_PUBLIC_SITE_URL`;
chiavi Inngest in un ambiente separato. Auth: Site URL e Redirect URLs di staging sul pattern delle Preview. Storage: bucket `cvs` privato anche in staging.
Stato: **da completare** quando lo staging in eu-west-2 è pronto.

## 5. Backup

### Cosa fanno oggi i backup (piano Pro)
- **Backup fisici giornalieri** del database: si ripristina lo stato di una delle notti passate (per quanti giorni si conservano: da verificare nel pannello). Tutto ciò che è cambiato dopo l'ultimo backup si perde.
- **PITR (Point-in-Time Recovery)**: componente aggiuntivo a pagamento (prezzo da verificare nel pannello). Archivia continuamente il registro delle transazioni (WAL)
  e permette di tornare a un istante preciso entro la finestra di conservazione scelta, con perdita di pochi minuti invece che di fino a un giorno.
  Serve quando un errore (una `DELETE` sbagliata, una migrazione, un bug) avviene a metà giornata e il backup della notte prima farebbe perdere ore di candidature.
  Da verificare nel pannello: requisiti di dimensione di calcolo e se, attivando PITR, i backup giornalieri vengono sostituiti.
- **PITR non copre lo Storage.** I backup di Supabase salvano i metadati degli oggetti ma non i file: un CV cancellato dal bucket non si recupera dal backup del database.
  I file vanno quindi salvati a parte.

### File dello Storage: proposta (da approvare, nulla è stato creato)
Oggi esiste uno script manuale (`scripts/maintenance/storage-download-buckets.ts`) con cui ho scaricato 171 MB in locale; è un backup una tantum, non automatico.
Proposta semplice: un job giornaliero (GitHub Actions con `cron`) che copia il bucket `cvs` in un bucket esterno con `rclone`, usando l'API S3 compatibile di Supabase Storage:
- modalità **copia** con cartella di versioni (`--backup-dir`) e **non sincronizzazione**: un file cancellato o sovrascritto per errore in origine resta nella copia;
- destinazione in un altro fornitore, in UE (esempio: Cloudflare R2 o Backblaze B2; prezzi da verificare, i volumi sono piccoli: 0,2 GB oggi, 20 GB a 50.000 CV), con cifratura lato client (`rclone crypt`) perché i CV sono dati personali;
- chiavi come segreti del repository, mai nel codice; avviso via email se il job fallisce;
- servono: un contratto/DPA con il fornitore scelto (dati personali) e una prova di ripristino trimestrale.
Alternativa più semplice ma dipendente dal PC acceso: pianificare lo script locale con l'Utilità di pianificazione di Windows.
Stato: **in attesa di decisione** su fornitore e approvazione.

## 6. Decisioni e aperti

| Tema | Stato |
|---|---|
| Migrazioni nella build | fatto e verificato |
| Allineamento cronologia migrazioni | fatto (`backfill_schema_drift`, marcata applicata in produzione) |
| Indici `pg_trgm` | pronti in `prisma/pending/`, non applicati; decidere prima di ~50.000 candidati/org |
| Matching: `resumeText` | opzione A (invariato); opzione C sopra i 5.000 candidati per organizzazione |
| Separazione Preview/produzione | pianificata; in attesa dello staging eu-west-2 |
| Punti fragili del paragrafo 2 | non corretti; da decidere (concorrenza Inngest, limite upload a 4 MB, errori AI non più ingoiati, `connection_limit`) |
| Limiti e prezzi Vercel, Inngest, Groq, PITR | da verificare nei pannelli |
| PITR | da decidere |
| Backup automatico dei file | proposta pronta, da approvare |
