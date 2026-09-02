"use server";

// Unico punto d'ingresso "use server" per il tracking funnel richiamabile da
// un Client Component (click su "Candidati ora"). La visualizzazione annuncio
// e l'invio riuscito candidatura sono invece loggati direttamente lato
// server (Server Component / altre Server Action) tramite
// utils/actions/funnelEvents.ts, che non può stare in un file "use server"
// perché esporta anche un type oltre alla funzione.
import { logFunnelEvent } from "./funnelEvents";

export async function logApplyClickAction(params: { organizationId: string; jobId: string }): Promise<void> {
  await logFunnelEvent({
    organizationId: params.organizationId,
    jobId: params.jobId,
    eventType: "apply_click",
  });
}
