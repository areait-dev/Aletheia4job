import { AuditAction } from "@prisma/client";
import { dbUnscoped } from "@/utils/db";
import { createAuditLogEntry } from "@/utils/authz";
import { logger } from "@/utils/logger";
import { inngest } from "@/inngest/client";
import { deleteCvFileWithRetry, resolveCvRef } from "@/utils/cvStorage";

export const CV_FILE_DELETE_EVENT = "cv/file.delete.requested";

/**
 * Da richiamare DOPO il commit della transazione che ha eliminato il candidato.
 * Elimina il file del CV (con qualche tentativo). Se fallisce: il fallimento viene registrato
 * (log + riga di audit) e si chiede un nuovo tentativo a Inngest (con retry); in ogni caso la pulizia
 * giornaliera dei file non collegati lo riprenderebbe. Non lancia mai: il candidato è già stato eliminato.
 */
export async function removeCvFileAfterCandidateDelete(
  cvUrl: string | null | undefined,
  ctx: { candidateId: string; organizationId: string; userId: string },
): Promise<{ status: "deleted" | "skipped" | "failed"; detail?: string }> {
  try {
    const ref = resolveCvRef(cvUrl);
    if (!ref || ref.kind !== "storage") return { status: "skipped", detail: "nessun file nello Storage" };

    // Il file potrebbe essere condiviso con un altro candidato: in tal caso non si tocca.
    const stillReferenced = await dbUnscoped.candidate.count({ where: { cvUrl: { in: [cvUrl as string, ref.path] } } });
    if (stillReferenced > 0) {
      logger.warn("[cv-delete] file ancora collegato a un altro candidato: non eliminato", { path: ref.path });
      return { status: "skipped", detail: "file ancora collegato a un altro candidato" };
    }

    const res = await deleteCvFileWithRetry(cvUrl);
    if (res.ok) {
      logger.info("[cv-delete] file eliminato dallo Storage", { path: ref.path, attempts: res.attempts });
      return { status: "deleted" };
    }

    logger.error("[cv-delete] eliminazione del file fallita dopo i tentativi", { path: ref.path, error: res.error, attempts: res.attempts });
    try {
      await createAuditLogEntry({
        userId: ctx.userId,
        organizationId: ctx.organizationId,
        action: AuditAction.DELETE,
        entity: "cv_file",
        entityId: ctx.candidateId,
        metadata: { path: ref.path, status: "delete_failed", error: res.error },
      });
    } catch (e) {
      logger.error("[cv-delete] impossibile scrivere l'audit log del fallimento", e);
    }
    try {
      await inngest.send({ name: CV_FILE_DELETE_EVENT, data: { cvUrl, organizationId: ctx.organizationId, candidateId: ctx.candidateId } });
    } catch (e) {
      logger.error("[cv-delete] impossibile pianificare il nuovo tentativo su Inngest (resta la pulizia giornaliera)", e);
    }
    return { status: "failed", detail: res.error };
  } catch (e) {
    logger.error("[cv-delete] errore inatteso", e);
    return { status: "failed", detail: e instanceof Error ? e.message : "errore" };
  }
}
