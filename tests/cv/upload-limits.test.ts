import { describe, expect, it, vi, beforeEach } from "vitest";

const upload = vi.fn();
vi.mock("@/utils/supabase/service", () => ({
  createServiceClient: () => ({ storage: { from: () => ({ upload }) } }),
}));
vi.mock("@/utils/db", () => ({ dbUnscoped: { job: { findUnique: vi.fn() } } }));
vi.mock("@/utils/authz", () => ({ getAuthContext: vi.fn().mockResolvedValue({ organizationId: "org-1" }) }));

import { POST } from "@/app/api/upload-cv/route";
import { MAX_UPLOAD_BYTES, fileTooLargeMessage, isFileTooLarge } from "@/utils/uploadLimits";
import { uploadCV } from "@/utils/supabase";

function req(size: number, name = "cv.pdf") {
  const fd = new FormData();
  fd.append("file", new File([new Uint8Array(size)], name));
  fd.append("bucket", "cvs");
  return new Request("http://localhost/api/upload-cv", { method: "POST", body: fd });
}

describe("limite di upload a 4 MB", () => {
  beforeEach(() => {
    upload.mockReset();
    upload.mockResolvedValue({ data: { path: "org-1/x.pdf" }, error: null });
  });

  it("il limite è 4 MB", () => {
    expect(MAX_UPLOAD_BYTES).toBe(4 * 1024 * 1024);
    expect(isFileTooLarge(MAX_UPLOAD_BYTES)).toBe(false);
    expect(isFileTooLarge(MAX_UPLOAD_BYTES + 1)).toBe(true);
  });

  it("messaggio chiaro con dimensione e limite", () => {
    const m = fileTooLargeMessage(4.7 * 1024 * 1024, "CV");
    expect(m).toMatch(/CV è troppo grande/);
    expect(m).toMatch(/4,7 MB/);
    expect(m).toMatch(/limite è 4 MB/);
  });

  it("server: 4 MB esatti passano", async () => {
    const res = await POST(req(MAX_UPLOAD_BYTES));
    expect(res.status).toBe(200);
    expect(upload).toHaveBeenCalledTimes(1);
  });

  it("server: oltre 4 MB -> 413 con messaggio per il candidato, nessun upload", async () => {
    const res = await POST(req(MAX_UPLOAD_BYTES + 1));
    expect(res.status).toBe(413);
    const body = await res.json();
    expect(body.error).toMatch(/troppo grande/);
    expect(body.error).toMatch(/4 MB/);
    expect(upload).not.toHaveBeenCalled();
  });

  it("browser: uploadCV rifiuta un file grande senza nemmeno inviarlo", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const big = new File([new Uint8Array(MAX_UPLOAD_BYTES + 10)], "grande.pdf");
    const r = await uploadCV(big, { bucket: "cvs" });
    expect(r.url).toBeNull();
    expect(r.error).toMatch(/troppo grande/);
    expect(fetchMock).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
  });

  it("browser: un 413 della piattaforma (corpo non JSON) diventa lo stesso messaggio", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("Request Entity Too Large", { status: 413 })));
    const r = await uploadCV(new File([new Uint8Array(1000)], "cv.pdf"), { bucket: "cvs" });
    expect(r.url).toBeNull();
    expect(r.error).toMatch(/troppo grande/);
    vi.unstubAllGlobals();
  });
});
