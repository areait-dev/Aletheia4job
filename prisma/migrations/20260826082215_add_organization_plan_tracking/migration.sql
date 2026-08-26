-- AlterTable
ALTER TABLE "Organization" ADD COLUMN     "planTier" TEXT NOT NULL DEFAULT 'free_year_1',
ADD COLUMN     "planExpiresAt" TIMESTAMP(3);

-- Backfill: le organizzazioni esistenti ricevono una scadenza calcolata da createdAt + 12 mesi,
-- invece di restare NULL, cosi' il dato e' coerente per tutte le org fin da subito.
UPDATE "Organization" SET "planExpiresAt" = "createdAt" + INTERVAL '12 months' WHERE "planExpiresAt" IS NULL;
