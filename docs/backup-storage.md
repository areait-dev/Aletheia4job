# Backup dei file (Supabase Storage)

Il PITR di Supabase non copre i file: i backup del database salvano i metadati degli oggetti, non il loro contenuto.
Un CV cancellato dal bucket non si recupera dal database. I file vanno quindi salvati a parte.

**Piano attuale: copia locale incrementale su Windows**, pianificata ogni giorno alle 13:00. Il piano con Cloudflare R2 (cifrato, nel cloud) è **sospeso**: vedi in fondo.
Il workflow GitHub `.github/workflows/backup-storage.yml` resta nel repository ma è **spento** (`if: ${{ false }}`) e non ha alcun trigger automatico.

## Come funziona la copia locale
- Script: `scripts/maintenance/storage-download-buckets.ts` (sola lettura su Supabase). Avvio con doppio clic su `backup-cv.bat` (nella cartella del progetto) o dall'Utilità di pianificazione.
- Destinazione: `C:\Users\<tuo-utente>\Desktop\Progetti next\backup-db\storage\<bucket>\...` (bucket `cvs` e `candidates`, stessa struttura di cartelle dei bucket, fuori dal repository).
- **Incrementale:** scarica solo i file nuovi o cambiati. Un file già presente con la stessa dimensione non viene riscaricato.
- **Non cancella mai nulla dalla copia locale.** Se un file cambia su Supabase, la versione vecchia viene spostata in `storage\_versioni\<data-ora>\...` prima di scrivere quella nuova.
- Ogni file è scaricato in un file temporaneo `.part`, controllato per dimensione e solo dopo rinominato: un download interrotto non lascia file corrotti.
- **Log:** `C:\Users\<tuo-utente>\Desktop\Progetti next\backup-db\log\backup-storage.log` (data/ora, file scaricati, versioni conservate, errori, riepilogo finale). Codice di uscita 0 = ok, 1 = errori, 2 = un altro backup è già in corso.
- File di servizio nella cartella `storage`: `.backup-manifest.json` (stato dei file già copiati) e `.backup.lock` (impedisce due esecuzioni insieme; un blocco più vecchio di 6 ore viene ignorato). Non vanno cancellati né modificati; se il manifest sparisse, il prossimo giro ricostruisce lo stato confrontando le dimensioni.
- Servono nella cartella del progetto le variabili `NEXT_PUBLIC_SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY` (file `.env` o `.env.local`, già presenti).

### Prima esecuzione (11/11/2026)
525 file in origine (523 in `cvs`, 2 in `candidates`), tutti già presenti nella copia fatta a mano in mattinata: scaricati 0, errori 0, 525 registrati nel manifest.
Il caso "scarico file nuovi o cambiati" l'ho provato separatamente su una cartella temporanea (poi eliminata): cartella vuota → 2 file scaricati; file modificato in locale → nuova copia e versione precedente conservata in `_versioni`; rilancio → niente da fare.
Non ho potuto provare con un file davvero cancellato su Supabase: nel codice non esiste nessuna istruzione che cancelli file della copia locale (solo il file di blocco e i `.part`).

## Pianificazione con l'Utilità di pianificazione di Windows (ogni giorno alle 13:00)
1. Premi **Win + R**, scrivi `taskschd.msc`, Invio.
2. A destra: **Crea attività…** (non "Crea attività di base": servono le impostazioni avanzate).
3. Scheda **Generale**: Nome `Backup CV Aletheia`. Scegli **Esegui solo se l'utente è connesso** (così non serve salvare la password; sul PC deve esserci l'utente collegato).
4. Scheda **Attivazione** → **Nuova…**: *Avvia l'attività*: **In pianificazione**; **Giornaliera**; *Inizia* con la data di oggi e ora **13:00:00**; *Ricorrenza ogni* **1** giorni; spunta *Attivata* → OK.
5. Scheda **Azioni** → **Nuova…**: Azione **Avvia programma**.
   - *Programma/script*: `"C:\Users\<tuo-utente>\Desktop\Progetti next\Job-Application-Tracker--NextJS-FullStack-main - Copia\backup-cv.bat"`
   - *Aggiungi argomenti*: `auto` (evita la pausa finale, che aspetterebbe un tasto)
   - *Inizia in*: `C:\Users\<tuo-utente>\Desktop\Progetti next\Job-Application-Tracker--NextJS-FullStack-main - Copia` (senza virgolette)
