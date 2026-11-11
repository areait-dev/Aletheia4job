import { describe, expect, it, vi } from "vitest";

vi.mock("@/utils/supabase/service", () => ({ createServiceClient: vi.fn() }));

import { parseOrphanMode, runOrphanCleanup, selectAbandonedCvFiles, ORPHAN_MIN_AGE_MS } from "@/utils/cvOrphanCleanup";

const NOW = new Date("2026-11-12T12:00:00Z");
const hoursAgo = (h: number) => new Date(NOW.getTime() - h * 3600e3).toISOString();

describe("selectAbandonedCvFiles", () => {
  const objs = [
    { path: "org-1/vecchio-orfano.pdf", createdAt: hoursAgo(72) },
    { path: "org-1/recente-orfano.pdf", createdAt: hoursAgo(10) },
    { path: "org-1/collegato.pdf", createdAt: hoursAgo(500) },
    { path: "org-1/collegato-vecchio-url.pdf", createdAt: hoursAgo(500) },
    { path: "job-images/img.jpg", createdAt: hoursAgo(500) },
    { path: "org-1/.emptyFolderPlaceholder", createdAt: hoursAgo(500) },
    { path: "org-1/senza-data.pdf", createdAt: null },
    { path: "org-1/appena-48h.pdf", createdAt: hoursAgo(48) },
  ];
  const referenced = [
    "org-1/collegato.pdf",
    "https://x.supabase.co/storage/v1/object/public/cvs/org-1/collegato-vecchio-url.pdf",
    "https://esterno.example/cv.pdf",
  ];

  it("seleziona solo i file non collegati e più vecchi di 48 ore", () => {
    expect(selectAbandonedCvFiles(objs, referenced, NOW)).toEqual(["org-1/vecchio-orfano.pdf", "org-1/appena-48h.pdf"]);
  });
  it("non tocca file recenti, collegati (anche con vecchio URL pubblico), immagini degli annunci, segnaposto e file senza data", () => {
    const sel = selectAbandonedCvFiles(objs, referenced, NOW);
    for (const p of ["org-1/recente-orfano.pdf", "org-1/collegato.pdf", "org-1/collegato-vecchio-url.pdf", "job-images/img.jpg", "org-1/.emptyFolderPlaceholder", "org-1/senza-data.pdf"]) {
      expect(sel).not.toContain(p);
    }
  });
  it("la soglia è 48 ore", () => {
    expect(ORPHAN_MIN_AGE_MS).toBe(48 * 3600e3);
  });
});

describe("parseOrphanMode", () => {
  it("default e valori non riconosciuti = simulazione; la cancellazione solo se esplicita", () => {
    expect(parseOrphanMode(undefined)).toBe("dry");
    expect(parseOrphanMode("")).toBe("dry");
    expect(parseOrphanMode("true")).toBe("dry");
    expect(parseOrphanMode("DELETE")).toBe("delete");
    expect(parseOrphanMode("off")).toBe("off");
  });
});

describe("runOrphanCleanup", () => {
  const files = Array.from({ length: 30 }, (_, i) => ({ path: `org-1/f${i}.pdf`, createdAt: hoursAgo(100) }));
  const mk = (over: Partial<Parameters<typeof runOrphanCleanup>[1]> = {}) => {
    const removePaths = vi.fn().mockResolvedValue({});
    return {
      removePaths,
      deps: {
        listObjects: async () => files,
        listReferencedCvUrls: async () => files.slice(2).map((f) => f.path), // 2 orfani
        removePaths,
        ...over,
      },
    };
  };

  it("simulazione: elenca ma non elimina nulla", async () => {
    const { deps, removePaths } = mk();
    const r = await runOrphanCleanup("dry", deps, NOW);
    expect(r.abandoned).toEqual(["org-1/f0.pdf", "org-1/f1.pdf"]);
    expect(r.deleted).toBe(0);
    expect(removePaths).not.toHaveBeenCalled();
  });

  it("off: non fa nulla, nemmeno l'elenco", async () => {
    const list = vi.fn();
    const r = await runOrphanCleanup("off", { listObjects: list, listReferencedCvUrls: list, removePaths: list }, NOW);
    expect(r.abandoned).toEqual([]);
    expect(list).not.toHaveBeenCalled();
  });

  it("delete: elimina solo gli orfani", async () => {
    const { deps, removePaths } = mk();
    const r = await runOrphanCleanup("delete", deps, NOW);
    expect(r.deleted).toBe(2);
    expect(removePaths).toHaveBeenCalledWith(["org-1/f0.pdf", "org-1/f1.pdf"]);
  });

  it("protezione: se il database non restituisce alcun riferimento NON elimina (anche in modalità delete)", async () => {
    const { deps, removePaths } = mk({ listReferencedCvUrls: async () => [] });
    const r = await runOrphanCleanup("delete", deps, NOW);
    expect(r.aborted).toMatch(/nessun CV collegato/);
    expect(removePaths).not.toHaveBeenCalled();
  });

  it("protezione: troppi file da eliminare in un giro => interrotto", async () => {
    const many = Array.from({ length: 100 }, (_, i) => ({ path: `org-1/g${i}.pdf`, createdAt: hoursAgo(100) }));
    const removePaths = vi.fn();
    const r = await runOrphanCleanup(
      "delete",
      { listObjects: async () => many, listReferencedCvUrls: async () => ["org-1/g0.pdf"], removePaths },
      NOW,
    );
    expect(r.aborted).toMatch(/troppi file/);
    expect(removePaths).not.toHaveBeenCalled();
  });

  it("se la rimozione fallisce si ferma e lo segnala", async () => {
    const { deps } = mk({ removePaths: vi.fn().mockResolvedValue({ error: "boom" }) });
    const r = await runOrphanCleanup("delete", deps, NOW);
    expect(r.aborted).toMatch(/boom/);
    expect(r.deleted).toBe(0);
  });
});
