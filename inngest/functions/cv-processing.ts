import { RetryAfterError } from "inngest";
import { inngest } from "@/inngest/client";
import { GroqTransientError, jobRetryDelaySeconds } from "@/lib/groqRetry";
import prisma from "@/utils/db";
import { runWithTenantContext, setTenantContext } from "@/utils/tenant-context";
import { createServiceClient } from "@/utils/supabase/service";
import { downloadCv } from "@/utils/cvStorage";
import { extractTextFromCV } from "@/lib/cvParser";
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

/**
 * Un errore temporaneo di Groq (429, timeout, 5xx) non deve essere perso: si riprogramma il passo
 * più tardi con attesa crescente (RetryAfterError). Gli altri errori restano com'erano.
 */
function asRetryable(e: unknown, attempt: number): unknown {
  if (e instanceof GroqTransientError) {
    const seconds = jobRetryDelaySeconds(attempt, e.retryAfterSeconds);
    return new RetryAfterError(`${e.message}: nuovo tentativo tra ${seconds}s`, `${seconds}s`, { cause: e });
  }
  return e;
}

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
  },
  async ({ event, step, attempt }) => {
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

    const cvText = await runStep("extract-cv-text", async () => {
      let buffer: Buffer;

      if (filePath) {
        const supabase = createServiceClient();
        const { data: fileData, error: downloadError } = await supabase.storage
          .from("cvs")
          .download(filePath);

        if (downloadError || !fileData) {
          throw new Error(`Download CV da Supabase fallito: ${downloadError?.message || "file non trovato"}`);
        }

        buffer = Buffer.from(await fileData.arrayBuffer());
      } else if (cvUrl) {
        // Percorso nel bucket (chiave di servizio) o URL esterno: vedi utils/cvStorage.ts
        buffer = await downloadCv(cvUrl);
      } else {
        throw new Error("Nessun file CV disponibile (mancano filePath e cvUrl)");
      }

      return await extractTextFromCV(buffer, mimeType);
    });

    // Errori dell'analisi AI rimasti dopo tutti i tentativi: non vanno persi (prima l'esito era "completato" ma vuoto).
    const aiFailures: string[] = [];

    let parsedData: Record<string, any> | null = null;
    if (isAiConfigured()) {
      try {
        parsedData = await runStep("ai-parse-cv", async () => {
          try {
            return await parseCvWithAI(cvText);
          } catch (e) {
            throw asRetryable(e, attempt);
          }
        });
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
        await runStep("ai-match-score", async () => {
          const job = await prisma.job.findUnique({
            where: { id: jobId },
            select: { title: true, requirements: true, description: true },
          });

          if (!job) {
            throw new Error(`Job ${jobId} non trovato per AI matching`);
          }

          let result: Awaited<ReturnType<typeof scoreCandidateWithAI>>;
          try {
            result = await scoreCandidateWithAI(cvText, job);
          } catch (e) {
            throw asRetryable(e, attempt);
          }

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
        });
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
  },
  async ({ event, step, attempt }) => {
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

    const parsedData = await runStep("ai-parse-candidate", async () => {
      try {
        return await parseCvWithAI(candidate.resumeText!);
      } catch (e) {
        // errore temporaneo (429, timeout): riprogrammato con attesa crescente; altri errori come prima
        if (e instanceof GroqTransientError) throw asRetryable(e, attempt);
        console.warn("[process-candidate-cv] AI parsing non riuscito:", e);
        return null;
      }
    });

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
