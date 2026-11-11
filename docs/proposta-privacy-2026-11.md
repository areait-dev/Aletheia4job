# Proposta tecnica — privacy, consenso e conservazione dei CV

**Stato: PROPOSTA DA REVISIONARE. Nulla è stato implementato né applicato.** Pensata per essere letta da chi rivede il progetto (anche un consulente privacy).
I testi giuridici sono bozze: vanno validati da chi cura la privacy dell'azienda.

**Periodo di conservazione: 24 mesi** (deciso dal proprietario il 11/11/2026; più breve dei 36 mesi scritti oggi nell'informativa, quindi lecito, ma l'informativa va aggiornata). Il valore resta un parametro (`Organization.retentionMonths`): per cambiarlo bastano il default e una riga dell'informativa.

## 1. Fatti rilevati (verificati nel codice e nei dati)

| # | Fatto | Dove |
|---|---|---|
| 1 | Il consenso privacy è solo **validato** (`z.literal(true)`), non **salvato**: nessuna data, nessuna versione dell'informativa. Il candidato non ha campi di consenso. | `utils/types.ts`, schema `Candidate` |
| 2 | Nel form di candidatura a un annuncio la dicitura "Informativa sulla privacy" **non è un link**. Spontanea e Long List collegano `/privacy-policy`. | `components/JobApplicationForm.tsx:418` |
| 3 | La Long List salva il consenso solo come testo dell'email/note, non come dato interrogabile. Il consenso marketing della Long List non è una colonna. | `utils/actions/teachers.ts:145` |
| 4 | L'informativa dice che per i dati particolari (art. 9, es. L. 68/99) il consenso arriva "tramite la spunta sul form", ma nei form **non c'è una spunta separata** per questi dati. | `app/privacy-policy/page.tsx:20` |
| 5 | L'informativa promette **massimo 36 mesi** di conservazione, ma **non esiste nessuna cancellazione automatica**. | `app/privacy-policy/page.tsx:15` |
| 6 | Eliminando un candidato **non si cancella il suo CV in Storage** (solo la riga e i figli per `CASCADE`). Il diritto alla cancellazione oggi è incompleto. | `deleteCandidateAction` |
| 7 | Il form carica il CV **appena si seleziona il file**, prima dell'invio: un form abbandonato lascia un file senza candidato. | `JobApplicationForm.tsx` |
| 8 | `Candidate.updatedAt` non è utilizzabile come "ultimo aggiornamento": **tutti i 309 candidati hanno `updatedAt` di oggi** (migrazioni e script). | dati |
| 9 | **140 candidati su 309 non hanno un'email valida**: non si può avvisarli. L'invio email (Resend) non è ancora configurato. | dati, `teachers.ts` |
| 10 | Il candidato più vecchio è del 14/05/2026: con 24 mesi **nessuna cancellazione può avvenire prima di maggio 2028**. | dati |
| 11 | L'informativa non elenca i fornitori reali né i trasferimenti extra-UE (Groq, Vercel, Inngest, Resend sono servizi con sede o sub-fornitori negli USA), non dice che usiamo l'AI per riassumere e dare un punteggio ai CV, non riporta la data di ultimo aggiornamento. | `privacy-policy/page.tsx` |
| 12 | Sulla piattaforma entrano dati di altre organizzazioni (multi-tenant): per quei dati il titolare è l'organizzazione cliente e Alètheia è responsabile (art. 28). L'informativa nomina solo Alètheia come titolare. | `privacy-policy/page.tsx:56` |

## 2. Cosa propongo

### 2.1 Consenso salvato con data e versione
- Costante lato server `PRIVACY_POLICY_VERSION` (es. `2026-11-12`), mostrata anche in fondo all'informativa. Il client **non** invia la versione: la fissa il server, così non è manipolabile.
- Nuove colonne su `Candidate` (bozza in `prisma/pending/20261112000000_privacy_retention_consent/migration.sql`): `consentPrivacyAt`, `consentPrivacyVersion`, `consentSpecialAt`, `consentMarketingAt`, `consentSource` (`career_page` | `spontanea` | `long_list` | `gestionale`).
- Le azioni che creano/aggiornano un candidato da form pubblici (`applyToJobAction`, candidatura spontanea, Long List) impostano questi campi quando la casella è spuntata.
- **Dati particolari (art. 9):** una seconda casella **facoltativa e separata**: "Acconsento al trattamento dei dati particolari eventualmente contenuti nel mio CV (es. appartenenza a categorie protette, L. 68/99)". Si salva in `consentSpecialAt`. Accanto un invito a non inserire dati sulla salute se non necessari. Senza spunta nulla blocca l'invio.
- **Candidati esistenti:** i consensi non si inventano (restano NULL = "non registrato prima del 11/11/2026"). Per i 309 attuali valgono l'informativa e i consensi dati ai tempi, che non sono documentati: da dichiarare nel registro dei trattamenti.
- Il form di candidatura a un annuncio: il testo "Informativa sulla privacy" diventa un **link** a `/privacy-policy`.

