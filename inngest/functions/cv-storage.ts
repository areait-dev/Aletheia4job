import { inngest } from "@/inngest/client";
import { dbUnscoped } from "@/utils/db";
import { createServiceClient } from "@/utils/supabase/service";
import { logger } from "@/utils/logger";
import { CV_BUCKET, deleteCvFile } from "@/utils/cvStorage";
import { CV_FILE_DELETE_EVENT } from "@/utils/cvFileCleanup";
import { listBucketObjects } from "@/utils/storageList";
import { parseOrphanMode, runOrphanCleanup } from "@/utils/cvOrphanCleanup";

/** Nuovo tentativo di eliminazione di un CV quando l'eliminazione immediata (dopo la cancellazione del candidato) è fallita. */
export const retryCvFileDelete = inngest.createFunction(
  { id: "cv-file-delete", retries: 5, triggers: [{ event: CV_FILE_DELETE_EVENT }] },
  async ({ event, step }) => {
    const { cvUrl } = event.data as { cvUrl: string };
    await step.run("delete-file", async () => {
      const res = await deleteCvFile(cvUrl);
      if (!res.ok) throw new Error(`Eliminazione del CV fallita: ${res.error}`); // Inngest riprova
      return res;
    });
    return { ok: true };
  },
);

/**
 * Ogni giorno elimina dal bucket `cvs` i file non collegati a nessun candidato e più vecchi di 48 ore.
 * Modalità da CV_ORPHAN_CLEANUP_MODE: "off" | "dry" (default: solo elenco nel log, nessuna cancellazione) | "delete".
 */
export const cleanupAbandonedCvUploads = inngest.createFunction(
  { id: "cv-orphan-cleanup", retries: 1, concurrency: 1, triggers: [{ cron: "30 3 * * *" }] },
  async ({ step }) => {
    const mode = parseOrphanMode(process.env.CV_ORPHAN_CLEANUP_MODE);
    const result = await step.run("cleanup", async () => {
      const supabase = createServiceClient();
      const r = await runOrphanCleanup(mode, {
        listObjects: async () => (await listBucketObjects(supabase, CV_BUCKET)).map((o) => ({ path: o.path, createdAt: o.createdAt })),
        listReferencedCvUrls: async () => {
          const rows = await dbUnscoped.candidate.findMany({ where: { cvUrl: { not: null } }, select: { cvUrl: true } });
          return rows.map((x) => x.cvUrl as string);
        },
        removePaths: async (paths) => {
          const { error } = await supabase.storage.from(CV_BUCKET).remove(paths);
          return { error: error?.message };
        },
      });
      logger.info(
        `[cv-orphan-cleanup] modalità ${r.mode}: file ${r.totalFiles}, da eliminare ${r.abandoned.length}, eliminati ${r.deleted}${r.aborted ? `, INTERROTTO: ${r.aborted}` : ""}`,
        // in simulazione l'elenco finisce nel log: serve a decidere se attivare la cancellazione
        { paths: r.mode === "dry" ? r.abandoned : undefined },
      );
      return { ...r, abandoned: r.abandoned.length, sample: r.abandoned.slice(0, 20) };
    });
    return result;
  },
);
