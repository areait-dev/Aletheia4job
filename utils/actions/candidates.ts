"use server";

import prisma from "@/utils/db";
import { 
  CandidateType, 
  CreateAndEditCandidateType, 
  GetAllCandidatesActionTypes 
} from "../types";
import { AuditAction, Prisma } from "@prisma/client";
import { canWrite, createAuditLogEntry, getCurrentUserDisplayName } from "../authz";
import { authenticateAndRedirect } from "./shared";

export async function getAllCandidatesAction(params: GetAllCandidatesActionTypes & { jobId?: string }) {
  const { organizationId } = await authenticateAndRedirect();
  const { search, candidateStatus, province, sector, page = 1, limit = 10, jobId } = params;

  try {
    let whereClause: Prisma.CandidateWhereInput = { organizationId };

    if (jobId) {
      whereClause.applications = { some: { jobId } };
    }

    if (search) {
      whereClause.OR = [
        { firstName: { contains: search, mode: "insensitive" } },
        { lastName: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
        { city: { contains: search, mode: "insensitive" } },
        { role: { contains: search, mode: "insensitive" } },
        { sector: { contains: search, mode: "insensitive" } },
        { skills: { contains: search, mode: "insensitive" } },
      ];
    }

    if (candidateStatus && candidateStatus !== "tutti") {
      whereClause.status = candidateStatus;
    }

    if (province && province !== "tutte") {
      whereClause.province = { contains: province, mode: "insensitive" };
    }

    if (sector && sector !== "tutti") {
      whereClause.sector = { equals: sector, mode: "insensitive" };
    }

    const skip = (Number(page) - 1) * limit;

    const [candidates, count] = await Promise.all([
      prisma.candidate.findMany({
        where: whereClause,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          applications: {
            select: { jobId: true },
            take: 1,
            orderBy: { createdAt: 'desc' }
          }
        }
      }),
      prisma.candidate.count({ where: whereClause }),
    ]);

    return { 
      candidates, 
      count, 
      page: Number(page), 
      totalPages: Math.ceil(count / limit) 
    };
  } catch (error) {
    console.error("Errore Database:", error);
    return { candidates: [], count: 0, page: 1, totalPages: 0 };
  }
}

export async function getSectorsAction() {
  const { organizationId } = await authenticateAndRedirect();
  try {
    const sectors = await prisma.candidate.groupBy({
      where: { organizationId },
      by: ["sector"],
      _count: { sector: true },
      orderBy: { sector: "asc" },
    });
    return sectors.map((s) => ({ sector: s.sector, count: s._count.sector }));
  } catch (error) { 
    return []; 
  }
}

export async function getSingleCandidateAction(id: string): Promise<CandidateType | null> {
  const { organizationId } = await authenticateAndRedirect();
  try {
    const candidate = await prisma.candidate.findFirst({
      where: { id, organizationId },
      include: {
        applications: {
          include: { job: true },
          orderBy: { createdAt: 'desc' }
        },
        candidateNotes: { orderBy: { createdAt: 'desc' } },
        interviews: { orderBy: { scheduledAt: 'desc' } }
      }
    });
    return candidate as any;
  } catch (error) {
    console.error("Errore nel recupero del candidato:", error);
    return null;
  }
}

export async function createCandidateAction(values: CreateAndEditCandidateType): Promise<CandidateType | null> {
  const { userId, organizationId, role } = await authenticateAndRedirect();
  if (!canWrite(role)) return null;
  try {
    const candidate = await prisma.candidate.create({
      data: {
        ...values,
        userId,
        organizationId,
      },
    });
    await createAuditLogEntry({
      userId,
      organizationId,
      action: AuditAction.CREATE,
      entity: "candidate",
      entityId: candidate.id,
    });
    return candidate;
  } catch (error) {
    console.error("Errore nella creazione del candidato:", error);
    return null;
  }
}

export async function checkEmailExistsAction(email: string): Promise<boolean> {
  const { organizationId } = await authenticateAndRedirect();
  try {
    const existingCandidate = await prisma.candidate.findFirst({
      where: { email, organizationId },
    });
    return !!existingCandidate;
  } catch (error) {
    return false;
  }
}

