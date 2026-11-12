import { CvUnreadableError } from "@/lib/cvErrors";
import { extractTextFromCV } from "@/lib/cvParser";

/**
 * Esiti del job di elaborazione CV che non devono lasciare una candidatura in PROCESSING per sempre.
 *  - CV illeggibile: errore definitivo, la candidatura va subito in FAILED (nessun ritentativo inutile);
 *  - download dallo Storage / rete: errore temporaneo, si rilancia e ci pensano i `retries` di Inngest;
 *  - run fallito dopo tutti i tentativi (onFailure): rete di sicurezza, la candidatura va comunque in FAILED.
 * In FAILED la scheda del candidato mostra il motivo e il pulsante "Riprova Elaborazione".
 */

export const CV_UNREADABLE_MESSAGE =
  "Impossibile leggere il CV: il file potrebbe essere danneggiato o in un formato non supportato. Prova a ricaricarlo in PDF.";

export const CV_PROCESSING_GENERIC_FAILURE =
  "Elaborazione del CV non riuscita dopo diversi tentativi. Puoi rilanciarla dalla scheda del candidato.";

export type CvTextOutcome = { ok: true; text: string } | { ok: false; reason: "unreadable" };

/**
 * Scarica (loadBuffer) ed estrae il testo del CV.
 * - loadBuffer che lancia (Storage, rete): l'errore si propaga, il passo viene ritentato.
 * - CvUnreadableError dall'estrazione: esito { ok: false }, il passo riesce e NON viene ritentato.
 * - qualsiasi altro errore dall'estrazione: si propaga (inatteso, meglio ritentarlo).
 */
export async function extractCvTextOutcome(
  loadBuffer: () => Promise<Buffer>,
  mimeType: string | undefined,
  extract: (buffer: Buffer, mimeType?: string) => Promise<string> = extractTextFromCV,
): Promise<CvTextOutcome> {
  const buffer = await loadBuffer();
  try {
    return { ok: true, text: await extract(buffer, mimeType) };
  } catch (e) {
    if (e instanceof CvUnreadableError) return { ok: false, reason: "unreadable" };
    throw e;
  }
}

type ApplicationDb = {
  application: { updateMany: (args: any) => Promise<{ count: number }> };
};

/**
 * Mette la candidatura in FAILED con il motivo, ma solo se è ancora PENDING o PROCESSING:
 * non sovrascrive un COMPLETED né un FAILED con un motivo già più preciso.
 */
export async function markApplicationFailed(
  db: ApplicationDb,
  params: { applicationId: string; organizationId: string; message: string },
): Promise<number> {
  const res = await db.application.updateMany({
    where: {
      id: params.applicationId,
      organizationId: params.organizationId,
      parsingStatus: { in: ["PENDING", "PROCESSING"] },
    },
    data: { parsingStatus: "FAILED", parsingError: params.message },
  });
  return res.count;
}

type FailureArgs = {
  event: { data: { run_id?: string; event?: { data?: Record<string, unknown> } } };
  error: Error;
};

/** onFailure di processCV: il run è fallito dopo tutti i tentativi. Ritorna il numero di candidature aggiornate. */
export async function handleProcessCvFailure(db: ApplicationDb, args: FailureArgs): Promise<number> {
  const data = args.event?.data?.event?.data ?? {};
  const applicationId = typeof data.applicationId === "string" ? data.applicationId : null;
  const organizationId = typeof data.organizationId === "string" ? data.organizationId : null;
  console.error(
    `[cv-processing] run fallito dopo tutti i tentativi (run ${args.event?.data?.run_id ?? "?"}, application ${applicationId ?? "?"}):`,
    args.error?.message,
  );
  if (!applicationId || !organizationId) return 0;
  return markApplicationFailed(db, { applicationId, organizationId, message: CV_PROCESSING_GENERIC_FAILURE });
}
