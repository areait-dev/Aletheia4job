-- Allinea la cronologia delle migrazioni allo schema: queste colonne/indici esistono già in produzione
-- (creati fuori dalle migrazioni) ma nessuna migrazione li creava, quindi un database nuovo
-- (staging, ripristino) restava incompleto. Tutto idempotente: in produzione non cambia nulla.

ALTER TABLE "Application"
  ADD COLUMN IF NOT EXISTS "broadbeanApplicationRef" TEXT,
  ADD COLUMN IF NOT EXISTS "broadbeanBoardId" TEXT,
  ADD COLUMN IF NOT EXISTS "matchedKeywords" TEXT[],
  ADD COLUMN IF NOT EXISTS "matchingScore" INTEGER,
  ADD COLUMN IF NOT EXISTS "missingKeywords" TEXT[],
  ADD COLUMN IF NOT EXISTS "parsingError" TEXT,
  ADD COLUMN IF NOT EXISTS "parsingStatus" TEXT NOT NULL DEFAULT 'PENDING',
  ADD COLUMN IF NOT EXISTS "recommendation" TEXT;

ALTER TABLE "Job"
  ADD COLUMN IF NOT EXISTS "broadbeanError" TEXT,
  ADD COLUMN IF NOT EXISTS "broadbeanJobId" TEXT,
  ADD COLUMN IF NOT EXISTS "broadbeanLastSyncedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "broadbeanStatus" TEXT DEFAULT 'NOT_SENT',
  ADD COLUMN IF NOT EXISTS "postToCareerPage" BOOLEAN NOT NULL DEFAULT true;

CREATE UNIQUE INDEX IF NOT EXISTS "Application_broadbeanApplicationRef_key" ON "Application"("broadbeanApplicationRef");
CREATE UNIQUE INDEX IF NOT EXISTS "Job_broadbeanJobId_key" ON "Job"("broadbeanJobId");
