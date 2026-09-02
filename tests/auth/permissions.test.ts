import { describe, expect, it } from "vitest";
import { MembershipRole } from "@prisma/client";
import {
  canWrite,
  canAccessDocuments,
  canManageOrg,
  canAccessAdmin,
  canApproveAbsence,
  canManageMembers,
} from "@/utils/permissions";

const ALL_ROLES = Object.values(MembershipRole);

function expectRoles(
  fn: (role: MembershipRole) => boolean,
  allowedRoles: MembershipRole[]
) {
  const allowed = new Set(allowedRoles);
  for (const role of ALL_ROLES) {
    expect(fn(role), `${fn.name}(${role})`).toBe(allowed.has(role));
  }
}

describe("permissions (RBAC)", () => {
  it("copre tutti i ruoli definiti nello schema Prisma", () => {
    // Guardia contro l'aggiunta di un nuovo MembershipRole senza aggiornare
    // questo test: se lo schema cambia, questo elenco va rivisto a mano.
    expect(ALL_ROLES.sort()).toEqual(
      ["ADMIN", "MANAGER", "OWNER", "RECRUITER", "VIEWER"].sort()
    );
  });

  it("canWrite: tutti i ruoli tranne VIEWER possono scrivere", () => {
    expectRoles(canWrite, [
      MembershipRole.OWNER,
      MembershipRole.ADMIN,
      MembershipRole.RECRUITER,
      MembershipRole.MANAGER,
    ]);
  });

  it("canAccessDocuments: solo OWNER, ADMIN, MANAGER", () => {
    expectRoles(canAccessDocuments, [
      MembershipRole.OWNER,
      MembershipRole.ADMIN,
      MembershipRole.MANAGER,
    ]);
  });

  it("canManageOrg: solo OWNER, ADMIN", () => {
    expectRoles(canManageOrg, [MembershipRole.OWNER, MembershipRole.ADMIN]);
  });

  it("canAccessAdmin: solo OWNER, ADMIN", () => {
    expectRoles(canAccessAdmin, [MembershipRole.OWNER, MembershipRole.ADMIN]);
  });

  it("canApproveAbsence: solo OWNER, ADMIN, MANAGER", () => {
    expectRoles(canApproveAbsence, [
      MembershipRole.OWNER,
      MembershipRole.ADMIN,
      MembershipRole.MANAGER,
    ]);
  });

  it("canManageMembers: solo OWNER, ADMIN", () => {
    expectRoles(canManageMembers, [MembershipRole.OWNER, MembershipRole.ADMIN]);
  });

  it("VIEWER non ha accesso a nessuna funzionalità privilegiata", () => {
    expect(canWrite(MembershipRole.VIEWER)).toBe(false);
    expect(canAccessDocuments(MembershipRole.VIEWER)).toBe(false);
    expect(canManageOrg(MembershipRole.VIEWER)).toBe(false);
    expect(canAccessAdmin(MembershipRole.VIEWER)).toBe(false);
    expect(canApproveAbsence(MembershipRole.VIEWER)).toBe(false);
    expect(canManageMembers(MembershipRole.VIEWER)).toBe(false);
  });

  it("OWNER ha sempre accesso completo", () => {
    expect(canWrite(MembershipRole.OWNER)).toBe(true);
    expect(canAccessDocuments(MembershipRole.OWNER)).toBe(true);
    expect(canManageOrg(MembershipRole.OWNER)).toBe(true);
    expect(canAccessAdmin(MembershipRole.OWNER)).toBe(true);
    expect(canApproveAbsence(MembershipRole.OWNER)).toBe(true);
    expect(canManageMembers(MembershipRole.OWNER)).toBe(true);
  });
});
