import { describe, expect, it } from "vitest";
import { resolveCvPath, resolveCvRef, validateCvForOrganization } from "@/utils/cvStorage";

const ORG_A = "org-a";
const SUPA = "https://xyz.supabase.co";

describe("resolveCvPath / resolveCvRef", () => {
  it("ricava il percorso da un vecchio URL pubblico", () => {
    expect(resolveCvPath(`${SUPA}/storage/v1/object/public/cvs/cvs/1700_Mario%20Rossi.pdf`)).toBe("cvs/1700_Mario Rossi.pdf");
  });
  it("accetta un percorso nuovo così com'è", () => {
    expect(resolveCvPath("org-a/abc.pdf")).toBe("org-a/abc.pdf");
  });
  it("riconosce il bucket candidates nei vecchi URL", () => {
    expect(resolveCvRef(`${SUPA}/storage/v1/object/public/candidates/cvs/x.pdf`)).toEqual({ kind: "storage", bucket: "candidates", path: "cvs/x.pdf" });
  });
  it("URL esterno: nessun percorso", () => {
    expect(resolveCvPath("https://example.com/cv.pdf")).toBeNull();
    expect(resolveCvRef("https://example.com/cv.pdf")).toEqual({ kind: "external", url: "https://example.com/cv.pdf" });
  });
  it("rifiuta percorsi con .. o assoluti", () => {
    expect(resolveCvPath("../org-b/x.pdf")).toBeNull();
    expect(resolveCvPath("/org-a/x.pdf")).toBeNull();
    expect(resolveCvPath("org-a//x.pdf")).toBeNull();
  });
  it("vuoto => null", () => {
    expect(resolveCvPath("")).toBeNull();
    expect(resolveCvPath(null)).toBeNull();
  });
});

describe("validateCvForOrganization", () => {
  it("accetta un percorso con il prefisso della propria organizzazione", () => {
    expect(validateCvForOrganization("org-a/abc.pdf", ORG_A)).toEqual({ ok: true, value: "org-a/abc.pdf" });
  });

  it("RIFIUTA il percorso di un'altra organizzazione", () => {
    expect(validateCvForOrganization("org-b/abc.pdf", ORG_A).ok).toBe(false);
  });

  it("RIFIUTA il vecchio URL pubblico di un file di un'altra organizzazione", () => {
    expect(validateCvForOrganization(`${SUPA}/storage/v1/object/public/cvs/org-b/abc.pdf`, ORG_A).ok).toBe(false);
  });

  it("RIFIUTA un file storico senza prefisso se non è già collegato a questo candidato", () => {
    expect(validateCvForOrganization("cvs/1700_legacy.pdf", ORG_A).ok).toBe(false);
  });

  it("accetta il file storico senza prefisso se coincide con quello già salvato", () => {
    const existing = `${SUPA}/storage/v1/object/public/cvs/cvs/1700_legacy.pdf`;
    expect(validateCvForOrganization("cvs/1700_legacy.pdf", ORG_A, { existingCvUrl: existing })).toEqual({ ok: true, value: "cvs/1700_legacy.pdf" });
    // il vecchio URL pubblico inviato dal form di modifica viene normalizzato al percorso
    expect(validateCvForOrganization(existing, ORG_A, { existingCvUrl: existing })).toEqual({ ok: true, value: "cvs/1700_legacy.pdf" });
  });

  it("non usa il file esistente di un altro candidato per aggirare il controllo", () => {
    expect(validateCvForOrganization("cvs/altro.pdf", ORG_A, { existingCvUrl: "cvs/1700_legacy.pdf" }).ok).toBe(false);
  });

  it("rifiuta un file in un bucket diverso da cvs anche con prefisso corretto", () => {
    expect(validateCvForOrganization(`${SUPA}/storage/v1/object/public/candidates/org-a/x.pdf`, ORG_A).ok).toBe(false);
  });

  it("URL esterno: rifiutato dai form, ammesso solo se esplicitamente consentito (webhook)", () => {
    expect(validateCvForOrganization("https://example.com/cv.pdf", ORG_A).ok).toBe(false);
    expect(validateCvForOrganization("https://example.com/cv.pdf", ORG_A, { allowExternal: true })).toEqual({ ok: true, value: "https://example.com/cv.pdf" });
  });

  it("valore vuoto => nessun CV", () => {
    expect(validateCvForOrganization("", ORG_A)).toEqual({ ok: true, value: undefined });
    expect(validateCvForOrganization(undefined, ORG_A)).toEqual({ ok: true, value: undefined });
  });
});
