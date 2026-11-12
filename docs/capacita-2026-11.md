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

### Punti fragili (stato al 12/11/2026; le correzioni 1-3 sono nel codice ma NON ancora committate né in produzione)
1. Nessun `concurrency`/`throttle` sulle funzioni Inngest: molti CV insieme significano molte esecuzioni parallele contro Groq e contro il pool del database.
   **Corretto:** `concurrency: 5` e `retries: 5` su `process-cv` e `process-candidate-cv`; misurato nel paragrafo 3bis (mai più di 5 chiamate AI contemporanee).
2. Errori AI ingoiati: dopo i tentativi il codice logga e marca la candidatura `COMPLETED` senza analisi né punteggio.
   **Corretto:** gli errori temporanei di Groq (429, timeout, 5xx) si ritentano con attesa crescente (`lib/groqRetry.ts`); se l'analisi resta non riuscita la candidatura passa a `FAILED`
   con il motivo in `parsingError`, e la scheda candidato offre già "Riprova Elaborazione". Corretto anche `TenantContextMissingError` nei passi Inngest (ogni passo gira in `runWithTenantContext`).
3. Upload limitato a 5 MB nell'app, ma Vercel accetta circa 4,5 MB di body: un PDF fra i due valori fallisce con 413 prima del codice.
   **Corretto:** limite 4 MB (`utils/uploadLimits.ts`), controllo nel browser e 413 con messaggio leggibile dal server.
4. OCR (`tesseract.js`) in serverless: lento e a rischio timeout su PDF scansionati.
5. `DATABASE_URL` senza `connection_limit`: molte istanze in parallelo possono esaurire il pool. **Misurato e con proposta:** paragrafo 3bis.
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

## 3bis. Simulazione di un picco di CV (12/11/2026, staging)

Script in `scripts/loadtest/peak/`. **Cosa è reale e cosa no:** database di staging reale (via pooler); Groq e Storage sono un **server finto locale** (latenza 2-4 s, limite di richieste al minuto
come parametro: i limiti reali del piano Groq NON sono noti); app Next in modalità sviluppo e dev server di Inngest sul PC. Non dice nulla su Vercel (durata, avvii a freddo, limiti del piano) né su Inngest cloud.
Si misura solo la versione attuale (al commit precedente i passi fallivano con `TenantContextMissingError`: un "prima" non avrebbe valore).

| | Prova (10 CV, 100 richieste/min) | Carico (100 CV, 30 richieste/min) |
|---|---|---|
| Tempo al 25 / 50 / 90 / 100% | 9 / 13 / 19 / 19 s | 82 / 198 / 637 / 706 s |
| Candidature con punteggio | 10 su 10 | 100 su 100 |
| Candidature `FAILED` | 0 | 0 (nessun errore registrato) |
| Chiamate AI (riuscite / 429) | 20 (20 / 0) | 512 (200 / 312) |
| Picco di chiamate AI contemporanee | 5 | 5 (= `concurrency`) |
| Picco di connessioni al DB (lato server) | 5 | 1 |

- **Throttling:** per i primi ~6 minuti si completano 14-15 CV al minuto, cioè 28-30 chiamate AI al minuto: la pipeline segue il limite senza crollare e nessun CV viene perso.
- **Spreco:** il 61% delle chiamate (312 su 512) viene respinto con 429. Con il server finto costa nulla; con Groq reale non so se i 429 contino nel consumo del limite: da verificare.
- **Coda lunga (risolta con `step.sleep`, commit `ae1e119`; vedi confronto e diagnosi sotto):** il tempo ideale per 200 chiamate a 30/min sarebbe circa 400 s, ne sono serviti 706. Dal 88° CV (t=425 s) all'89° (t=627 s) passano 202 s.
  Nell'SDK Inngest installato (4.4.0) `attempt` è per l'intera esecuzione della funzione, non per passo, quindi non si azzera fra `ai-parse-cv` e `ai-match-score`.
  Primo tentativo di correzione: tetto di 90 s all'attesa (con `Retry-After`: Retry-After + 0-5 s). Risultato nel confronto sotto: **solo -7%**, la coda resta.

### Confronto prima/dopo il tetto di 90 s (100 CV, 30 richieste/min, stesso ambiente)

| | Senza tetto (attesa fino a 300 s) | Con tetto 90 s |
|---|---|---|
| Tempo al 25 / 50 / 90 / 100% | 82 / 198 / 637 / 706 s | 97 / 213 / 635 / 656 s |
| Chiamate AI (riuscite / 429) | 512 (200 / 312) | 497 (200 / 297) |
| Intervallo massimo fra due completamenti (campionato ogni 3 s) | 246 s | 235 s |
| `FAILED` / errori registrati | 0 / nessuno | 0 / nessuno |

