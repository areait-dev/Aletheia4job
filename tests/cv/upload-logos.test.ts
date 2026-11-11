import { describe, expect, it, vi, beforeEach } from "vitest";

const upload = vi.fn();
const getAuthContext = vi.fn();
vi.mock("@/utils/supabase/service", () => ({
  createServiceClient: () => ({
    storage: {
      from: () => ({
        upload,
        getPublicUrl: (p: string) => ({ data: { publicUrl: `https://x.test/public/logos/${p}` } }),
      }),
    },
  }),
}));
vi.mock("@/utils/db", () => ({ dbUnscoped: { job: { findUnique: vi.fn() } } }));
vi.mock("@/utils/authz", () => ({ getAuthContext: (...a: unknown[]) => getAuthContext(...a) }));

import { POST } from "@/app/api/upload-cv/route";
import { detectImageType } from "@/utils/imageSignature";

const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]);
const PDF = Buffer.from("%PDF-1.4\n1 0 obj\n<<>>\nendobj\n");

function req(buf: Buffer, name: string, bucket = "logos") {
  const fd = new FormData();
  fd.append("file", new File([new Uint8Array(buf)], name));
  fd.append("bucket", bucket);
  return new Request("http://localhost/api/upload-cv", { method: "POST", body: fd });
}

describe("upload nel bucket pubblico logos", () => {
  beforeEach(() => {
    upload.mockReset();
    upload.mockResolvedValue({ data: { path: "ok" }, error: null });
    getAuthContext.mockReset();
  });

  it("senza sessione: 401 e nessun upload", async () => {
    getAuthContext.mockRejectedValue(new Error("no session"));
    const res = await POST(req(PNG, "logo.png"));
    expect(res.status).toBe(401);
    expect(upload).not.toHaveBeenCalled();
  });

  it("un PDF (CV) rinominato .png viene rifiutato", async () => {
    getAuthContext.mockResolvedValue({ organizationId: "org-1" });
    const res = await POST(req(PDF, "cv.png"));
    expect(res.status).toBe(400);
    expect(upload).not.toHaveBeenCalled();
  });

  it("un .pdf nel bucket logos viene rifiutato", async () => {
    getAuthContext.mockResolvedValue({ organizationId: "org-1" });
    const res = await POST(req(PDF, "cv.pdf"));
    expect(res.status).toBe(400);
    expect(upload).not.toHaveBeenCalled();
  });

  it("immagine con estensione diversa dal contenuto rifiutata", async () => {
    getAuthContext.mockResolvedValue({ organizationId: "org-1" });
    expect((await POST(req(PNG, "logo.jpg"))).status).toBe(400);
  });

  it("PNG valido da utente loggato: caricato sotto l'organizzazione con content-type corretto", async () => {
    getAuthContext.mockResolvedValue({ organizationId: "org-1" });
    const res = await POST(req(PNG, "logo.png"));
    expect(res.status).toBe(200);
    const [path, , opts] = upload.mock.calls[0];
    expect(path.startsWith("org-1/")).toBe(true);
    expect(opts.contentType).toBe("image/png");
  });

  it("SVG con script rifiutato", async () => {
    getAuthContext.mockResolvedValue({ organizationId: "org-1" });
    const svg = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>');
    expect((await POST(req(svg, "x.svg"))).status).toBe(400);
  });
});

describe("detectImageType", () => {
  it("riconosce le immagini e non i documenti", () => {
    expect(detectImageType(PNG)).toBe("png");
    expect(detectImageType(Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 0]))).toBe("jpeg");
    expect(detectImageType(PDF)).toBeNull();
    expect(detectImageType(Buffer.from([0x50, 0x4b, 0x03, 0x04, 0, 0, 0, 0, 0, 0, 0, 0]))).toBeNull(); // docx/zip
  });
});