export async function getCandidateStatsAction() {
  const { organizationId } = await authenticateAndRedirect();
  try {
    const totalCandidates = await prisma.candidate.count({ where: { organizationId } });
    const statusStats = await prisma.candidate.groupBy({
      where: { organizationId },
      by: ["status"],
      _count: { status: true },
    });
    const sectorStats = await prisma.candidate.groupBy({
      where: { organizationId },
      by: ["sector"],
      _count: { sector: true },
      orderBy: { _count: { sector: "desc" } },
      take: 5,
    });
    return {
      totalCandidates,
      statusStats: statusStats.map(s => ({ status: s.status, count: s._count.status })),
      sectorStats: sectorStats.map(s => ({ sector: s.sector, count: s._count.sector })),
    };
  } catch (error) {
    return { totalCandidates: 0, statusStats: [], sectorStats: [] };
  }
}

export async function updateCandidateStatusAction(candidateId: string, status: string): Promise<CandidateType | null> {
  const { userId, organizationId, role } = await authenticateAndRedirect();
  if (!canWrite(role)) return null;
  try {
    await prisma.candidate.updateMany({
      where: { id: candidateId, organizationId },
      data: { status, updatedAt: new Date() },
    });
    const updated = await prisma.candidate.findFirst({
      where: { id: candidateId, organizationId },
    });
    if (!updated) return null;
    await createAuditLogEntry({
      userId,
      organizationId,
      action: AuditAction.STATUS_CHANGE,
      entity: "candidate",
      entityId: candidateId,
      metadata: { status },
    });
    return updated;
  } catch (error) {
    return null;
  }
}

export async function updateCandidateAction(candidateId: string, values: Partial<CreateAndEditCandidateType>): Promise<CandidateType | null> {
  const { userId, organizationId, role } = await authenticateAndRedirect();
  if (!canWrite(role)) return null;
  try {
    await prisma.candidate.updateMany({
      where: { id: candidateId, organizationId },
      data: values,
    });
    const updated = await prisma.candidate.findFirst({ where: { id: candidateId, organizationId } });
    if (!updated) return null;
    await createAuditLogEntry({
      userId, organizationId,
      action: AuditAction.UPDATE,
      entity: "candidate",
      entityId: candidateId,
    });
    return updated;
  } catch (error) {
    return null;
  }
}

export async function getChartsDataAction() {
  const { organizationId } = await authenticateAndRedirect();
  try {
    const monthlyData = await prisma.candidate.groupBy({
      where: { organizationId },
      by: ["createdAt"],
      _count: { id: true },
      orderBy: { createdAt: "asc" },
    });
    const statusData = await prisma.candidate.groupBy({
      where: { organizationId },
      by: ["status"],
      _count: { status: true },
    });
    return {
      monthlyData: monthlyData.map(d => ({
        date: d.createdAt.toISOString().split('T')[0],
        count: d._count.id,
      })),
      statusData: statusData.map(s => ({
        status: s.status,
        count: s._count.status,
      })),
    };
  } catch (error) {
    return { monthlyData: [], statusData: [] };
  }
}

export async function deleteCandidateAction(candidateId: string): Promise<boolean> {
  const { userId, organizationId, role } = await authenticateAndRedirect();
  if (!canWrite(role)) return false;
  try {
    const result = await prisma.candidate.deleteMany({
      where: { id: candidateId, organizationId },
    });
    if (result.count > 0) {
      await createAuditLogEntry({ userId, organizationId, action: AuditAction.DELETE, entity: "candidate", entityId: candidateId });
    }
    return true;
  } catch (error) {
    return false;
  }
}

// NOTES
export async function getCandidateNotesAction(candidateId: string) {
  const { organizationId } = await authenticateAndRedirect();
  return prisma.candidateNote.findMany({
    where: { candidateId, organizationId },
    orderBy: { createdAt: "desc" },
  });
}

export async function createCandidateNoteAction(values: {
  candidateId: string;
  type: "NOTA" | "VALUTAZIONE" | "COLLOQUIO" | "FEEDBACK";
  content: string;
}) {
  const { userId, organizationId, role } = await authenticateAndRedirect();
  if (!canWrite(role)) return { ok: false, error: "Non autorizzato" };
  const authorName = await getCurrentUserDisplayName();
  const note = await prisma.candidateNote.create({
    data: {
      organizationId,
      candidateId: values.candidateId,
      authorId: userId,
      authorName,
      type: values.type as any,
      content: values.content.trim(),
    },
  });
  await createAuditLogEntry({ userId, organizationId, action: AuditAction.CREATE, entity: "candidate_note", entityId: note.id });
  return { ok: true, note };
}

export async function deleteCandidateNoteAction(noteId: string) {
  const { organizationId, role } = await authenticateAndRedirect();
  if (!canWrite(role)) return { ok: false, error: "Non autorizzato" };
  await prisma.candidateNote.deleteMany({ where: { id: noteId, organizationId } });
  return { ok: true };
}
