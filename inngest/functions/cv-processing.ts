import { inngest } from "@/inngest/client";
import { rateLimitFailureMessage, runAiStepWithRateLimitWait } from "@/lib/aiStepRetry";
import { GroqTransientError } from "@/lib/groqRetry";
import {
  CV_UNREADABLE_MESSAGE,
  extractCvTextOutcome,
  handleProcessCvFailure,
  markApplicationFailed,
} from "@/lib/cvProcessingOutcome";
import prisma from "@/utils/db";
import { runWithTenantContext, setTenantContext } from "@/utils/tenant-context";
import { createServiceClient } from "@/utils/supabase/service";
import { downloadCv } from "@/utils/cvStorage";
import { isAiConfigured, parseCvWithAI, scoreCandidateWithAI } from "@/lib/aiCv";

type CvProcessingPayload = {
  applicationId: string;
  candidateId: string;
  jobId: string;
  organizationId: string;
  filePath?: string;
  cvUrl?: string;
  mimeType?: string;
};

/**
 * Quanti CV si elaborano contemporaneamente (tutte le esecuzioni di questa funzione insieme).
 * Evita che un picco di candidature (es. 200 CV arrivati insieme) lanci 200 chiamate AI e 200 query
 * in parallelo: gli altri restano in coda e partono man mano.
 */
export const CV_PROCESSING_CONCURRENCY = 5;

// Gli errori temporanei di Groq (429, timeout, 5xx) non si ritentano con i `retries` di Inngest: il ritardo di ripresa
// cresce con il tentativo e supera di molto quello richiesto. Vedi lib/aiStepRetry.ts (step.sleep con contatore proprio).

function describeAiFailure(step: string, e: unknown): string {
  const raw = e instanceof Error ? (e.cause instanceof Error ? e.cause.message : e.message) : String(e);
  return `${step}: ${raw}`.slice(0, 300);
}

