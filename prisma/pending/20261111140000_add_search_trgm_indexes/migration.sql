-- Ricerca testuale dell'archivio candidati: Prisma `contains` + `mode: insensitive` genera ILIKE '%x%',
-- che senza indici trigram legge tutte le righe dell'organizzazione. Questi indici GIN lo rendono rapido.
-- Misurato su staging (20.000 candidati, org da 10.000): conteggio ricerca 82 ms -> 0,9 ms.
-- Nessuna modifica al codice: le query restano uguali.
-- Nota: CREATE INDEX (non CONCURRENTLY) blocca le scritture sulla tabella durante la creazione;
-- con poche migliaia di righe sono secondi. Prisma non può usare CONCURRENTLY dentro una migrazione.

CREATE EXTENSION IF NOT EXISTS pg_trgm WITH SCHEMA extensions;

CREATE INDEX IF NOT EXISTS "Candidate_firstName_trgm_idx" ON "Candidate" USING gin ("firstName" extensions.gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "Candidate_lastName_trgm_idx"  ON "Candidate" USING gin ("lastName"  extensions.gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "Candidate_email_trgm_idx"     ON "Candidate" USING gin ("email"     extensions.gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "Candidate_city_trgm_idx"      ON "Candidate" USING gin ("city"      extensions.gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "Candidate_role_trgm_idx"      ON "Candidate" USING gin ("role"      extensions.gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "Candidate_sector_trgm_idx"    ON "Candidate" USING gin ("sector"    extensions.gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "Candidate_skills_trgm_idx"    ON "Candidate" USING gin ("skills"    extensions.gin_trgm_ops);
