"use server";

import prisma from "@/utils/db";
import { AuditAction } from "@prisma/client";
import { canAccessDocuments, createAuditLogEntry } from "../authz";
import { authenticateAndRedirect } from "./shared";

export async function getDocumentsAction() {
  const { organizationId, role } = await authenticateAndRedirect();
  if (!canAccessDocuments(role)) return [];
  return prisma.document.findMany({ where: { organizationId }, include: { employee: true }, orderBy: { createdAt: "desc" } });
}

export async function createDocumentAction(values: { title: string; fileUrl: string; employeeId?: string; }) {
  const { userId, organizationId, role } = await authenticateAndRedirect();
  if (!canAccessDocuments(role)) return { ok: false, error: "Non autorizzato" };

  const document = await prisma.document.create({
    data: { organizationId, employeeId: values.employeeId || null, title: values.title.trim(), fileUrl: values.fileUrl, signatureStatus: "DRAFT" }
  });
  await createAuditLogEntry({ userId, organizationId, action: AuditAction.CREATE, entity: "document", entityId: document.id, metadata: { title: values.title } });
  return { ok: true, document };
}

export async function updateDocumentSignatureStatusAction(documentId: string, status: any) {
  const { userId, organizationId, role } = await authenticateAndRedirect();
  if (!canAccessDocuments(role)) return { ok: false, error: "Non autorizzato" };
  await prisma.document.updateMany({ where: { id: documentId, organizationId }, data: { signatureStatus: status } });
  await createAuditLogEntry({ userId, organizationId, action: AuditAction.STATUS_CHANGE, entity: "document", entityId: documentId, metadata: { signatureStatus: status } });
  return { ok: true };
}

export async function deleteDocumentAction(documentId: string) {
  const { userId, organizationId, role } = await authenticateAndRedirect();
  if (!canAccessDocuments(role)) return { ok: false, error: "Non autorizzato" };
  await prisma.document.deleteMany({ where: { id: documentId, organizationId } });
  await createAuditLogEntry({ userId, organizationId, action: AuditAction.DELETE, entity: "document", entityId: documentId });
  return { ok: true };
}
