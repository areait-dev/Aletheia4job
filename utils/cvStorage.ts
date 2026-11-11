import { createServiceClient } from "@/utils/supabase/service";

/**
 * Gestione dei CV nello Storage Supabase.
 *
 * `Candidate.cvUrl` contiene il PERCORSO del file nel bucket `cvs` (es.
 * "<organizationId>/abc123.pdf"). Per compatibilità accettiamo anche i vecchi
 * URL pubblici (".../storage/v1/object/public/<bucket>/<path>") e URL esterni
 * (CV ospitati altrove, es. dal webhook di multiposting).
 * Funziona identicamente con bucket pubblico o privato: i file si leggono sempre
 * con la chiave di servizio o con un link firmato di breve durata.
 */

export const CV_BUCKET = "cvs";
export const CV_SIGNED_URL_TTL_SECONDS = 5 * 60;

export type CvRef =
  | { kind: "storage"; bucket: string; path: string }
  | { kind: "external"; url: string };

const STORAGE_URL_RE = /\/storage\/v1\/object\/(?:public|sign|authenticated)\/([^/]+)\/(.+)$/;

function isSafePath(path: string) {
  return path.length > 0 && !path.startsWith("/") && !path.split("/").some((seg) => seg === ".." || seg === "");
}

/** Interpreta il valore di cvUrl (percorso, vecchio URL pubblico o URL esterno). */
export function resolveCvRef(cvUrl: string | null | undefined): CvRef | null {
  const raw = cvUrl?.trim();
  if (!raw) return null;

  if (/^https?:\/\//i.test(raw)) {
    const match = raw.match(STORAGE_URL_RE);
    if (match) {
      const path = decodeURIComponent(match[2].split("?")[0]);
      return isSafePath(path) ? { kind: "storage", bucket: match[1], path } : null;
    }
    return { kind: "external", url: raw };
  }

  const path = raw.split("?")[0];
  return isSafePath(path) ? { kind: "storage", bucket: CV_BUCKET, path } : null;
}

/** Dato un cvUrl vecchio (URL pubblico) o nuovo (percorso) ricava sempre il percorso nel bucket. */
export function resolveCvPath(cvUrl: string | null | undefined): string | null {
  const ref = resolveCvRef(cvUrl);
  return ref?.kind === "storage" ? ref.path : null;
}

export type CvValidation = { ok: true; value: string | undefined } | { ok: false; error: string };

/**
 * Controlla che un cvUrl in ingresso possa essere collegato a un candidato
 * dell'organizzazione `organizationId`.
 *  - vuoto => ok (nessun CV / CV rimosso)
 *  - percorso nel bucket `cvs` che inizia con "<organizationId>/" => ok
 *  - valore identico (stesso file) a quello già salvato per il candidato => ok (CV storici senza prefisso)
 *  - URL esterno o percorso di un'altra organizzazione => rifiutato
 * Ritorna il valore normalizzato da salvare (il percorso).
 */
export function validateCvForOrganization(
  cvUrl: string | null | undefined,
  organizationId: string,
  options: { existingCvUrl?: string | null; allowExternal?: boolean } = {},
): CvValidation {
  const raw = cvUrl?.trim();
  if (!raw) return { ok: true, value: undefined };

  const ref = resolveCvRef(raw);
  if (!ref) return { ok: false, error: "Percorso del CV non valido." };

  const existing = resolveCvRef(options.existingCvUrl);
  const sameAsExisting =
    !!existing &&
    ((existing.kind === "storage" && ref.kind === "storage" && existing.bucket === ref.bucket && existing.path === ref.path) ||
      (existing.kind === "external" && ref.kind === "external" && existing.url === ref.url));

  if (ref.kind === "external") {
    return options.allowExternal || sameAsExisting
      ? { ok: true, value: ref.url }
      : { ok: false, error: "CV non valido: carica il file tramite il form." };
  }

  if (sameAsExisting) return { ok: true, value: ref.path };

  if (ref.bucket === CV_BUCKET && ref.path.startsWith(`${organizationId}/`)) {
    return { ok: true, value: ref.path };
  }

  return { ok: false, error: "CV non valido per questa organizzazione." };
}

/** Link firmato (default 5 minuti). Generato al momento del clic, mai salvato nel DB. */
export async function createCvSignedUrl(
  cvUrl: string,
  expiresInSeconds = CV_SIGNED_URL_TTL_SECONDS,
): Promise<string | null> {
  const ref = resolveCvRef(cvUrl);
  if (!ref) return null;
  if (ref.kind === "external") return ref.url;

  const supabase = createServiceClient();
  const { data, error } = await supabase.storage.from(ref.bucket).createSignedUrl(ref.path, expiresInSeconds);
  if (error || !data?.signedUrl) return null;
  return data.signedUrl;
}

/** Scarica il CV per i processi interni: chiave di servizio dal percorso, fetch solo per URL esterni. */
export async function downloadCv(cvUrl: string): Promise<Buffer> {
  const ref = resolveCvRef(cvUrl);
  if (!ref) throw new Error("Riferimento al CV non valido.");

  if (ref.kind === "external") {
    const response = await fetch(ref.url);
    if (!response.ok) {
      throw new Error(`Impossibile scaricare il file: ${response.status} ${response.statusText}`);
    }
    return Buffer.from(await response.arrayBuffer());
  }

  const supabase = createServiceClient();
  const { data, error } = await supabase.storage.from(ref.bucket).download(ref.path);
  if (error || !data) {
    throw new Error(`Download CV da Supabase fallito: ${error?.message || "file non trovato"}`);
  }
  return Buffer.from(await data.arrayBuffer());
}