export const processCV = inngest.createFunction(
  {
    id: "process-cv",
    triggers: [{ event: "cv/process.requested" }],
    retries: 5,
    concurrency: CV_PROCESSING_CONCURRENCY,
    // Rete di sicurezza: se il run fallisce dopo tutti i tentativi la candidatura va in FAILED (con il pulsante
    // "Riprova Elaborazione") invece di restare in PROCESSING per sempre.
    onFailure: async (failure) => {
      const original = (failure.event.data.event?.data ?? {}) as Partial<CvProcessingPayload>;
      if (!original.organizationId) return handleProcessCvFailure(prisma, failure as never);
      await runWithTenantContext({ organizationId: original.organizationId, source: "system" }, () =>
        handleProcessCvFailure(prisma, failure as never),
      );
    },
  },
  async ({ event, step }) => {
    const { applicationId, candidateId, jobId, organizationId, filePath, mimeType, cvUrl } =
      event.data as CvProcessingPayload;

    // organizationId è già stato risolto server-side (dal Job) prima dell'invio
    // dell'evento, mai fornito dal client; nessuna sessione utente qui (job in
    // background), quindi va impostato esplicitamente ad ogni invocazione.
    setTenantContext({ organizationId, source: "system" });

    // Il tenant context impostato qui sopra NON arriva ai singoli passi: Inngest li esegue in un contesto asincrono
    // proprio, e ogni query scoped falliva con TenantContextMissingError già al primo passo. Ogni passo viene quindi
    // eseguito dentro runWithTenantContext (legato esplicitamente alla callback).
    const runStep = <T,>(id: string, fn: () => Promise<T>) =>
      step.run(id, () => runWithTenantContext({ organizationId, source: "system" }, fn));

    await runStep("mark-processing", async () => {
      await prisma.application.update({
        where: { id: applicationId },
        data: { parsingStatus: "PROCESSING" },
      });
    });

    // Download e lettura del file. Download dallo Storage / rete: errore temporaneo, il passo viene ritentato.
    // File illeggibile (PDF danneggiato, formato non supportato): errore definitivo, esito { ok: false } senza ritentativi.
    const extracted = await runStep("extract-cv-text", async () =>
      extractCvTextOutcome(async () => {
        if (filePath) {
          const supabase = createServiceClient();
          const { data: fileData, error: downloadError } = await supabase.storage
            .from("cvs")
            .download(filePath);

          if (downloadError || !fileData) {
            throw new Error(`Download CV da Supabase fallito: ${downloadError?.message || "file non trovato"}`);
          }

          return Buffer.from(await fileData.arrayBuffer());
        }
        if (cvUrl) {
          // Percorso nel bucket (chiave di servizio) o URL esterno: vedi utils/cvStorage.ts
          return await downloadCv(cvUrl);
        }
        throw new Error("Nessun file CV disponibile (mancano filePath e cvUrl)");
      }, mimeType),
    );

    if (!extracted.ok) {
      console.warn(`[cv-processing] CV illeggibile, application ${applicationId} in FAILED senza ritentativi`);
      await runStep("mark-failed-unreadable", async () => {
        await markApplicationFailed(prisma, { applicationId, organizationId, message: CV_UNREADABLE_MESSAGE });
      });
      return { ok: false, applicationId, reason: "cv-unreadable" };
    }
    const cvText = extracted.text;

    // Errori dell'analisi AI rimasti dopo tutti i tentativi: non vanno persi (prima l'esito era "completato" ma vuoto).
    const aiFailures: string[] = [];

    let parsedData: Record<string, any> | null = null;
    if (isAiConfigured()) {
      try {
        const parsed = await runAiStepWithRateLimitWait({
          name: "ai-parse-cv",
          runStep,
          sleep: (id, duration) => step.sleep(id, duration),
          call: () => parseCvWithAI(cvText),
        });
        if (parsed.ok) {
          parsedData = parsed.value;
        } else {
          console.warn(`[cv-processing] AI CV parsing: rate limit ancora superato dopo ${parsed.attempts} tentativi (application ${applicationId})`);
          aiFailures.push(rateLimitFailureMessage("lettura del CV", parsed.attempts));
        }
      } catch (e) {
        console.warn("[cv-processing] AI CV parsing non riuscito:", e);
        aiFailures.push(describeAiFailure("lettura del CV", e));
      }
    }

    await runStep("update-candidate", async () => {
      const updateData: Record<string, any> = {
        resumeText: cvText,
      };

      if (parsedData) {
        if (parsedData.firstName) updateData.firstName = parsedData.firstName;
        if (parsedData.lastName) updateData.lastName = parsedData.lastName;
        if (parsedData.phone) updateData.phone = parsedData.phone;
        if (parsedData.city) updateData.city = parsedData.city;
        if (parsedData.role) updateData.role = parsedData.role;
        if (parsedData.seniority) updateData.seniority = parsedData.seniority;
        if (parsedData.education) updateData.education = parsedData.education;
        if (parsedData.skills) updateData.skills = parsedData.skills;
        if (parsedData.sector) updateData.sector = parsedData.sector;
      }

      await prisma.candidate.update({
        where: { id: candidateId },
        data: updateData,
      });
    });

    if (isAiConfigured()) {
      try {
        const scored = await runAiStepWithRateLimitWait({
          name: "ai-match-score",
          runStep,
          sleep: (id, duration) => step.sleep(id, duration),
          call: async () => {
            const job = await prisma.job.findUnique({
              where: { id: jobId },
              select: { title: true, requirements: true, description: true },
            });

            if (!job) {
              throw new Error(`Job ${jobId} non trovato per AI matching`);
            }

            const result = await scoreCandidateWithAI(cvText, job);

            await prisma.candidate.update({
              where: { id: candidateId },
              data: {
                matchingScore: result.matchingScore,
                matchedKeywords: result.matchedKeywords,
                missingKeywords: result.missingKeywords,
                recommendation: result.recommendation,
              },
            });

            await prisma.application.updateMany({
              where: { candidateId, jobId, organizationId },
              data: {
                matchingScore: result.matchingScore,
                matchedKeywords: result.matchedKeywords,
                missingKeywords: result.missingKeywords,
                recommendation: result.recommendation,
              },
            });
          },
        });
        if (!scored.ok) {
          console.warn(`[cv-processing] AI matching: rate limit ancora superato dopo ${scored.attempts} tentativi (application ${applicationId})`);
          aiFailures.push(rateLimitFailureMessage("punteggio", scored.attempts));
        }
      } catch (e) {
        console.warn("[cv-processing] AI matching score non riuscito:", e);
        aiFailures.push(describeAiFailure("punteggio", e));
      }
    }

    // Se l'analisi AI non è andata a buon fine lo stato è "FAILED" con il motivo (la scheda del candidato lo mostra
    // e permette di rilanciare l'analisi): il testo del CV è comunque già salvato.
    await runStep("mark-completed", async () => {
      await prisma.application.update({
        where: { id: applicationId },
        data: aiFailures.length
          ? { parsingStatus: "FAILED", parsingError: `Analisi AI non completata (${aiFailures.join("; ")}). Puoi rilanciarla dalla scheda del candidato.` }
          : { parsingStatus: "COMPLETED", parsingError: null },
      });
    });

    return { ok: aiFailures.length === 0, applicationId, aiFailures };
  },
);

