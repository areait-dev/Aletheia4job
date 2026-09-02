// Modulo server-only "normale" (NON "use server"): esporta anche un type,
// e i file "use server" di Next.js possono esportare solo async function.
// Va importato solo da Server Component o da altri moduli server-side (altri
// file "use server", route handler) — mai da un Client Component, esattamente
// come utils/rate-limiter.ts da cui dipende.
import { dbUnscoped } from "../db";
import { checkRateLimit, getClientIp } from "../rate-limiter";
import { logger } from "../logger";

// Eventi del funnel di candidatura pubblico che tracciamo. Tenerli in un
// union type esplicito invece di `string` evita refusi ai call site (es.
// "job-view" invece di "job_view") che altrimenti passerebbero silenziosi
// fino alle query di aggregazione.
export type FunnelEventType =
  | "job_view"
  | "apply_click"
  | "application_submitted"
  | "spontaneous_submitted";

// Finestra/soglia di deduplica: puramente per ridurre il rumore statistico
// di refresh ripetuti sulla stessa pagina/stesso IP (non un controllo di
// sicurezza, a differenza del rate limiter usato sulle Server Action di
// scrittura in Fase 5) — un solo evento per (eventType, jobId o
// organizationId, IP) ogni 30 secondi.
const DEDUP_WINDOW_MS = 30 * 1000;
const DEDUP_LIMIT = 1;

// Scrive sempre via dbUnscoped, MAI tramite il client scoped di default:
// questi eventi arrivano da richieste pubbliche non autenticate (career
// page, form di candidatura), senza un tenant context di sessione da cui
// l'estensione tenant-scope in utils/db.ts possa derivare l'organizationId.
// Il chiamante è responsabile di passare l'organizationId corretto,
// derivato dal Job target (o da PUBLIC_SPONTANEOUS_ORG_ID per l'evento
// spontaneo) — stesso pattern già usato in utils/actions/jobs.ts.
//
// Fire-and-forget per costruzione: non deve MAI far fallire o rallentare
// percettibilmente il flusso reale di candidatura. Ogni errore (DB down,
// rate limiter, next/headers fuori contesto) viene loggato e inghiottito,
// mai propagato al chiamante.
export async function logFunnelEvent(params: {
  organizationId: string;
  jobId?: string;
  eventType: FunnelEventType;
}): Promise<void> {
  try {
    const clientIp = getClientIp();
    const dedupKey = `funnel:${params.eventType}:${params.jobId ?? params.organizationId}:${clientIp}`;
    const dedup = checkRateLimit(dedupKey, DEDUP_LIMIT, DEDUP_WINDOW_MS);
    if (!dedup.allowed) return;

    await dbUnscoped.publicFunnelEvent.create({
      data: {
        organizationId: params.organizationId,
        jobId: params.jobId,
        eventType: params.eventType,
      },
    });
  } catch (error) {
    logger.warn("Errore registrazione evento funnel (ignorato, non blocca il flusso utente)", {
      eventType: params.eventType,
      jobId: params.jobId,
      error,
    });
  }
}
