"use server";

import prisma from "@/utils/db";
import { AuditAction, ReviewCycleStatus } from "@prisma/client";
import { canManageMembers, createAuditLogEntry } from "../authz";
import { authenticateAndRedirect } from "./shared";

export async function getReviewCyclesAction() {
  const { organizationId } = await authenticateAndRedirect();
  return prisma.reviewCycle.findMany({ where: { organizationId }, orderBy: { createdAt: "desc" } });
}

export async function createReviewCycleAction(values: { name: string; startsAt?: string; endsAt?: string; }) {
  const { userId, organizationId, role } = await authenticateAndRedirect();
  if (!canManageMembers(role)) return { ok: false, error: "Non autorizzato" };

  const cycle = await prisma.reviewCycle.create({
    data: { organizationId, name: values.name.trim(), startsAt: values.startsAt ? new Date(values.startsAt) : null, endsAt: values.endsAt ? new Date(values.endsAt) : null, status: ReviewCycleStatus.DRAFT }
  });
  await createAuditLogEntry({ userId, organizationId, action: AuditAction.CREATE, entity: "review_cycle", entityId: cycle.id });
  return { ok: true, cycle };
}

export async function createEmployeeReviewAction(values: { employeeId: string; reviewCycleId: string; score?: number; summary?: string; }) {
  const { userId, organizationId, role } = await authenticateAndRedirect();
  if (!canManageMembers(role)) return { ok: false, error: "Non autorizzato" };

  const review = await prisma.review.upsert({
    where: { employeeId_reviewCycleId: { employeeId: values.employeeId, reviewCycleId: values.reviewCycleId } },
    update: { score: values.score ?? null, summary: values.summary || null },
    create: { organizationId, employeeId: values.employeeId, reviewCycleId: values.reviewCycleId, score: values.score ?? null, summary: values.summary || null }
  });
  await createAuditLogEntry({ userId, organizationId, action: AuditAction.UPDATE, entity: "review", entityId: review.id });
  return { ok: true, review };
}

export async function getReviewsAction(reviewCycleId?: string) {
  const { organizationId } = await authenticateAndRedirect();
  return prisma.review.findMany({ where: { organizationId, ...(reviewCycleId ? { reviewCycleId } : {}) }, include: { employee: true, reviewCycle: true }, orderBy: { createdAt: "desc" } });
}
