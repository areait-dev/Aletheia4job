"use server";

import prisma from "@/utils/db";
import { authenticateAndRedirect } from "./shared";
import { canWrite } from "../authz";
import { logger } from "../logger";
import { scoreCandidateForJob, type MatchResult } from "@/lib/jobMatching";

export type JobMatch = MatchResult & {
  jobId: string;
  title: string;
  company: string;
  location: string;
  sector: string;
};

/** Offerte attive dell'organizzazione ordinate per compatibilita con il candidato. */
export async function getMatchingJobsForCandidateAction(
  candidateId: string,
  limit = 8
): Promise<JobMatch[]> {
  const { organizationId } = await authenticateAndRedirect();
  try {
    const candidate = await prisma.candidate.findFirst({
      where: { id: candidateId, organizationId },
      include: { applications: { select: { jobId: true } } },
    });
    if (!candidate) return [];

    const alreadyApplied = new Set(candidate.applications.map((a) => a.jobId));
    const jobs = await prisma.job.findMany({
      where: {
        organizationId,
        status: "Aperto",
        isActive: true,
        OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
      },
      take: 300,
    });

    return jobs
      .filter((j) => !alreadyApplied.has(j.id))
      .map((j) => ({
        jobId: j.id,
        title: j.title,
        company: j.company,
        location: j.locationFormatted || j.location,
        sector: j.sector,
        ...scoreCandidateForJob(candidate, j),
      }))
      .filter((m) => m.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  } catch (error) {
    logger.error("Errore matching offerte per candidato", error, { candidateId });
    return [];
  }
}

/** Associa un candidato dell'archivio a un'offerta creando la candidatura. */
export async function assignCandidateToJobAction(
  candidateId: string,
  jobId: string
): Promise<{ ok: boolean; error?: string }> {
  const { organizationId, role } = await authenticateAndRedirect();
  if (!canWrite(role)) return { ok: false, error: "Permessi insufficienti." };
  try {
    const [candidate, job] = await Promise.all([
      prisma.candidate.findFirst({ where: { id: candidateId, organizationId } }),
      prisma.job.findFirst({ where: { id: jobId, organizationId } }),
    ]);
    if (!candidate || !job) return { ok: false, error: "Candidato o offerta non trovati." };

    const existing = await prisma.application.findUnique({
      where: { candidateId_jobId: { candidateId, jobId } },
    });
    if (existing) return { ok: false, error: "Il candidato e gia associato a questa offerta." };

    const m = scoreCandidateForJob(candidate, job);
    await prisma.application.create({
      data: {
        candidateId,
        jobId,
        organizationId,
        status: "Nuovo",
        matchingScore: m.score,
        matchedKeywords: m.matchedKeywords,
        missingKeywords: m.missingKeywords,
      },
    });
    return { ok: true };
  } catch (error) {
    logger.error("Errore associazione candidato a offerta", error, { candidateId, jobId });
    return { ok: false, error: "Errore durante l'associazione." };
  }
}
