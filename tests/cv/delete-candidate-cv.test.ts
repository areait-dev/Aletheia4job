import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { MembershipRole } from "@prisma/client";

const events: string[] = [];
const remove = vi.hoisted(() => vi.fn());
const inngestSend = vi.hoisted(() => vi.fn());
const prismaMock = vi.hoisted(() => ({
  candidate: { findFirst: vi.fn(), deleteMany: vi.fn(), count: vi.fn() },
  $transaction: vi.fn(),
}));

vi.mock("@/utils/db", () => ({ default: prismaMock, dbUnscoped: prismaMock }));
vi.mock("@/utils/actions/shared", () => ({ authenticateAndRedirect: vi.fn() }));
vi.mock("@/utils/authz", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/utils/authz")>();
  return { ...actual, createAuditLogEntry: vi.fn() };
});
vi.mock("@/utils/supabase/service", () => ({
  createServiceClient: () => ({ storage: { from: () => ({ remove }) } }),
}));
vi.mock("@/inngest/client", () => ({ inngest: { send: inngestSend } }));

import { authenticateAndRedirect } from "@/utils/actions/shared";
import { createAuditLogEntry } from "@/utils/authz";
import { deleteCandidateAction } from "@/utils/actions/candidates";

const mockAuth = vi.mocked(authenticateAndRedirect);
const mockAudit = vi.mocked(createAuditLogEntry);

async function run() {
  const p = deleteCandidateAction("cand-1");
  await vi.runAllTimersAsync();
  return p;
}

describe("deleteCandidateAction: elimina anche il CV dallo Storage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    events.length = 0;
    mockAuth.mockResolvedValue({ userId: "user-1", organizationId: "org-1", role: MembershipRole.ADMIN } as never);
    prismaMock.$transaction.mockImplementation(async (cb: any) => {
      const r = await cb(prismaMock);
      events.push("tx-commit");
      return r;
    });
    prismaMock.candidate.findFirst.mockResolvedValue({ cvUrl: "org-1/a.pdf" });
    prismaMock.candidate.deleteMany.mockResolvedValue({ count: 1 });
    prismaMock.candidate.count.mockResolvedValue(0);
    remove.mockImplementation(async () => {
      events.push("remove");
      return { data: [], error: null };
    });
    inngestSend.mockResolvedValue(undefined);
  });
  afterEach(() => vi.useRealTimers());

  it("il file viene eliminato solo DOPO il commit della transazione, dal percorso del candidato", async () => {
    expect(await run()).toBe(true);
    expect(remove).toHaveBeenCalledWith(["org-1/a.pdf"]);
    expect(events).toEqual(["tx-commit", "remove"]);
    expect(mockAudit).toHaveBeenCalledTimes(1); // solo l'audit dell'eliminazione del candidato
    expect(inngestSend).not.toHaveBeenCalled();
  });

  it("candidato senza CV: nessuna chiamata allo Storage", async () => {
    prismaMock.candidate.findFirst.mockResolvedValue({ cvUrl: null });
    expect(await run()).toBe(true);
    expect(remove).not.toHaveBeenCalled();
  });

  it("candidato non trovato (o di un'altra organizzazione): niente file eliminato", async () => {
    prismaMock.candidate.findFirst.mockResolvedValue(null);
    prismaMock.candidate.deleteMany.mockResolvedValue({ count: 0 });
    expect(await run()).toBe(true);
    expect(remove).not.toHaveBeenCalled();
  });

  it("se la transazione fallisce il file NON viene toccato", async () => {
    prismaMock.$transaction.mockRejectedValue(new Error("db down"));
    expect(await run()).toBe(false);
    expect(remove).not.toHaveBeenCalled();
  });

  it("file condiviso con un altro candidato: non viene eliminato", async () => {
    prismaMock.candidate.count.mockResolvedValue(1);
    expect(await run()).toBe(true);
    expect(remove).not.toHaveBeenCalled();
  });

  it("URL esterno: nessuna chiamata allo Storage", async () => {
    prismaMock.candidate.findFirst.mockResolvedValue({ cvUrl: "https://example.com/cv.pdf" });
    expect(await run()).toBe(true);
    expect(remove).not.toHaveBeenCalled();
  });

  it("errore temporaneo: riprova e alla seconda riesce, senza registrare fallimenti", async () => {
    remove
      .mockResolvedValueOnce({ data: null, error: { message: "timeout" } })
      .mockResolvedValueOnce({ data: [], error: null });
    expect(await run()).toBe(true);
    expect(remove).toHaveBeenCalledTimes(2);
    expect(inngestSend).not.toHaveBeenCalled();
    expect(mockAudit).toHaveBeenCalledTimes(1);
  });

  it("errore permanente: 3 tentativi, fallimento registrato (audit) e nuovo tentativo chiesto a Inngest; il candidato resta eliminato", async () => {
    remove.mockResolvedValue({ data: null, error: { message: "storage down" } });
    expect(await run()).toBe(true);
    expect(remove).toHaveBeenCalledTimes(3);
    expect(mockAudit).toHaveBeenCalledTimes(2);
    expect(mockAudit.mock.calls[1][0]).toMatchObject({
      organizationId: "org-1",
      entity: "cv_file",
      entityId: "cand-1",
      metadata: { path: "org-1/a.pdf", status: "delete_failed", error: "storage down" },
    });
    expect(inngestSend).toHaveBeenCalledWith(
      expect.objectContaining({ name: "cv/file.delete.requested", data: expect.objectContaining({ cvUrl: "org-1/a.pdf" }) }),
    );
  });

  it("anche se Inngest non è raggiungibile il risultato per l'utente non cambia", async () => {
    remove.mockResolvedValue({ data: null, error: { message: "storage down" } });
    inngestSend.mockRejectedValue(new Error("inngest down"));
    expect(await run()).toBe(true);
  });
});
