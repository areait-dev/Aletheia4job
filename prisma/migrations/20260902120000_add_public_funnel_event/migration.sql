-- CreateTable
CREATE TABLE "PublicFunnelEvent" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "jobId" TEXT,
    "eventType" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PublicFunnelEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PublicFunnelEvent_organizationId_eventType_createdAt_idx" ON "PublicFunnelEvent"("organizationId", "eventType", "createdAt");

-- CreateIndex
CREATE INDEX "PublicFunnelEvent_jobId_eventType_idx" ON "PublicFunnelEvent"("jobId", "eventType");

-- AddForeignKey
ALTER TABLE "PublicFunnelEvent" ADD CONSTRAINT "PublicFunnelEvent_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PublicFunnelEvent" ADD CONSTRAINT "PublicFunnelEvent_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE SET NULL ON UPDATE CASCADE;
