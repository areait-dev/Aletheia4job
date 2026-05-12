"use server";

import prisma from "@/utils/db";
import { AuditAction, AbsenceStatus, AbsenceType, EmployeeStatus, AttendanceEntry, Prisma } from "@prisma/client";
import { canWrite, canApproveAbsence, createAuditLogEntry } from "../authz";
import { authenticateAndRedirect } from "./shared";
import { cronofyDeleteEvent, cronofyUpsertEvent, getCronofyAccessTokenForUser } from "../integrations/cronofy";

export async function getEmployeesAction() {
  const { organizationId } = await authenticateAndRedirect();
  return prisma.employee.findMany({ where: { organizationId }, orderBy: { createdAt: "desc" } });
}

export async function createEmployeeAction(values: { firstName: string; lastName: string; email: string; roleTitle: string; department?: string; managerName?: string; hiredAt?: string; }) {
  const { userId, organizationId, role } = await authenticateAndRedirect();
  if (!canWrite(role)) return { ok: false, error: "Non autorizzato" };

  const employee = await prisma.employee.create({
    data: { organizationId, firstName: values.firstName.trim(), lastName: values.lastName.trim(), email: values.email.trim().toLowerCase(), roleTitle: values.roleTitle.trim(), department: values.department || null, managerName: values.managerName || null, hiredAt: values.hiredAt ? new Date(values.hiredAt) : null, status: "ACTIVE" }
  });
  await createAuditLogEntry({ userId, organizationId, action: AuditAction.CREATE, entity: "employee", entityId: employee.id });
  return { ok: true, employee };
}

export async function getAbsencesAction(params?: { employeeId?: string; from?: string; to?: string }) {
  const { organizationId } = await authenticateAndRedirect();
  const where: any = { organizationId };
  if (params?.employeeId) where.employeeId = params.employeeId;
  if (params?.from || params?.to) {
    where.startDate = {};
    if (params.from) where.startDate.gte = new Date(params.from);
    if (params.to) where.startDate.lte = new Date(params.to);
  }
  return prisma.absence.findMany({ where, include: { employee: true }, orderBy: { startDate: "asc" } });
}

export async function createAbsenceAction(values: { employeeId: string; type: AbsenceType; startDate: string; endDate: string; notes?: string; }) {
  const { userId, organizationId, role } = await authenticateAndRedirect();
  if (!canWrite(role)) return { ok: false, error: "Non autorizzato" };

  const absence = await prisma.absence.create({
    data: { organizationId, employeeId: values.employeeId, requestedByUserId: userId, type: values.type, status: "REQUESTED", startDate: new Date(values.startDate), endDate: new Date(values.endDate), notes: values.notes || null }
  });
  
  await createAuditLogEntry({ userId, organizationId, action: AuditAction.CREATE, entity: "absence", entityId: absence.id });
  return { ok: true, absence };
}

export async function updateAbsenceStatusAction(absenceId: string, status: AbsenceStatus) {
  const { userId, organizationId, role } = await authenticateAndRedirect();
  if (!canApproveAbsence(role)) return { ok: false, error: "Non autorizzato" };

  await prisma.absence.updateMany({ where: { id: absenceId, organizationId }, data: { status } });
  await createAuditLogEntry({ userId, organizationId, action: AuditAction.STATUS_CHANGE, entity: "absence", entityId: absenceId, metadata: { status } });
  return { ok: true };
}

export async function upsertAttendanceEntryAction(values: { employeeId: string; date: string; minutesWorked: number; overtimeMinutes?: number; notes?: string; }) {
  const { userId, organizationId, role } = await authenticateAndRedirect();
  if (!canWrite(role)) return { ok: false, error: "Non autorizzato" };

  const date = new Date(values.date);
  const entry = await prisma.attendanceEntry.upsert({
    where: { employeeId_date: { employeeId: values.employeeId, date } },
    update: { minutesWorked: values.minutesWorked, overtimeMinutes: values.overtimeMinutes ?? null, notes: values.notes || null },
    create: { organizationId, employeeId: values.employeeId, date, minutesWorked: values.minutesWorked, overtimeMinutes: values.overtimeMinutes ?? null, notes: values.notes || null }
  });

  await createAuditLogEntry({ userId, organizationId, action: AuditAction.UPDATE, entity: "attendance_entry", entityId: entry.id });
  return { ok: true, entry };
}

export async function getAttendanceEntriesAction(params?: { employeeId?: string; from?: string; to?: string }) {
  const { organizationId } = await authenticateAndRedirect();
  const where: any = { organizationId };
  if (params?.employeeId) where.employeeId = params.employeeId;
  if (params?.from || params?.to) {
    where.date = {};
    if (params.from) where.date.gte = new Date(params.from);
    if (params.to) where.date.lte = new Date(params.to);
  }
  return prisma.attendanceEntry.findMany({ where, include: { employee: true }, orderBy: { date: "asc" } });
}

export async function deleteAbsenceAction(absenceId: string) {
  const { userId, organizationId, role } = await authenticateAndRedirect();
  if (!canWrite(role)) return { ok: false, error: "Non autorizzato" };

  const absence = await prisma.absence.findUnique({ where: { id: absenceId, organizationId } });
  if (!absence) return { ok: false, error: "Assenza non trovata" };

  await prisma.absence.delete({ where: { id: absenceId } });
  await createAuditLogEntry({ userId, organizationId, action: AuditAction.DELETE, entity: "absence", entityId: absenceId });
  return { ok: true };
}
