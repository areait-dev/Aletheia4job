-- Indici per le query dell'archivio (filtro per organizzazione + ordinamento/filtri)
-- e della career page/feed (offerte aperte e attive).
CREATE INDEX "Candidate_organizationId_createdAt_idx" ON "Candidate"("organizationId", "createdAt" DESC);
CREATE INDEX "Candidate_organizationId_status_idx" ON "Candidate"("organizationId", "status");
CREATE INDEX "Candidate_organizationId_sector_idx" ON "Candidate"("organizationId", "sector");
CREATE INDEX "Job_organizationId_status_isActive_idx" ON "Job"("organizationId", "status", "isActive");
