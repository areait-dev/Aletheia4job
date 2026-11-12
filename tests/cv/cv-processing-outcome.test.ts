import { describe, expect, it, vi } from "vitest";
import { CvUnreadableError } from "@/lib/cvErrors";
import { extractTextFromCV } from "@/lib/cvParser";
import {
  CV_PROCESSING_GENERIC_FAILURE,
  CV_UNREADABLE_MESSAGE,
  extractCvTextOutcome,
  handleProcessCvFailure,
  markApplicationFailed,
} from "@/lib/cvProcessingOutcome";

const buf = Buffer.from("contenuto");

describe("extractCvTextOutcome: CV illeggibile = errore definitivo, nessun ritentativo", () => {
  it("PDF illeggibile (reale, 'bad XRef'): esito { ok: false } senza lanciare", async () => {
    const broken = Buffer.from("%PDF-1.4\n1 0 obj\n<< /Type /Catalog >>\nxref\n0 1\nbad entry\ntrailer\n<< /Root 1 0 R >>\nstartxref\n999999\n%%EOF");
    const res = await extractCvTextOutcome(async () => broken, "application/pdf", extractTextFromCV);
    expect(res).toEqual({ ok: false, reason: "unreadable" });
  });

  it("file vuoto e formato non supportato: ok:false", async () => {
    expect(await extractCvTextOutcome(async () => Buffer.alloc(0), undefined, extractTextFromCV)).toEqual({ ok: false, reason: "unreadable" });
    expect(await extractCvTextOutcome(async () => Buffer.from("MZ\x90\x00 non un cv"), undefined, extractTextFromCV)).toEqual({ ok: false, reason: "unreadable" });
  });

  it("CvUnreadableError dall'estrazione: ok:false, il passo non fallisce (quindi Inngest non lo ritenta)", async () => {
    const extract = vi.fn().mockRejectedValue(new CvUnreadableError("Impossibile leggere il contenuto del CV."));
    await expect(extractCvTextOutcome(async () => buf, "application/pdf", extract)).resolves.toEqual({ ok: false, reason: "unreadable" });
    expect(extract).toHaveBeenCalledTimes(1);
  });

  it("CV leggibile: ok:true con il testo", async () => {
    const extract = vi.fn().mockResolvedValue("Mario Rossi");
    await expect(extractCvTextOutcome(async () => buf, "application/pdf", extract)).resolves.toEqual({ ok: true, text: "Mario Rossi" });
  });
});

describe("extractCvTextOutcome: errori temporanei restano ritentabili", () => {
  it("errore dello Storage: si propaga (Inngest ritenta), l'estrazione non parte", async () => {
    const storageDown = new Error("Download CV da Supabase fallito: timeout");
    const extract = vi.fn();
    await expect(extractCvTextOutcome(async () => { throw storageDown; }, "application/pdf", extract)).rejects.toBe(storageDown);
    expect(extract).not.toHaveBeenCalled();
  });

  it("errore inatteso dell'estrazione (non CvUnreadableError): si propaga", async () => {
    const boom = new Error("memoria esaurita");
    await expect(extractCvTextOutcome(async () => buf, "application/pdf", vi.fn().mockRejectedValue(boom))).rejects.toBe(boom);
  });
});

function fakeDb(count = 1) {
  const updateMany = vi.fn().mockResolvedValue({ count });
  return { db: { application: { updateMany } }, updateMany };
}

describe("markApplicationFailed", () => {
  it("imposta FAILED con il motivo, solo se ancora PENDING o PROCESSING e nella stessa organizzazione", async () => {
    const { db, updateMany } = fakeDb();
    const n = await markApplicationFailed(db, { applicationId: "app-1", organizationId: "org-1", message: CV_UNREADABLE_MESSAGE });
    expect(n).toBe(1);
    expect(updateMany).toHaveBeenCalledWith({
      where: { id: "app-1", organizationId: "org-1", parsingStatus: { in: ["PENDING", "PROCESSING"] } },
      data: { parsingStatus: "FAILED", parsingError: CV_UNREADABLE_MESSAGE },
    });
  });

  it("il messaggio di CV illeggibile suggerisce di ricaricare in PDF", () => {
    expect(CV_UNREADABLE_MESSAGE).toBe(
      "Impossibile leggere il CV: il file potrebbe essere danneggiato o in un formato non supportato. Prova a ricaricarlo in PDF.",
    );
  });
});

describe("handleProcessCvFailure (onFailure): rete di sicurezza", () => {
  const failure = (data: Record<string, unknown>) => ({
    event: { data: { run_id: "run-1", event: { data } } },
    error: new Error("extract-cv-text: Download CV da Supabase fallito"),
  });

  it("run fallito dopo tutti i tentativi: l'application va in FAILED con un parsingError generico", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const { db, updateMany } = fakeDb();
    const n = await handleProcessCvFailure(db, failure({ applicationId: "app-1", organizationId: "org-1" }));
    expect(n).toBe(1);
    expect(updateMany).toHaveBeenCalledWith({
      where: { id: "app-1", organizationId: "org-1", parsingStatus: { in: ["PENDING", "PROCESSING"] } },
      data: { parsingStatus: "FAILED", parsingError: CV_PROCESSING_GENERIC_FAILURE },
    });
    expect(CV_PROCESSING_GENERIC_FAILURE).toMatch(/rilanciarla dalla scheda del candidato/);
    spy.mockRestore();
  });

  it("evento senza id: nessuna scrittura e nessun errore", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const { db, updateMany } = fakeDb();
    await expect(handleProcessCvFailure(db, failure({}))).resolves.toBe(0);
    expect(updateMany).not.toHaveBeenCalled();
    spy.mockRestore();
  });

  it("application già COMPLETED o FAILED: il filtro non la tocca (count 0)", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const { db } = fakeDb(0);
    await expect(handleProcessCvFailure(db, failure({ applicationId: "app-1", organizationId: "org-1" }))).resolves.toBe(0);
    spy.mockRestore();
  });
});
