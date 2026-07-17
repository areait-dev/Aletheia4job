-- AlterTable
ALTER TABLE "Job" ADD COLUMN IF NOT EXISTS "locationInputType" TEXT DEFAULT 'single';
ALTER TABLE "Job" ADD COLUMN IF NOT EXISTS "locationOptions" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- AlterTable
ALTER TABLE "Application" ADD COLUMN IF NOT EXISTS "appliedLocation" TEXT;