type CandidateProcessingPayload = {
  candidateId: string;
  organizationId: string;
  /** Se true, non sovrascrive il campo `role` (usato per gli import da
   *  archivio dove `role` è intenzionalmente valorizzato con la mansione
   *  della sottocartella di provenienza, non da riconoscere via AI). */
  preserveRole?: boolean;
};

/**
 * Arricchimento AI di un Candidate non collegato a nessuna Application
 * (es. import da archivio CV locale). A differenza di processCV, non
 * richiede applicationId/jobId: legge il resumeText già salvato sul
 * Candidate e aggiorna solo i campi anagrafici/profilo.
 */
export const processCandidateCV = inngest.createFunction(
  {
    id: "process-candidate-cv",
    triggers: [{ event: "cv/candidate-process.requested" }],
    retries: 5,
    concurrency: CV_PROCESSING_CONCURRENCY,
    // Qui non c'è una candidatura da portare in FAILED (l'arricchimento riguarda solo il candidato): si registra il motivo nei log.
    onFailure: async (failure) => {
      const original = (failure.event.data.event?.data ?? {}) as Partial<CandidateProcessingPayload>;
      console.error(
        `[process-candidate-cv] run fallito dopo tutti i tentativi (candidato ${original.candidateId ?? "?"}):`,
        failure.error?.message,
      );
    },
  },
  async ({ event, step }) => {
    const { candidateId, organizationId, preserveRole } = event.data as CandidateProcessingPayload;

    setTenantContext({ organizationId, source: "system" });

    // Il tenant context impostato qui sopra NON arriva ai singoli passi: Inngest li esegue in un contesto asincrono
    // proprio, e ogni query scoped falliva con TenantContextMissingError già al primo passo. Ogni passo viene quindi
    // eseguito dentro runWithTenantContext (legato esplicitamente alla callback).
    const runStep = <T,>(id: string, fn: () => Promise<T>) =>
      step.run(id, () => runWithTenantContext({ organizationId, source: "system" }, fn));

    const candidate = await runStep("fetch-candidate", async () => {
      return prisma.candidate.findFirst({
        where: { id: candidateId, organizationId },
        select: { id: true, resumeText: true },
      });
    });

    if (!candidate?.resumeText?.trim()) {
      return { ok: false, reason: "no-resume-text", candidateId };
    }

    if (!isAiConfigured()) {
      return { ok: false, reason: "no-groq-key", candidateId };
    }

    const parsed = await runAiStepWithRateLimitWait({
      name: "ai-parse-candidate",
      runStep,
      sleep: (id, duration) => step.sleep(id, duration),
      call: async () => {
        try {
          return await parseCvWithAI(candidate.resumeText!);
        } catch (e) {
          // errore temporaneo (429, timeout): lo gestisce l'helper con step.sleep; gli altri errori come prima
          if (e instanceof GroqTransientError) throw e;
          console.warn("[process-candidate-cv] AI parsing non riuscito:", e);
          return null;
        }
      },
    });

    if (!parsed.ok) {
      console.warn(`[process-candidate-cv] rate limit AI ancora superato dopo ${parsed.attempts} tentativi (candidato ${candidateId})`);
      return { ok: false, reason: "ai-rate-limited", candidateId };
    }

    const parsedData = parsed.value;
    if (!parsedData) {
      return { ok: false, reason: "ai-parse-failed", candidateId };
    }

    await runStep("update-candidate", async () => {
      const updateData: Record<string, any> = {};
      if (parsedData.firstName) updateData.firstName = parsedData.firstName;
      if (parsedData.lastName) updateData.lastName = parsedData.lastName;
      if (parsedData.phone) updateData.phone = parsedData.phone;
      if (parsedData.city) updateData.city = parsedData.city;
      if (!preserveRole && parsedData.role) updateData.role = parsedData.role;
      if (parsedData.seniority) updateData.seniority = parsedData.seniority;
      if (parsedData.education) updateData.education = parsedData.education;
      if (parsedData.skills) updateData.skills = parsedData.skills;
      if (parsedData.sector) updateData.sector = parsedData.sector;

      if (Object.keys(updateData).length > 0) {
        await prisma.candidate.update({
          where: { id: candidateId },
          data: updateData,
        });
      }
    });

    return { ok: true, candidateId };
  },
);
