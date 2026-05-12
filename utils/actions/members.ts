"use server";

import prisma from "@/utils/db";
import { AuditAction, MembershipRole, MembershipInviteStatus } from "@prisma/client";
import { canManageMembers, createAuditLogEntry, getCurrentUserPrimaryEmail, getAuthContext } from "@/utils/authz";
import { authenticateAndRedirect } from "./shared";

export async function getCurrentOrganizationContextAction() {
  const { userId, organizationId, role } = await authenticateAndRedirect();
  const organization = await prisma.organization.findUnique({ where: { id: organizationId } });
  return { userId, organizationId, role, organizationName: organization?.name ?? "Organization" };
}

export async function getTenantMembersAction() {
  const { organizationId } = await authenticateAndRedirect();
  return prisma.membership.findMany({ where: { organizationId }, orderBy: [{ role: "asc" }, { createdAt: "asc" }] });
}

export async function updateMemberRoleAction(membershipId: string, newRole: MembershipRole) {
  const { userId, organizationId, role } = await authenticateAndRedirect();
  if (!canManageMembers(role)) return { ok: false, error: "Non autorizzato" };

  const membership = await prisma.membership.findFirst({ where: { id: membershipId, organizationId } });
  if (!membership) return { ok: false, error: "Membro non trovato" };
  if (membership.userId === userId && role === MembershipRole.OWNER && newRole !== MembershipRole.OWNER) return { ok: false, error: "Owner non può fare downgrade" };
  if (membership.role === MembershipRole.OWNER && role !== MembershipRole.OWNER) return { ok: false, error: "Solo un owner può modificare un owner" };

  await prisma.membership.update({ where: { id: membershipId }, data: { role: newRole } });
  await createAuditLogEntry({ userId, organizationId, action: AuditAction.UPDATE, entity: "membership", entityId: membershipId, metadata: { newRole } });
  return { ok: true };
}

export async function createMemberInviteAction(email: string, inviteRole: MembershipRole) {
  const { userId, organizationId, role } = await authenticateAndRedirect();
  if (!canManageMembers(role)) return { ok: false, error: "Non autorizzato" };

  const normalizedEmail = email.trim().toLowerCase();
  const token = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 7);

  try {
    const invite = await prisma.membershipInvite.create({ data: { organizationId, email: normalizedEmail, role: inviteRole, invitedByUserId: userId, token, expiresAt } });
    await createAuditLogEntry({ userId, organizationId, action: AuditAction.CREATE, entity: "membership_invite", entityId: invite.id, metadata: { email: normalizedEmail, role: inviteRole } });
    return { ok: true, invite };
  } catch (error) { return { ok: false, error: "Errore creazione invito" }; }
}

export async function getPendingInvitesAction() {
  const { organizationId } = await authenticateAndRedirect();
  return prisma.membershipInvite.findMany({ where: { organizationId, status: MembershipInviteStatus.PENDING }, orderBy: { createdAt: "desc" } });
}

export async function revokeMemberInviteAction(inviteId: string) {
  const { userId, organizationId, role } = await authenticateAndRedirect();
  if (!canManageMembers(role)) return { ok: false, error: "Non autorizzato" };
  await prisma.membershipInvite.updateMany({ where: { id: inviteId, organizationId }, data: { status: MembershipInviteStatus.REVOKED } });
  return { ok: true };
}

export async function resendMemberInviteAction(inviteId: string) {
  const { userId, organizationId, role } = await authenticateAndRedirect();
  if (!canManageMembers(role)) return { ok: false, error: "Non autorizzato" };

  const invite = await prisma.membershipInvite.findFirst({ where: { id: inviteId, organizationId } });
  if (!invite) return { ok: false, error: "Invito non trovato" };

  // In un sistema reale invieremmo un'email qui. 
  // Per ora aggiorniamo solo la data di scadenza e il token.
  const newToken = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 7);

  await prisma.membershipInvite.update({
    where: { id: inviteId },
    data: { token: newToken, expiresAt, status: MembershipInviteStatus.PENDING }
  });

  await createAuditLogEntry({ userId, organizationId, action: AuditAction.UPDATE, entity: "membership_invite", entityId: inviteId, metadata: { action: "resend" } });
  return { ok: true };
}

export async function acceptMemberInviteAction(token: string) {
  const auth = await getAuthContext();
  if (!auth) return { ok: false, error: "Login richiesto" };
  const email = await getCurrentUserPrimaryEmail();
  const invite = await prisma.membershipInvite.findFirst({ where: { token, status: MembershipInviteStatus.PENDING } });
  if (!invite) return { ok: false, error: "Invito non valido" };
  if (invite.email.toLowerCase() !== email) return { ok: false, error: "Email non corrispondente" };

  await prisma.$transaction(async (tx) => {
    await tx.membership.upsert({
      where: { userId_organizationId: { userId: auth.userId, organizationId: invite.organizationId } },
      update: { role: invite.role },
      create: { userId: auth.userId, organizationId: invite.organizationId, role: invite.role }
    });
    await tx.membershipInvite.update({ where: { id: invite.id }, data: { status: MembershipInviteStatus.ACCEPTED } });
  });

  return { ok: true };
}

export async function getAuditLogsAction(params?: { limit?: number; entity?: string; action?: AuditAction; fromDate?: string; toDate?: string; }) {
  const { organizationId, role } = await authenticateAndRedirect();
  if (!canManageMembers(role)) return [];
  const where: any = { organizationId };
  if (params?.entity) where.entity = { equals: params.entity, mode: "insensitive" };
  if (params?.action) where.action = params.action;
  return prisma.auditLog.findMany({ where, orderBy: { createdAt: "desc" }, take: params?.limit ?? 50 });
}
