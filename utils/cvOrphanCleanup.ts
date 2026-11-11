import { resolveCvPath } from "@/utils/cvStorage";

/**
 * Pulizia dei caricamenti abbandonati nel bucket `cvs`: file non collegati a nessun candidato
 * e più vecchi di 48 ore (il form carica il CV appena lo si seleziona, prima dell'invio).
 * Logica pura + dipendenze iniettate: testabile senza Storage né database.
 */
export const ORPHAN_MIN_AGE_MS = 48 * 60 * 60 * 1000;
// Non sono CV: immagini degli annunci rimaste in `cvs`, segnaposto delle cartelle.
const EXCLUDED_PREFIXES = ["job-images/"];
const EXCLUDED_NAMES = [".emptyFolderPlaceholder", ".keep"];

export type OrphanMode = "off" | "dry" | "delete";

export function parseOrphanMode(value: string | undefined): OrphanMode {
  const v = (value ?? "dry").trim().toLowerCase();
  return v === "delete" || v === "off" ? v : "dry"; // ciò che non è esplicito resta in simulazione
}

export function selectAbandonedCvFiles(
  objects: { path: string; createdAt: string | null }[],
  referencedCvUrls: string[],
  now: Date,
  minAgeMs = ORPHAN_MIN_AGE_MS,
): string[] {
  const referenced = new Set<string>();
  for (const u of referencedCvUrls) {
    const p = resolveCvPath(u);
    if (p) referenced.add(p);
  }
  return objects
    .filter((o) => {
      if (referenced.has(o.path)) return false;
      if (EXCLUDED_PREFIXES.some((x) => o.path.startsWith(x))) return false;
      if (EXCLUDED_NAMES.some((n) => o.path.endsWith(n))) return false;
      if (!o.createdAt) return false; // età sconosciuta: non si tocca
      const created = Date.parse(o.createdAt);
      if (Number.isNaN(created)) return false;
      return now.getTime() - created >= minAgeMs;
    })
    .map((o) => o.path);
}

export type OrphanCleanupDeps = {
  listObjects: () => Promise<{ path: string; createdAt: string | null }[]>;
  listReferencedCvUrls: () => Promise<string[]>;
  removePaths: (paths: string[]) => Promise<{ error?: string }>;
};

export type OrphanCleanupResult = {
  mode: OrphanMode;
  totalFiles: number;
  referenced: number;
  abandoned: string[];
  deleted: number;
  aborted?: string;
};

export async function runOrphanCleanup(
  mode: OrphanMode,
  deps: OrphanCleanupDeps,
  now = new Date(),
): Promise<OrphanCleanupResult> {
  if (mode === "off") return { mode, totalFiles: 0, referenced: 0, abandoned: [], deleted: 0 };

  const [objects, referencedUrls] = await Promise.all([deps.listObjects(), deps.listReferencedCvUrls()]);
  const abandoned = selectAbandonedCvFiles(objects, referencedUrls, now);
  const base = { mode, totalFiles: objects.length, referenced: referencedUrls.length, abandoned, deleted: 0 };

  // Protezioni contro un elenco dei riferimenti sbagliato (database non raggiunto, query vuota...).
  if (referencedUrls.length === 0 && objects.length > 10) {
    return { ...base, aborted: "nessun CV collegato nel database: possibile errore, nessuna cancellazione" };
  }
  const cap = Math.max(20, Math.floor(objects.length * 0.25));
  if (abandoned.length > cap) {
    return { ...base, aborted: `troppi file da eliminare in un giro (${abandoned.length} > ${cap}): controllo manuale` };
  }

  if (mode === "dry") return base;

  let deleted = 0;
  for (let i = 0; i < abandoned.length; i += 50) {
    const batch = abandoned.slice(i, i + 50);
    const { error } = await deps.removePaths(batch);
    if (error) return { ...base, deleted, aborted: `eliminazione fallita: ${error}` };
    deleted += batch.length;
  }
  return { ...base, deleted };
}
