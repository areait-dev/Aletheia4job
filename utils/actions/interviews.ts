"use server";

import prisma from "@/utils/db";
import { AuditAction } from "@prisma/client";
import { canWrite, createAuditLogEntry, getCurrentUserDisplayName } from "../authz";
import { authenticateAndRedirect } from "./shared";
import { cronofyDeleteEvent, cronofyUpsertEvent, getCronofyAccessTokenForUser } from "../integrations/cronofy";

export async function getCandidateInterviewsAction(candidateId: string) {
  const { organizationId } = await authenticateAndRedirect();
  return prisma.interview.findMany({ where: { candidateId, organizationId }, orderBy: { scheduledAt: "asc" } });
}

export async function getUpcomingInterviewsAction(limit = 20) {
  const { organizationId } = await authenticateAndRedirect();
  return prisma.interview.findMany({ where: { organizationId, scheduledAt: { gte: new Date() }, outcome: "PENDING" }, include: { candidate: true }, orderBy: { scheduledAt: "asc" }, take: limit });
}

export async function createInterviewAction(values: { candidateId: string; jobId?: string; type: any; scheduledAt: string; duration?: number; location?: string; notes?: string; }) {
  const { userId, organizationId, role } = await authenticateAndRedirect();
  if (!canWrite(role)) return { ok: false, error: "Non autorizzato" };

  const recruiterName = await getCurrentUserDisplayName();
  const interview = await prisma.interview.create({
    data: { organizationId, candidateId: values.candidateId, jobId: values.jobId || null, recruiterId: userId, recruiterName, type: values.type, scheduledAt: new Date(values.scheduledAt), duration: values.duration || null, location: values.location || null, notes: values.notes || null, outcome: "PENDING" }
  });

  await createAuditLogEntry({ userId, organizationId, action: AuditAction.CREATE, entity: "interview", entityId: interview.id });
  return { ok: true, interview };
}

export async function updateInterviewOutcomeAction(interviewId: string, outcome: any) {
  const { organizationId, role } = await authenticateAndRedirect();
  if (!canWrite(role)) return { ok: false, error: "Non autorizzato" };

  await prisma.interview.updateMany({ where: { id: interviewId, organizationId }, data: { outcome } });
  return { ok: true };
}

export async function deleteInterviewAction(interviewId: string) {
  const { organizationId, role } = await authenticateAndRedirect();
  if (!canWrite(role)) return { ok: false, error: "Non autorizzato" };
  await prisma.interview.deleteMany({ where: { id: interviewId, organizationId } });
  return { ok: true };
}
