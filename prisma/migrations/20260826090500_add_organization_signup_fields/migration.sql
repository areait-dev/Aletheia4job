-- AlterTable
ALTER TABLE "Organization" ADD COLUMN     "vatNumber" TEXT,
ADD COLUMN     "phone" TEXT,
ADD COLUMN     "sector" TEXT,
ADD COLUMN     "termsAcceptedAt" TIMESTAMP(3),
ADD COLUMN     "marketingConsent" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE UNIQUE INDEX "Organization_vatNumber_key" ON "Organization"("vatNumber");
