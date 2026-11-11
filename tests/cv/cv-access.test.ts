import { describe, expect, it, vi, beforeEach } from "vitest";

const prismaMock = vi.hoisted(() => ({
  candidate: { findFirst: vi.fn() },
}));

vi.mock("@/utils/db", () => ({ default: prismaMock, dbUnscoped: prismaMock }));
vi.mock("@/utils/authz", () => ({ getAuthContext: vi.fn() }));
vi.mock("@/utils/cvStorage", () => ({ createCvSignedUrl: vi.fn() }));

import { GET } from "@/app/api/candidates/[id]/cv/route";
import { getAuthContext } from "@/utils/authz";
import { createCvSignedUrl } from "@/utils/cvStorage";

const mockAuth = vi.mocked(getAuthContext);
const mockSign = vi.mocked(createCvSignedUrl);

const call = (id = "cand-1") => GET(new Request("http://localhost/api/candidates/x/cv"), { params: { id } });

describe("GET /api/candidates/[id]/cv", () => {
  beforeEach(() => vi.clearAllMocks());

  it("403 se non c'è una sessione", async () => {
    mockAuth.mockResolvedValue(null);
    const res = await call();
    expect(res.status).toBe(403);
    expect(prismaMock.candidate.findFirst).not.toHaveBeenCalled();
    expect(mockSign).not.toHaveBeenCalled();
  });

  it("403 se il candidato è di un'altra organizzazione (query filtrata per organizzazione dell'utente)", async () => {
    mockAuth.mockResolvedValue({ userId: "u-b", organizationId: "org-b", role: "ADMIN" } as never);
    prismaMock.candidate.findFirst.mockResolvedValue(null); // nessun risultato per org-b
    const res = await call("cand-di-org-a");
    expect(res.status).toBe(403);
    expect(prismaMock.candidate.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "cand-di-org-a", organizationId: "org-b" } }),
    );
    expect(mockSign).not.toHaveBeenCalled();
  });

  it("302 verso il link firmato se l'utente appartiene all'organizzazione", async () => {
    mockAuth.mockResolvedValue({ userId: "u-a", organizationId: "org-a", role: "ADMIN" } as never);
    prismaMock.candidate.findFirst.mockResolvedValue({ cvUrl: "org-a/abc.pdf" });
    mockSign.mockResolvedValue("https://xyz.supabase.co/storage/v1/object/sign/cvs/org-a/abc.pdf?token=t");
    const res = await call();
    expect(res.status).toBe(302);
    expect(res.headers.get("location")).toContain("/object/sign/cvs/org-a/abc.pdf");
    expect(res.headers.get("cache-control")).toBe("no-store");
  });

  it("404 se il candidato non ha CV", async () => {
    mockAuth.mockResolvedValue({ userId: "u-a", organizationId: "org-a", role: "ADMIN" } as never);
    prismaMock.candidate.findFirst.mockResolvedValue({ cvUrl: null });
    expect((await call()).status).toBe(404);
  });
});