Il tetto ha ridotto il tempo totale di 49 s (-7%) e di poco i 429; il 25% e il 50% sono arrivati un po' più tardi (rumore o effetto dei tentativi più ravvicinati: non distinguibile con una sola misura per caso).
**La spiegazione "attesa troppo lunga" è quindi insufficiente.** Nel secondo giro, minuto per minuto: dal minuto 5 le chiamate scendono (153, 96, 96, 57, 28, 31, 11) e **da t=441 s a t=625 s non parte nessuna chiamata AI**
mentre 11 candidature restano in lavorazione. Con un'attesa calcolata di al massimo 90 s non dovrebbero esserci 180 s senza alcun tentativo: l'attesa effettiva è maggiore di quella richiesta.
**Indagine con log temporanei (un solo giro, 100 CV, 30 richieste/min; log poi rimossi):** il silenzio è stato di 291 s (da t=390 s a t=682 s dalla prima richiesta), con 25 candidature ferme.
Il nostro codice aveva chiesto attese brevi: 293 `RetryAfterError` con 9-44 s (mai oltre), formato corretto (`"35s"` → 35 s nell'SDK 4.4.0). Le attese dentro la chiamata (`callWithGroqRetry`) non c'entrano:
con Retry-After di 20-33 s (> 8 s) la chiamata lancia subito al job, e in tutto il giro ci sono state solo 25 attese interne (di 1-2 s).
Il ritardo **reale** fra la richiesta di riprogrammazione e la ripresa del passo cresce con il numero del tentativo, indipendentemente da quanto chiesto (media su 285 riprogrammazioni):

| Passaggio | Chiesto da noi | Ripresa reale | Ritardo mediano oltre il chiesto |
|---|---|---|---|
| tentativo 0 → 1 | 27 s | 42 s | +20 s |
| 1 → 2 | 37 s | 56 s | +21 s |
| 2 → 3 | 37 s | 78 s | +42 s |
| 3 → 4 | 17 s | 144 s | +132 s |
| 4 → 5 (ultimo) | 35 s | 318 s | +281 s |

Esempio: il run `NV308W` al tentativo 4 chiede 38 s e riparte al tentativo 5 dopo circa 300 s. **Chi aspettava cosa:** nella finestra non c'erano attese interne né code per la `concurrency` (nessuna chiamata AI, nessun passo avviato):
erano tutti run riprogrammati dall'esecutore di Inngest, che li ha ripresi più tardi di quanto richiesto. **Causa più probabile: il dev server Inngest (CLI 1.52.0)** applica un proprio ritardo di ritentativo crescente con il tentativo
(o ignora/prevale sul `RetryAfterError`). Non è dimostrato che sia così anche su Inngest cloud: va verificato lì. Non è un errore di formato nostro.
**Conseguenza importante:** con `retries: 5` e ritardi che arrivano a ~5 minuti all'ultimo tentativo, sotto rate limit prolungato alcuni CV arrivano al tentativo 5 con Groq ancora in 429 e finiscono `FAILED`
(in questo giro: 8 su 100, 4 in "lettura del CV" e 4 in "punteggio"; nei due giri precedenti 0, a parità di condizioni: il risultato dipende dal caso e dal carico). Il rilancio dalla scheda del candidato resta disponibile.
**Correzione applicata (commit `ae1e119`, `lib/aiStepRetry.ts`):** i ritentativi di Inngest non si usano più per il rate limit. Nei passi AI (`ai-parse-cv`, `ai-match-score`, `ai-parse-candidate`) un errore temporaneo di Groq
non fa fallire il passo: restituisce `{ retry: true, retryAfterSeconds }` e il job attende con `step.sleep` (durata esatta) in un ciclo con contatore proprio, fino a 8 tentativi, con ID di passo unici (`${nome}-${i}`, `wait-${nome}-${i}`).
Attesa = Retry-After + jitter fra 5 s e max(5, Retry-After/2) s, tetto 90 s; senza Retry-After backoff 30/60/90 s. Esauriti gli 8 tentativi: application `FAILED` con "limite di richieste AI ancora superato dopo 8 tentativi"
(in `processCandidateCV`: `ok:false`, `reason: "ai-rate-limited"`). Gli errori non temporanei restano soggetti a `retries: 5`.

### Confronto dei quattro giri (100 CV, 30 richieste/min, stesso ambiente)

| | Senza tetto | Tetto 90 s | Log di debug (tetto 90 s) | `step.sleep` |
|---|---|---|---|---|
| Tempo al 25 / 50 / 90 / 100% | 82 / 198 / 637 / 706 s | 97 / 213 / 635 / 656 s | 81 / 219 / 707 / 790 s | 85 / 215 / 408 / 423 s |
| Candidature con punteggio | 100 | 100 | 96 | 100 |
| `FAILED` | 0 | 0 | 8 | **0** |
| Chiamate AI (riuscite / 429) | 512 (200 / 312) | 497 (200 / 297) | 510 (192 / 318) | 490 (200 / 290) |
| Intervallo massimo fra due completamenti | 246 s | 235 s | 308 s | **50 s** |
| Picco di chiamate AI contemporanee | 5 | 5 | 5 | 5 |

Con `step.sleep` il tempo totale è 423 s contro i ~400 s ideali (200 chiamate a 30/min): la coda lunga è sparita e l'intervallo massimo fra due completamenti scende da 246 s a 50 s. Un solo giro per variante: la differenza fra i primi tre
è dentro la variabilità, quella con `step.sleep` è netta. **Resta da verificare su Inngest cloud**, dove il comportamento dei ritentativi può essere diverso; gli ID dei passi sono cambiati (`ai-parse-cv` → `ai-parse-cv-0`, ...),
quindi le esecuzioni già in corso al momento di un deploy potrebbero ripartire dal passo AI.
- **Connessioni DB:** il picco "1" misura le connessioni lato server dietro il pooler (modalità transazione) e non i client: con `concurrency: 5` il database non è stato il limite.

### `connection_limit` (`pool-ceiling.ts`, staging, 12/11/2026)
- **A) Tetto del pooler:** accetta 200 connessioni client contemporanee, poi rifiuta con `EMAXCONN max client connections reached, limit: 200`. È il valore dello staging: **quello di produzione non è misurato** (dipende dalla dimensione di calcolo).
- **B) `connection_limit=1`:** una transazione interattiva con una query dello stesso client in mezzo resta in attesa e fallisce dopo 5,7 s (`Timed out fetching a new connection from the connection pool`). Con 2 e con 3 funziona (circa 1,4 s).
- **Proposta (da decidere, non applicata):** `connection_limit=3&pool_timeout=20` in `DATABASE_URL` di produzione. Non 1, perché basta una query nidificata in una transazione (per esempio un controllo di tenant o autorizzazione) per bloccare la richiesta.
  Con 3 connessioni per istanza, circa 66 istanze serverless contemporanee riempirebbero un tetto di 200: se produzione ha un tetto uguale e si prevedono picchi di traffico sull'interfaccia (non di CV, che sono limitati a 5 alla volta), conviene 2.
  Prima di attivarlo: leggere nel pannello Supabase il limite reale del pooler di produzione e il numero di istanze Vercel atteso.
