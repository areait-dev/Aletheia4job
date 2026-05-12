import { MembershipRole } from "@prisma/client";

export function canWrite(role: MembershipRole): boolean {
  return role !== MembershipRole.VIEWER;
}

export function canAccessDocuments(role: MembershipRole): boolean {
  return role === MembershipRole.OWNER || role === MembershipRole.ADMIN || role === MembershipRole.MANAGER;
}

export function canManageOrg(role: MembershipRole): boolean {
  return role === MembershipRole.OWNER || role === MembershipRole.ADMIN;
}

export function canAccessAdmin(role: MembershipRole): boolean {
  return role === MembershipRole.OWNER || role === MembershipRole.ADMIN;
}

export function canApproveAbsence(role: MembershipRole): boolean {
  return role === MembershipRole.OWNER || role === MembershipRole.ADMIN || role === MembershipRole.MANAGER;
}

export function canManageMembers(role: MembershipRole): boolean {
  return role === MembershipRole.OWNER || role === MembershipRole.ADMIN;
}
