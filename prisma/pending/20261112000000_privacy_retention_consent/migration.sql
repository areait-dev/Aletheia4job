-- BOZZA DA REVISIONARE — NON APPLICATA. Fuori da prisma/migrations: nessun migrate deploy la esegue.
-- Vedi docs/proposta-privacy-2026-11.md.
--
-- Retro-compatibile con il codice in produzione: solo colonne nuove con default/NULL e una tabella nuova;
-- il codice attuale le ignora. Idempotente (IF NOT EXISTS).

-- 1) Periodo di conservazione per organizzazione (NULL = cancellazione automatica disattivata)
ALTER TABLE "Organization" ADD COLUMN IF NOT EXISTS "retentionMonths" INTEGER DEFAULT 24;

-- 2) Candidato: ultima attività, stato dell'avviso, blocco manuale, consensi con data e versione
ALTER TABLE "Candidate"
  ADD COLUMN IF NOT EXISTS "lastActivityAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN IF NOT EXISTS "retentionWarnedAt"     TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "retentionHold"         BOOLEAN      NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "consentPrivacyAt"      TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "consentPrivacyVersion" TEXT,
  ADD COLUMN IF NOT EXISTS "consentSpecialAt"      TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "consentMarketingAt"    TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "consentSource"         TEXT;

-- 3) Valore iniziale di lastActivityAt: NON updatedAt (le migrazioni lo hanno azzerato a oggi per tutti),
--    ma la data più recente fra creazione, candidature, note e colloqui.
UPDATE "Candidate" c
SET "lastActivityAt" = GREATEST(
  c."createdAt",
  COALESCE((SELECT max(a."createdAt")   FROM "Application"   a WHERE a."candidateId" = c.id), c."createdAt"),
  COALESCE((SELECT max(n."createdAt")   FROM "CandidateNote" n WHERE n."candidateId" = c.id), c."createdAt"),
  COALESCE((SELECT max(i."scheduledAt") FROM "Interview"     i WHERE i."candidateId" = c.id), c."createdAt")
);
-- I consensi dei candidati esistenti NON vengono inventati: restano NULL ("non registrato prima del rilascio").

CREATE INDEX IF NOT EXISTS "Candidate_organizationId_lastActivityAt_idx" ON "Candidate"("organizationId", "lastActivityAt");

-- 4) Registro delle cancellazioni per conservazione: nessun dato personale (riferimento = hash dell'id).
--    storagePath serve a far eliminare il file anche dalla copia di backup locale; si può svuotare dopo 90 giorni.
CREATE TABLE IF NOT EXISTS "RetentionLog" (
  "id"             TEXT         NOT NULL,
  "organizationId" TEXT         NOT NULL,
  "candidateRef"   TEXT         NOT NULL,
  "action"         TEXT         NOT NULL,   -- 'warned' | 'deleted' | 'renewed' | 'skipped_hold' | 'simulated_delete'
  "reason"         TEXT,
  "storagePath"    TEXT,
  "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "RetentionLog_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "RetentionLog_organizationId_createdAt_idx" ON "RetentionLog"("organizationId", "createdAt");
-- La RLS si abilita da sola (event trigger rls_auto_enable); per sicurezza anche esplicita:
ALTER TABLE "RetentionLog" ENABLE ROW LEVEL SECURITY;