- Nota: la prima esecuzione della parte A non misurava nulla (`pg_sleep` restituisce un tipo che Prisma non legge); corretta la query nello script.

## 3ter. Deploy e verifica post-deploy

- **Quando fare il deploy:** quando su Inngest cloud non ci sono run in corso di `process-cv` e `process-candidate-cv`. Gli ID dei passi AI sono cambiati (`ai-parse-cv` → `ai-parse-cv-0`, `ai-match-score` → `ai-match-score-0`, `ai-parse-candidate` → `ai-parse-candidate-0`):
  i run già avviati rieseguirebbero i passi AI.
- **Subito dopo il deploy:** caricare 2-3 CV di prova e controllare nella timeline di Inngest che compaiano i passi `ai-parse-cv-0` e `ai-match-score-0`, e che le application arrivino a `COMPLETED` con il punteggio.
- **Al primo 429 reale di Groq:** controllare nella timeline che i passi `wait-*` durino quanto richiesto (Retry-After + 5 s fino a metà Retry-After, tetto 90 s). È la verifica che la simulazione, fatta sul dev server, non può dare.
- **Punti ancora aperti dopo il deploy:** `connection_limit=3&pool_timeout=20` (in attesa del limite del pooler di produzione) e il throttle Inngest sulle funzioni CV (da tarare sui limiti reali di Groq). Vedi la tabella del paragrafo 6.

### Esito della verifica post-deploy (12/11/2026, deploy `a02a617`)

Prova con tre candidature di prova in produzione (`test-deploy-1/2/3@example.com`, organizzazione `org_prod_123`):

