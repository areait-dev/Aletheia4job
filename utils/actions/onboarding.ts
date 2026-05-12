"use server";

import prisma from "@/utils/db";
import { AuditAction, OnboardingTaskStatus } from "@prisma/client";
import { canWrite, createAuditLogEntry } from "@/utils/authz";
import { authenticateAndRedirect } from "./shared";

export async function getOnboardingTasksAction() {
  const { organizationId } = await authenticateAndRedirect();
  return prisma.onboardingTask.findMany({
    where: { organizationId },
    include: { employee: true },
    orderBy: { createdAt: "desc" }
  });
}

export async function createOnboardingTaskAction(values: { employeeId: string; title: string; dueDate?: string; }) {
  const { userId, organizationId, role } = await authenticateAndRedirect();
  if (!canWrite(role)) return { ok: false, error: "Non autorizzato" };

  const task = await prisma.onboardingTask.create({
    data: {
      organizationId,
      employeeId: values.employeeId,
      title: values.title.trim(),
      dueDate: values.dueDate ? new Date(values.dueDate) : null,
      status: OnboardingTaskStatus.TODO
    }
  });

  await createAuditLogEntry({ userId, organizationId, action: AuditAction.CREATE, entity: "onboarding_task", entityId: task.id });
  return { ok: true, task };
}

export async function updateOnboardingTaskStatusAction(taskId: string, status: OnboardingTaskStatus) {
  const { userId, organizationId, role } = await authenticateAndRedirect();
  if (!canWrite(role)) return { ok: false, error: "Non autorizzato" };

  await prisma.onboardingTask.updateMany({
    where: { id: taskId, organizationId },
    data: { status }
  });

  await createAuditLogEntry({ userId, organizationId, action: AuditAction.STATUS_CHANGE, entity: "onboarding_task", entityId: taskId, metadata: { status } });
  return { ok: true };
}

export async function deleteOnboardingTaskAction(taskId: string) {
  const { userId, organizationId, role } = await authenticateAndRedirect();
  if (!canWrite(role)) return { ok: false, error: "Non autorizzato" };

  await prisma.onboardingTask.deleteMany({
    where: { id: taskId, organizationId }
  });

  await createAuditLogEntry({ userId, organizationId, action: AuditAction.DELETE, entity: "onboarding_task", entityId: taskId });
  return { ok: true };
}