### 2.2 Ultima attività (`lastActivityAt`)
Colonna dedicata, **non** `updatedAt`. Valore iniziale = la più recente fra creazione, candidature, note e colloqui. Si aggiorna quando:
1. arriva una nuova candidatura o un nuovo CV del candidato;
2. il candidato conferma di voler restare (link nell'avviso);
3. un recruiter fissa un colloquio o cambia lo stato in modo significativo (es. "In cerca" → "Colloquiato"/"Assunto").
Funzione unica `touchCandidateActivity(tx, candidateId)` richiamata in questi punti. Indice `(organizationId, lastActivityAt)`.

### 2.3 Cancellazione automatica dopo 24 mesi, con avviso
**Regole**
- Scadenza = `lastActivityAt + retentionMonths`. Periodo per organizzazione (`Organization.retentionMonths`, default 24; NULL = nessuna cancellazione automatica).
- **Esclusi:** `retentionHold = true` (blocco manuale), stato "Assunto", candidati con colloqui in corso.
- **Avviso** 30 giorni prima (una sola email, più un promemoria a 7 giorni): "I tuoi dati scadranno il …. Se vuoi restare nel nostro archivio clicca qui". Il link porta a una pagina che richiede un **clic su un pulsante** (non basta aprire il link: gli antivirus delle email aprono i link da soli) e usa un token firmato con scadenza (si riusa `utils/signedState.ts`). Conferma → `lastActivityAt = now`, `retentionWarnedAt = NULL`, riga "renewed" nel registro.
- **Cancellazione** quando la scadenza è passata e l'avviso risale ad almeno 30 giorni prima. Ordine: 1) elimina il file in Storage, 2) elimina il candidato (candidature, note, colloqui seguono per `CASCADE`), 3) scrive una riga nel registro. Se il passo 1 fallisce non si procede e si riprova al giro successivo.
- **Senza email valida (140 candidati oggi):** nessun avviso possibile. Elenco "In scadenza" visibile all'amministratore, che decide (rinnova, blocca, cancella). Alla scadenza + 30 giorni si cancella comunque, come stabilisce l'informativa.
- **Registro (`RetentionLog`)**: nessun dato personale (riferimento = hash dell'id, organizzazione, azione, motivo, data). `storagePath` serve a far eliminare il file anche dalla **copia di backup locale** (lo script di backup legge il registro e rimuove i file corrispondenti da `storage` e da `_versioni`). Si può svuotare dopo 90 giorni.

**Funzione Inngest `retention-sweep`** (bozza; non creata come file per non registrarla per errore):
```ts
// cron: ogni giorno alle 03:00. Modalità da env RETENTION_MODE = off | dry | warn | delete  (default: off)
inngest.createFunction({ id: "retention-sweep", concurrency: 1 }, { cron: "0 3 * * *" }, async ({ step }) => {
  const mode = process.env.RETENTION_MODE ?? "off";
  if (mode === "off") return { skipped: true };
  const orgs = await step.run("orgs", () => dbUnscoped.organization.findMany({ where: { retentionMonths: { not: null } }, select: { id: true, retentionMonths: true } }));
  for (const org of orgs) {
    // 1) da avvisare: scadenza entro 30 giorni, mai avvisati, non bloccati
    // 2) da cancellare: scaduti da oltre 30 giorni dall'avviso (o senza email), non rinnovati, non bloccati
    // Limite di sicurezza: se i candidati da cancellare in un giro superano max(20, 5% dell'organizzazione), ci si ferma e si segnala
    // dry   -> scrive solo righe 'simulated_delete' nel registro e restituisce l'elenco
    // warn  -> invia gli avvisi (nessuna cancellazione)
    // delete-> avvisi + cancellazioni (file prima, poi riga), a lotti da 50
  }
});
```
- **Fasi di attivazione:** `off` → `dry` (30 giorni, si guarda l'elenco) → `warn` → `delete`. Interruttore di emergenza: `RETENTION_MODE=off`.
- **Prerequisiti:** Resend configurato con mittente verificato; testo dell'avviso approvato; candidati esistenti marcati con la politica.

### 2.4 Correzioni indipendenti, da fare subito (piccole)
- ✅ **Fatto il 11/11/2026:** `deleteCandidateAction` elimina anche il file in Storage dopo il commit, con tentativi, registrazione del fallimento e nuovo tentativo via Inngest; funzione giornaliera di pulizia dei caricamenti abbandonati (in simulazione); limiti del bucket `cvs`. Vedi `docs/sicurezza-2026-11.md`, sezioni 9 e 10.
- (Vecchio punto) `deleteCandidateAction`: eliminare anche il file in Storage (oggi resta). Stessa cosa per l'eliminazione massiva, se esiste.
- Link all'informativa nel form di candidatura a un annuncio.
- File orfani: non cancellare in automatico; produrre un report mensile (file in `cvs` non referenziati da nessun `cvUrl` da più di 30 giorni) da rivedere a mano.
- (Facoltativo) Impostare sul bucket `cvs` il limite di 5 MB e i tipi MIME consentiti, come già in `candidates`.

## 3. Bozza di aggiornamento dell'informativa (da far controllare)

> **Conservazione.** I dati dei candidati sono conservati per **24 mesi** dall'ultima attività (candidatura, aggiornamento del CV, colloquio o conferma da parte tua). **30 giorni prima della scadenza** ti inviamo un avviso all'indirizzo email indicato, con la possibilità di chiedere di restare nel nostro archivio. In assenza di conferma, dati e CV vengono cancellati. In caso di assunzione i dati seguono le regole del rapporto di lavoro.
>
> **Consenso.** Registriamo la data e la versione dell'informativa che hai accettato. Puoi revocare il consenso in ogni momento scrivendo a info@aletheiasrl.it: la revoca non pregiudica la liceità del trattamento effettuato prima.
>
> **Dati particolari (art. 9 GDPR).** Se nel CV indichi dati sulla salute o altre categorie particolari (es. appartenenza alle categorie protette L. 68/99), li trattiamo solo con il tuo consenso esplicito, separato e facoltativo. Ti invitiamo a non includerli se non necessari.
>
> **Strumenti di analisi automatica.** Per leggere i CV e calcolare un punteggio di compatibilità con le posizioni utilizziamo sistemi di intelligenza artificiale forniti da terzi [nome del fornitore e sede]. Il punteggio è un supporto: **nessuna decisione sulla tua candidatura è presa in modo esclusivamente automatizzato**; ogni valutazione è effettuata da una persona. *(Da confermare: è la descrizione del processo che l'azienda intende garantire.)*
>
> **Fornitori (responsabili del trattamento, art. 28)** e luogo dei dati: database e file su Supabase (regione AWS di Londra, Regno Unito); applicazione su Vercel; esecuzione dei processi in background su Inngest; analisi AI su Groq; invio email su Resend. Alcuni di questi fornitori hanno sede o sub-fornitori negli USA: il trasferimento avviene sulla base di decisione di adeguatezza (Data Privacy Framework) o clausole contrattuali standard. *(Elenco e basi giuridiche da verificare con i contratti/DPA effettivamente firmati; la regione di Supabase va controllata.)*
>
> **Ruoli.** Per i dati che le aziende clienti inseriscono nella piattaforma, il titolare è l'azienda cliente e Alètheia S.r.l. agisce come responsabile del trattamento.
>
> **Ultimo aggiornamento:** [data] — versione [PRIVACY_POLICY_VERSION].

## 4. Piano di rilascio (ogni fase è sicura da sola)
1. **Fase 1 — consenso e link** (nessun comportamento che cancelli): migrazione additiva, salvataggio dei consensi, link informativa, seconda casella art. 9, nuovo testo dell'informativa.
2. **Fase 2 — `deleteCandidateAction` cancella anche il file** + test.
3. **Fase 3 — `retention-sweep` in modalità `dry`** per 30 giorni: si controlla l'elenco; con i dati attuali sarà vuoto fino a maggio 2028, quindi il collaudo va fatto su staging con date simulate.
4. **Fase 4 — avvisi** (`warn`), con Resend configurato.
5. **Fase 5 — cancellazione** (`delete`), con limite di sicurezza per giro.
Ogni migrazione passa dal flusso già in uso (`prisma/pending` → `prisma/migrations` solo dopo l'approvazione) e resta retro-compatibile con il codice in produzione.

## 5. Test previsti
- Il consenso viene salvato con data e versione; senza la spunta obbligatoria la candidatura è rifiutata; la seconda casella è facoltativa.
- `lastActivityAt` si aggiorna negli eventi elencati e non per aggiornamenti tecnici (`updatedAt`, AI, migrazioni).
- Retention (su staging, con date simulate): non cancella bloccati/assunti/con colloqui; non cancella prima dell'avviso + 30 giorni; il rinnovo azzera l'avviso; il limite di sicurezza ferma un giro anomalo; se il file in Storage non si cancella, la riga resta.
- Il token di conferma scade, non è riutilizzabile oltre la scadenza e un clic su GET non rinnova.
- `deleteCandidateAction` rimuove il file; un file di altra organizzazione non viene mai toccato.

## 6. Decisioni che servono da chi revisiona
1. 24 o 36 mesi (parametro).
2. "Assunto": cancellare i dati del candidato dopo l'assunzione o spostarli nel fascicolo del dipendente? (La tabella `Employee` esiste.)
3. Modalità per i candidati senza email: elenco all'amministratore (proposto) oppure cancellazione alla scadenza senza avviso.
4. Mittente e testo dell'email di avviso; configurazione di Resend.
5. Verifica dei contratti con i fornitori (DPA, regione Supabase) e testo definitivo dell'informativa.
6. Che cosa fare dei consensi non documentati dei candidati già presenti.