| Candidato | CV | Esito |
|---|---|---|
| test-deploy-3 | PDF esportato da LibreOffice, 14.355 byte | **`COMPLETED` in 39 s**, punteggio 40, `resumeText` di 349 caratteri, competenze e formazione compilate dall'AI |
| test-deploy-1, test-deploy-2 | PDF di circa 1,8 KB (`%PDF-1.3`) | `extract-cv-text` fallisce con "bad XRef entry"; application rimaste in `PROCESSING` |

- **Il deploy funziona.** Il file di test-deploy-3 nello Storage è integro (intestazione `%PDF`, nessuna sequenza `EF BF BD`, `startxref` esatto) e `pdf-parse` lo legge. Il percorso dei byte (form → `uploadCV` → `/api/upload-cv` → Storage → `downloadCv`)
  non li altera, e i commit di questa attività non hanno cambiato come il file viene letto, inviato o scaricato.
- **Causa del fallimento dei primi due:** i PDF erano **non validi** (tabella xref malformata): `pdf-parse` li rifiuta con lo stesso errore anche in locale. Non è un difetto di caricamento o scaricamento.
- **Difetto vero, corretto in `ba8125f`:** un CV illeggibile veniva ritentato 5 volte e l'application restava in `PROCESSING` per sempre, senza `parsingError` né pulsante di rilancio (`processCV` non aveva `onFailure`).
  Ora un CV illeggibile (file vuoto, troppo grande, formato non supportato, PDF/DOCX non leggibile) fa riuscire il passo con `{ ok: false }`, senza ritentativi, e l'application va subito in `FAILED` con "Impossibile leggere il CV: il file potrebbe essere danneggiato o in un formato non supportato. Prova a ricaricarlo in PDF.".
  Gli errori temporanei (download dallo Storage, rete) restano ritentabili. `onFailure` su `processCV` porta in `FAILED` l'application `PENDING`/`PROCESSING` se il run fallisce dopo tutti i tentativi (senza toccare quelle già `COMPLETED` o `FAILED`);
  su `processCandidateCV` registra il motivo nei log. Deploy di `ba8125f` in Production e Sync Inngest riusciti il 12/11/2026 alle 13:07 (ora italiana).
- **Non verificato:** la timeline di Inngest cloud (nomi dei passi `…-0`, durata dei passi `wait-*` al primo 429 reale, che non si è ancora verificato) e il comportamento di `onFailure` su Inngest cloud.
  Una sola lettura riuscita non dimostra che tutti i PDF reali si leggano: da provare con CV reali di tipi diversi (Word esportato in PDF, PDF scansionato).
- **Le due application di prova vecchie** (`b66e33f1…`, `75559d8e…`) giravano con il codice precedente: subito dopo il deploy di `ba8125f` erano ancora `PROCESSING`. Non è stato verificato se si sarebbero chiuse da sole: sono state eliminate nella pulizia qui sotto.

### Pulizia dei dati di prova in produzione (12/11/2026)

