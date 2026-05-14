-- AlterTable
ALTER TABLE "Candidate" ADD COLUMN     "educationScore" INTEGER,
ADD COLUMN     "experienceScore" INTEGER,
ADD COLUMN     "keywordScore" INTEGER,
ADD COLUMN     "matchedKeywords" TEXT[],
ADD COLUMN     "matchingScore" INTEGER,
ADD COLUMN     "missingKeywords" TEXT[],
ADD COLUMN     "recommendation" TEXT,
ADD COLUMN     "resumeText" TEXT;

-- CreateTable
CREATE TABLE "CalendarEvent" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "cronofyEventId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CalendarEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CalendarEvent_cronofyEventId_key" ON "CalendarEvent"("cronofyEventId");

-- CreateIndex
CREATE INDEX "CalendarEvent_organizationId_startDate_idx" ON "CalendarEvent"("organizationId", "startDate");

-- CreateIndex
CREATE INDEX "CalendarEvent_userId_startDate_idx" ON "CalendarEvent"("userId", "startDate");

-- CreateIndex
CREATE INDEX "Candidate_matchingScore_idx" ON "Candidate"("matchingScore" DESC);

-- AddForeignKey
ALTER TABLE "CalendarEvent" ADD CONSTRAINT "CalendarEvent_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
