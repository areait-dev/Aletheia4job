import { describe, expect, it, vi, beforeEach } from "vitest";
import { MembershipRole } from "@prisma/client";

// Mock del client Prisma: nessuna delle Server Action sotto test deve
// raggiungerlo quando il ruolo non è autorizzato. Le funzioni non usate dal
// test restano comunque presenti per non rompere l'import statico dei moduli.
// `vi.hoisted` perché i factory di `vi.mock` sotto vengono issati in cima al
// file: un `const` normale qui sarebbe ancora in temporal dead zone.
const prismaMock = vi.hoisted(() => ({
  candidate: {
    updateMany: vi.fn(),
    findFirst: vi.fn(),
    deleteMany: vi.fn(),
    create: vi.fn(),
  },
  job: {
    create: vi.fn(),
    updateMany: vi.fn(),
    findFirst: vi.fn(),
    delete: vi.fn(),
  },
  $transaction: vi.fn(),
}));

vi.mock("@/utils/db", () => ({
  default: prismaMock,
  dbUnscoped: prismaMock,
}));

vi.mock("@/utils/actions/shared", () => ({
  authenticateAndRedirect: vi.fn(),
}));

vi.mock("@/utils/authz", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/utils/authz")>();
  return {
    ...actual,
    createAuditLogEntry: vi.fn(),
  };
});

import { authenticateAndRedirect } from "@/utils/actions/shared";
import { createAuditLogEntry } from "@/utils/authz";
import { updateCandidateStatusAction, deleteCandidateAction } from "@/utils/actions/candidates";
import { createJobAction } from "@/utils/actions/jobs";

const mockAuth = vi.mocked(authenticateAndRedirect);
const mockAuditLog = vi.mocked(createAuditLogEntry);

const BASE_AUTH = { userId: "user-1", organizationId: "org-1" };

function authAs(role: MembershipRole) {
  mockAuth.mockResolvedValue({ ...BASE_AUTH, role });
}

beforeEach(() => {
  vi.clearAllMocks();
  prismaMock.$transaction.mockImplementation(async (cb: any) => cb(prismaMock));
});

describe("RBAC enforcement sulle Server Action di scrittura", () => {
  describe("updateCandidateStatusAction (candidates.ts)", () => {
    it("VIEWER: bloccata, nessuna scrittura su DB o audit log", async () => {
      authAs(MembershipRole.VIEWER);

      const result = await updateCandidateStatusAction("candidate-1", "Colloquiato");

      expect(result).toBeNull();
      expect(prismaMock.$transaction).not.toHaveBeenCalled();
      expect(prismaMock.candidate.updateMany).not.toHaveBeenCalled();
      expect(mockAuditLog).not.toHaveBeenCalled();
    });

    it("MANAGER: consentita, scrive lo status e l'audit log nella stessa transazione", async () => {
      authAs(MembershipRole.MANAGER);
      prismaMock.candidate.updateMany.mockResolvedValue({ count: 1 });
      prismaMock.candidate.findFirst.mockResolvedValue({ id: "candidate-1", status: "Colloquiato" });

      const result = await updateCandidateStatusAction("candidate-1", "Colloquiato");

      expect(result).toEqual({ id: "candidate-1", status: "Colloquiato" });
      expect(prismaMock.$transaction).toHaveBeenCalledTimes(1);
      expect(prismaMock.candidate.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: "candidate-1", organizationId: "org-1" } })
      );
      expect(mockAuditLog).toHaveBeenCalledTimes(1);
    });
  });

  describe("deleteCandidateAction (candidates.ts)", () => {
    it("VIEWER: bloccata, nessuna scrittura su DB o audit log", async () => {
      authAs(MembershipRole.VIEWER);

      const result = await deleteCandidateAction("candidate-1");

      expect(result).toBe(false);
      expect(prismaMock.$transaction).not.toHaveBeenCalled();
      expect(prismaMock.candidate.deleteMany).not.toHaveBeenCalled();
      expect(mockAuditLog).not.toHaveBeenCalled();
    });

    it("RECRUITER: consentita, elimina e scrive l'audit log", async () => {
      authAs(MembershipRole.RECRUITER);
      prismaMock.candidate.deleteMany.mockResolvedValue({ count: 1 });

      const result = await deleteCandidateAction("candidate-1");

      expect(result).toBe(true);
      expect(prismaMock.candidate.deleteMany).toHaveBeenCalledWith({
        where: { id: "candidate-1", organizationId: "org-1" },
      });
      expect(mockAuditLog).toHaveBeenCalledTimes(1);
    });
  });

  describe("createJobAction (jobs.ts)", () => {
    it("VIEWER: bloccata, nessuna scrittura su DB o audit log", async () => {
      authAs(MembershipRole.VIEWER);

      const result = await createJobAction({
        title: "Dev",
        company: "Acme",
        location: "Roma",
        description: "descrizione lunga almeno 10 caratteri",
        requirements: "requisiti lunghi almeno 10 caratteri",
        responsibilities: "responsabilita lunghe almeno 10 caratteri",
        benefits: "benefit lunghi almeno 10 caratteri",
        sector: "IT",
        status: "Aperto" as any,
        mode: "Full-time" as any,
        postToCareerPage: true,
        postToLinkedIn: false,
        postToIndeed: false,
        postToJooble: false,
      });

      expect(result).toBeNull();
      expect(prismaMock.$transaction).not.toHaveBeenCalled();
      expect(prismaMock.job.create).not.toHaveBeenCalled();
      expect(mockAuditLog).not.toHaveBeenCalled();
    });

    it("OWNER: consentita, crea il job e scrive l'audit log", async () => {
      authAs(MembershipRole.OWNER);
      prismaMock.job.create.mockResolvedValue({
        id: "job-1",
        status: "Aperto",
        mode: "Full-time",
      });

      const result = await createJobAction({
        title: "Dev",
        company: "Acme",
        location: "Roma",
        description: "descrizione lunga almeno 10 caratteri",
        requirements: "requisiti lunghi almeno 10 caratteri",
        responsibilities: "responsabilita lunghe almeno 10 caratteri",
        benefits: "benefit lunghi almeno 10 caratteri",
        sector: "IT",
        status: "Aperto" as any,
        mode: "Full-time" as any,
        postToCareerPage: true,
        postToLinkedIn: false,
        postToIndeed: false,
        postToJooble: false,
      });

      expect(result).not.toBeNull();
      expect(prismaMock.job.create).toHaveBeenCalledTimes(1);
      expect(mockAuditLog).toHaveBeenCalledTimes(1);
    });
  });
});