Eliminati, con approvazione, solo i dati creati dalla verifica post-deploy, in una sola transazione con controllo preventivo dei conteggi (organizzazione `org_prod_123`):
- 3 candidati (`test-deploy-1/2/3@example.com`) e le loro 3 application (nessuna nota né colloquio collegati);
- 3 righe `application_submitted` di `PublicFunnelEvent` generate dalle prove (`job_view` e `apply_click` non toccati);
- 3 file in `cvs/org_prod_123/` (l'intero prefisso conteneva solo questi);
- 3 righe `AuditLog` (`DELETE` su `candidate`, utente `system:pulizia-dati-di-prova`) a traccia dell'operazione.

Stato finale verificato: `Application` 0, `Candidate` 311, file nel prefisso 0, `application_submitted` di oggi 0.

**Eliminazione di un candidato dall'interfaccia (era mancante, ora aggiunta):** l'azione `deleteCandidateAction` esisteva (commit `e08ea32`: elimina il candidato e il suo CV dallo Storage, con audit log) ma **non era raggiungibile dall'ATS**:
il pulsante "Elimina" era in `components/JobCard.tsx`, usato solo da `components/JobsList.tsx`, che nessuna pagina importa. L'azione richiede una sessione utente, quindi non si può chiamare da uno script:
la pulizia dei dati di prova qui sopra è stata fatta con una transazione diretta sul database (con gli stessi vincoli per organizzazione), non con l'azione dell'app.
Ora c'è un pulsante «Elimina» nella scheda del candidato (`/archivio/[id]`), con conferma, visibile e consentito **solo a OWNER e ADMIN** (`canDeleteCandidate`; RECRUITER, MANAGER e VIEWER non possono eliminare, pur potendo scrivere).
Serve anche per le richieste di cancellazione dei dati (GDPR). Non c'è ancora nell'elenco dell'archivio. Vedi anche `docs/proposta-privacy-2026-11.md`.

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
Decisione (aggiornata): copia locale incrementale su Windows (backup-cv.bat, ogni giorno alle 13:00) che non cancella mai nulla dalla copia; il piano GitHub Actions + Cloudflare R2 è sospeso (workflow spento).
Workflow e istruzioni pronti ma **non attivi**: `.github/workflows/backup-storage.yml` e `docs/backup-storage.md`. Da fare: creare l'account del fornitore e i segreti, provare con `dry_run`, poi attivare la pianificazione.

## 6. Decisioni e aperti

| Tema | Stato |
|---|---|
| Migrazioni nella build | fatto e verificato |
| Allineamento cronologia migrazioni | fatto (`backfill_schema_drift`, marcata applicata in produzione) |
| Indici `pg_trgm` | pronti in `prisma/pending/`, non applicati; decidere prima di ~50.000 candidati/org |
| Matching: `resumeText` | opzione A (invariato); opzione C sopra i 5.000 candidati per organizzazione |
| Separazione Preview/produzione | pianificata; in attesa dello staging eu-west-2 |
| Punti fragili 1-3 del paragrafo 2 | corretti nel codice (commit locali del 12/11/2026, **non ancora pubblicati né in produzione**) e provati con la simulazione (3bis) |
| Attesa dei ritentativi AI | **risolta nella simulazione** (commit `ae1e119`): attesa con `step.sleep` e contatore proprio (8 tentativi) invece dei ritentativi Inngest, il cui ritardo di ripresa nel dev server cresceva con il tentativo e superava il `RetryAfterError` (fino a 318 s per 35 s chiesti). 100 CV: 706 → 423 s, `FAILED` 0, intervallo massimo 246 → 50 s. Da verificare su Inngest cloud |
| Throttle Inngest sulle funzioni CV | da aggiungere (`throttle` oltre a `concurrency: 5`) e tarare sui limiti reali del piano Groq, oggi sconosciuti; il valore di 30 richieste/min nella simulazione è solo un parametro |
| `connection_limit=3&pool_timeout=20` in produzione | proposto, **in attesa** della verifica nel pannello Supabase del limite del pooler di produzione (staging: 200 connessioni client); con 1 si blocca (misurato) |
| Eliminazione di un candidato dall'interfaccia | **aggiunta** il pulsante «Elimina» nella scheda del candidato (`/archivio/[id]`), solo per OWNER e ADMIN (`canDeleteCandidate`, applicato anche in `deleteCandidateAction`); prova controllata in produzione con un candidato di prova (esito da annotare); manca ancora nell'elenco dell'archivio (vedi paragrafo 3ter) |
| Prova dell'interfaccia su staging | **lavoro futuro**: staging senza login. Servono le chiavi Supabase di staging (`STAGING_SUPABASE_URL`, anon key, service role key in `.env.staging`), un utente in Supabase Auth e una membership (ruolo `ADMIN`) in un'organizzazione; oggi le 8 organizzazioni `LOADTEST-*` hanno 0 membri e 0 utenti. In più uno script di avvio che imposti e controlli ogni variabile (`.env` contiene i valori di produzione) |
| `serveOrigin` Inngest in sviluppo | `INNGEST_SERVE_ORIGIN` rispettato (prima fisso su `127.0.0.1:3000`); commit a parte |
| Limiti e prezzi Vercel, Inngest, Groq, PITR | da verificare nei pannelli |
| PITR | da decidere |
| Backup automatico dei file | copia locale incrementale (`backup-cv.bat`): attività "Backup CV Aletheia" creata e provata (ogni giorno alle 13:00, recupera se il PC era spento); piano R2 sospeso (workflow spento) |
| Funzioni Inngest | 4 registrate; sync automatico dopo ogni deploy di produzione (`.github/workflows/sync-inngest.yml`), verificato |
| Eliminazione CV e file abbandonati | eliminando un candidato si elimina il CV; `cv-orphan-cleanup` in simulazione fino a circa il 18/11/2026, poi si decide il passaggio a `delete`; orfani storici eliminati (163 file) |
| Limiti bucket `cvs` | 10 MB, solo PDF/DOC/DOCX (applicati); l'app limita a 5 MB per il body di Vercel |