6. Scheda **Condizioni**: se il PC è un portatile, **togli** la spunta a "Avvia l'attività solo se il computer è alimentato dalla rete elettrica". Puoi lasciare attiva "Avvia solo se è disponibile la connessione di rete".
7. Scheda **Impostazioni**:
   - **spunta "Esegui l'attività non appena possibile dopo un avvio pianificato non eseguito"**: è l'impostazione che fa partire il backup appena possibile se alle 13:00 il PC era spento;
   - "Se l'attività è già in esecuzione": **Non avviare una nuova istanza**;
   - spunta "Arresta l'attività se è in esecuzione da più di" **2 ore**.
8. **OK**. Per provare: clic destro sull'attività → **Esegui**; poi controlla nella colonna *Ultimo risultato* il valore `0x0` e l'ultima riga del log.

Alternativa da PowerShell (stesso risultato; non l'ho eseguita io): `New-ScheduledTaskAction`, `New-ScheduledTaskTrigger -Daily -At 13:00` e `New-ScheduledTaskSettingsSet -StartWhenAvailable -MultipleInstances IgnoreNew`.

## Limiti da conoscere
- **Funziona solo con il PC acceso e l'utente connesso.** Se il PC resta spento per giorni non c'è una copia aggiornata: controlla ogni tanto la data nel log.
- **Una sola copia, sullo stesso PC.** Non protegge da guasto del disco, furto, ransomware o incendio. Consiglio una seconda copia periodica della cartella `backup-db` su un disco esterno (scollegato dopo la copia).
- **Dati personali non cifrati sul disco:** attiva BitLocker (o una cifratura equivalente) sul disco del PC e proteggi il PC con password.
- **Nessuna scadenza automatica.** Con la copia locale non vale più il limite di 90 giorni previsto dal piano R2.

## Richieste di cancellazione dei dati (GDPR)
**I file cancellati da Supabase restano nella copia locale**, perché lo script non cancella mai nulla; restano anche le versioni vecchie in `_versioni`.
Da novembre 2026 eliminare un candidato nell'app elimina anche il suo CV dallo Storage di Supabase. Resta da fare a mano la copia locale. Quando un candidato chiede la cancellazione dei suoi dati, oltre che da Supabase (candidato e file in Storage) il CV va **eliminato a mano anche dalla copia locale**:
1. Cancella prima il candidato e il file nell'app/su Supabase (se elimini solo in locale, il backup lo riscarica al giro successivo).
2. Trova il percorso del file: è il valore di `Candidate.cvUrl` prima della cancellazione (`<organizationId>/<file>.pdf`).
3. Elimina `backup-db\storage\cvs\<organizationId>\<file>.pdf` e le copie con lo stesso nome sotto `backup-db\storage\_versioni\*\cvs\...` (cerca il nome del file dentro `_versioni`).
4. Se hai fatto altre copie (disco esterno), elimina il file anche lì.
5. Annota la cancellazione nel registro delle richieste.

## Ripristino
- **Un singolo file:** carica `backup-db\storage\cvs\<organizationId>\<file>.pdf` nel bucket `cvs` allo stesso percorso (pannello Supabase → Storage → `cvs` → cartella dell'organizzazione → Upload). Il percorso coincide con `Candidate.cvUrl`, quindi il candidato rivede il CV.
- **L'intero bucket:** ricrea il bucket **privato** (Storage → New bucket, "Public bucket" disattivato, stessi limiti di prima) e carica le cartelle. Per molti file serve uno script che legga la cartella locale e carichi con la chiave di servizio: non è ancora scritto, lo preparo se serve.
- **Prova:** ogni trimestre apri a caso un PDF dalla copia locale per verificare che sia leggibile.

---

# Piano sospeso: copia cifrata su Cloudflare R2

Stato: **sospeso e non attivo.** Il workflow esiste ma è spento (`if: ${{ false }}`). Per riattivarlo: ripristina la condizione `vars.BACKUP_ENABLED == 'true'` nel file, crea l'account R2, l'Environment e i segreti come sotto.
Il testo seguente resta come riferimento; le regole di scadenza a 90 giorni valgono solo per quel piano.

## Perché Cloudflare R2 (e non Backblaze B2)
Entrambi vanno bene tecnicamente e hanno un DPA. Scelgo R2 per tre motivi, in ordine di peso:
1. **Nessun costo di uscita dei dati**: il ripristino completo del bucket non si paga a parte. Con B2 l'uscita è gratuita solo fino a una quota legata ai dati conservati.
2. **Scadenza per prefisso** nativa (regola di ciclo di vita su `archive/`), che è quanto serve per il limite di 90 giorni.
3. **Giurisdizione UE** selezionabile per il bucket: i dati restano in UE.
Contro: Cloudflare è una società statunitense (come Backblaze): il trasferimento si basa sul DPA con clausole contrattuali standard e sul Data Privacy Framework.
I file sono comunque cifrati sul nostro lato prima dell'invio, quindi il fornitore non vede il contenuto.
**Prezzi: non verificati qui.** I volumi sono piccoli (0,2 GB oggi, circa 20 GB a 50.000 CV): controlla il listino al momento della creazione dell'account.

## Come funziona
- `rclone sync` copia ogni bucket (`cvs`, `candidates`) in `current/<bucket>/` sul bucket R2. Le cartelle (UUID delle organizzazioni) restano in chiaro, i **nomi dei file e il contenuto sono cifrati** (`rclone crypt`).
- Un file cancellato o sostituito all'origine non viene eliminato: `--backup-dir` lo sposta in `archive/<AAAA-MM-GG>/<bucket>/`.
- Una regola R2 elimina da `archive/` gli oggetti più vecchi di **90 giorni**. Un file cancellato all'origine esce quindi dalla copia entro circa 91 giorni (fino a un giorno per spostarlo in `archive/`, poi 90 giorni).
  Questo vale per le richieste di cancellazione GDPR: va indicato nell'informativa/registro dei trattamenti.
- Protezioni: il job si ferma se l'origine risulta vuota o se dovrebbe cancellare più di 200 file in un colpo (`--max-delete`); alla fine `rclone cryptcheck` verifica che ogni file sia nella copia con lo stesso contenuto.
- Se qualcosa fallisce arriva un'email (Resend), oltre alla notifica di GitHub.

## Cosa devi creare tu
1. **Account Cloudflare** e un bucket R2 (giurisdizione **UE**, ad esempio `aletheia-backup`). Firma/accetta il DPA di Cloudflare.
2. **Regola di scadenza** sul bucket: R2 → bucket → Settings → Object lifecycle rules → prefisso `archive/`, elimina dopo **90 giorni**. Aggiungi anche "abort multipart uploads" dopo 1 giorno.
3. **Token API R2** limitato a quel bucket, permesso "Object Read & Write". Segna endpoint (`https://<account>.eu.r2.cloudflarestorage.com`), access key id e secret.
4. **Chiavi S3 di Supabase** (Project Settings → Storage → S3 Connection → New access key). Attenzione: queste chiavi hanno accesso completo allo Storage e non si possono limitare in sola lettura; trattale come segreti di produzione.
   Endpoint: `https://<project-ref>.storage.supabase.co/storage/v1/s3` (copialo dal pannello), regione: quella del progetto (`eu-west-2`).
5. **Chiave di cifratura**: da un terminale con rclone installato, genera due stringhe casuali lunghe (password e salt) e ottieni la forma "offuscata":
   ```
   rclone obscure "<password-casuale-lunga>"
   rclone obscure "<salt-casuale-lungo>"
   ```
   **Salva password e salt (le stringhe originali, non solo quelle offuscate) in un password manager fuori da GitHub, subito, prima di usarli.**
   GitHub non mostra più un segreto dopo averlo salvato: se perdi la copia nel password manager, i backup non si possono più decifrare.
6. **Environment `backup`** (Settings → Environments → New environment → `backup`). Tutti i segreti qui sotto vanno **dentro l'Environment** (Environment secrets), **non** tra i segreti generici del repository.
   - **Deployment branches and tags**: "Selected branches and tags" → solo `main`. Un job lanciato da qualunque altro ramo non riceve i segreti.
   - **Nessun revisore obbligatorio** (scelta consapevole): con un revisore ogni esecuzione, anche quella notturna, resterebbe in attesa di approvazione e il backup non sarebbe più automatico.
     La protezione si basa invece sul ramo `main` (vedi "Protezione del repository" sotto).
   - Un job riceve i segreti solo se dichiara `environment: backup` (il workflow lo fa).
   Segreti:
   | Nome | Valore |
   |---|---|
   | `SUPABASE_S3_ENDPOINT`, `SUPABASE_S3_REGION` | passo 4 |
   | `SUPABASE_S3_ACCESS_KEY_ID`, `SUPABASE_S3_SECRET_ACCESS_KEY` | passo 4 |
   | `R2_ENDPOINT`, `R2_BUCKET`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY` | passo 3 |
   | `RCLONE_CRYPT_PASSWORD_OBSCURED`, `RCLONE_CRYPT_SALT_OBSCURED` | passo 5 (forma offuscata) |
   | `BACKUP_ALERT_RESEND_API_KEY`, `BACKUP_ALERT_FROM`, `BACKUP_ALERT_TO` | chiave Resend, mittente verificato, destinatario degli avvisi |
7. **Attivazione**: prima una prova — Actions → "Backup Storage" → Run workflow con `dry_run = true` (richiede la variabile `BACKUP_ENABLED = true`, in Settings → Secrets and variables → Actions → Variables).
   Poi una esecuzione reale con `dry_run = false`. Quando funziona, decommenta il blocco `schedule` nel file del workflow e fai il commit.
   Nota: GitHub può disattivare i workflow pianificati dopo 60 giorni senza attività nel repository; controlla di tanto in tanto che l'ultima esecuzione sia recente.

Il workflow copia `cvs` e `candidates`. Il bucket pubblico `logos` non è incluso (sono loghi aziendali ricreabili); aggiungilo a `BUCKETS` se serve.

## Sicurezza dei segreti
- **Pull request da fork:** i workflow avviati da una pull request di un fork non ricevono i segreti (comportamento predefinito di GitHub). In più questo workflow non si attiva mai da pull request:
  i suoi unici trigger sono l'avvio manuale (`workflow_dispatch`) e la pianificazione, che usano il codice del ramo predefinito. Non va mai aggiunto `pull_request_target`.
  Verifica in Settings → Actions → General → "Fork pull request workflows from outside collaborators": scegli "Require approval for all outside collaborators".
  Questa è la garanzia documentata di GitHub; non l'ho potuta provare da qui con una pull request di un fork.
- **Environment `backup`:** solo il job che lo dichiara legge i segreti, e solo se gira dal ramo `main`.
- **Protezione del repository (necessaria, perché non c'è un revisore):** chi può scrivere su `main` può modificare il workflow e leggere i segreti dell'Environment. Quindi:
  - Settings → Branches → regola per `main`: **blocca i force push** e **blocca la cancellazione del ramo**; se lavori in più persone attiva anche "Require a pull request before merging".
  - Settings → Collaborators and teams: **permesso di scrittura al minimo** (solo chi serve davvero; gli altri in sola lettura o "Triage"). Controlla anche chi è amministratore: gli amministratori possono modificare l'Environment e i segreti.
  - Facoltativo: file `CODEOWNERS` con `/.github/workflows/ @<tuo-utente>` e "Require review from Code Owners" nella regola di `main`, così le modifiche ai workflow richiedono la tua approvazione.
- **Chiavi S3 di Supabase:** accesso completo allo Storage, non limitabile; ruotale se sospetti una fuga (Project Settings → Storage → S3 Connection).
- **Password e salt di cifratura:** copia anche in un password manager fuori da GitHub (passo 5). Non servono altrove.

## Ripristino
Prerequisito: rclone sul tuo PC con le stesse variabili d'ambiente del workflow (blocco `env` del file `.github/workflows/backup-storage.yml`:
`RCLONE_CONFIG_SUPA_*`, `RCLONE_CONFIG_R2_*`, `RCLONE_CONFIG_BK_*`, qui con la password e il salt **offuscati**) oppure `rclone config` con tre remote `supa`, `r2` e `bk` equivalenti.
Il percorso del file nel bucket coincide con il valore di `Candidate.cvUrl` (`<organizationId>/<file>.pdf`): ripristinandolo allo stesso percorso il candidato torna a vedere il CV.

**Un singolo file** (cancellato per errore)
```
# 1. cerca il file (i nomi vengono decifrati da rclone)
rclone lsf -R bk:current/cvs/<organizationId>/            # se è ancora nella copia corrente
rclone lsf -R bk:archive --include "<parte-del-nome>*"    # se è stato cancellato/sostituito (ultimi 90 giorni)
# 2. rimettilo nel bucket allo stesso percorso (non sovrascrive se esiste già)
rclone copyto bk:current/cvs/<organizationId>/<file>.pdf supa:cvs/<organizationId>/<file>.pdf --ignore-existing
rclone copyto bk:archive/<AAAA-MM-GG>/cvs/<organizationId>/<file>.pdf supa:cvs/<organizationId>/<file>.pdf --ignore-existing
```

**L'intero bucket**
```
rclone copy bk:current/cvs supa:cvs --ignore-existing --transfers 8 -P
rclone copy bk:current/candidates supa:candidates --ignore-existing --transfers 8 -P
# verifica
rclone cryptcheck supa:cvs bk:current/cvs --one-way
```
Se il bucket di destinazione non esiste più: ricrealo **privato** (Storage → New bucket, "Public bucket" disattivato), con gli stessi limiti di prima, prima del `rclone copy`.

**Prova di ripristino**: ogni trimestre ripristina un file a caso in una cartella locale e aprilo (`rclone copyto bk:current/cvs/<percorso> ./prova.pdf`). Un backup mai provato non è un backup.
