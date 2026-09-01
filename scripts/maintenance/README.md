# Script di manutenzione dati

Script one-off usati per correggere/ripulire dati esistenti nel database o
nello storage (Supabase) in seguito a import massivi, bug storici o
migrazioni di formato.

**Non fanno parte della build o del deploy** e non vengono eseguiti da CI.
Vanno lanciati manualmente, uno alla volta, quando serve, tipicamente con
`npx tsx scripts/maintenance/<nome-script>.ts`.

Regole d'uso:

- Leggere l'header di ogni script prima di eseguirlo: molti supportano una
  modalità `--dry-run` (o sono dry-run di default e richiedono `--apply`
  per scrivere davvero sul database).
- Eseguirli contro il database di produzione solo dopo averli provati in
  locale/staging.
- Dopo l'esecuzione, verificare l'esito (log, conteggi, audit log) prima di
  considerare la correzione completata.

## Script disponibili

- `apply-name-phone-city-corrections.ts` — corregge nome/telefono/città su record importati con dati incompleti.
- `apply-orphans-classification.ts` — riclassifica candidati orfani (senza job collegato) dopo il recupero.
- `apply-unknown-corrections.ts` — applica correzioni manuali a campi marcati come "unknown".
- `db-fix-status.ts` — normalizza valori di stato candidatura non validi.
- `db-fix-future-dates.ts` — corregge date di creazione/applicazione impostate erroneamente nel futuro.
- `dedupe-fake-emails.ts` — deduplica candidati con email fittizie generate automaticamente.
- `normalize-roles.ts` / `normalize-roles-2.ts` — normalizzano i valori del campo ruolo/mansione.
- `normalize-sectors.ts` — normalizza i valori del campo settore.
- `storage-fill-missing-fields.ts` — recupera metadati mancanti sui file caricati su Supabase Storage.
- `storage-find-orphans.ts` — individua file su Supabase Storage senza un candidato collegato nel DB.
- `storage-recover-orphans.ts` — ricollega/recupera i file orfani trovati da `storage-find-orphans.ts`.
- `storage-recover-fix-names.ts` — corregge i nomi file dopo il recupero degli orfani.
