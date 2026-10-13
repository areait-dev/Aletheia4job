import { inngest } from "@/inngest/client";
import prisma from "@/utils/db";
import { setTenantContext } from "@/utils/tenant-context";
import { createServiceClient } from "@/utils/supabase/service";
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

export const processCV = inngest.createFunction(
  {
    id: "process-cv",
    triggers: [{ event: "cv/process.requested" }],
  },
  async ({ event, step }) => {
    const { applicationId, candidateId, jobId, organizationId, filePath, mimeType, cvUrl } =
      event.data as CvProcessingPayload;

    // organizationId è già stato risolto server-side (dal Job) prima dell'invio
    // dell'evento, mai fornito dal client; nessuna sessione utente qui (job in
    // background), quindi va impostato esplicitamente ad ogni invocazione.
    setTenantContext({ organizationId, source: "system" });

    await step.run("mark-processing", async () => {
      await prisma.application.update({
        where: { id: applicationId },
        data: { parsingStatus: "PROCESSING" },
      });
    });

    const cvText = await step.run("extract-cv-text", async () => {
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
        const response = await fetch(cvUrl);
        if (!response.ok) {
          throw new Error(`Download CV da URL fallito: ${response.status} ${response.statusText}`);
        }
        buffer = Buffer.from(await response.arrayBuffer());
      } else {
        throw new Error("Nessun file CV disponibile (mancano filePath e cvUrl)");
      }

      return await extractTextFromCV(buffer, mimeType);
    });

    let parsedData: Record<string, any> | null = null;
    if (isAiConfigured()) {
      try {
        parsedData = await step.run("ai-parse-cv", async () => {
          return await parseCvWithAI(cvText);
        });
      } catch (e) {
        console.warn("[cv-processing] AI CV parsing non riuscito:", e);
      }
    }

    await step.run("update-candidate", async () => {
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
        await step.run("ai-match-score", async () => {
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
        });
      } catch (e) {
        console.warn("[cv-processing] AI matching score non riuscito:", e);
      }
    }

    await step.run("mark-completed", async () => {
      await prisma.application.update({
        where: { id: applicationId },
        data: { parsingStatus: "COMPLETED" },
      });
    });

    return { ok: true, applicationId };
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
  },
  async ({ event, step }) => {
    const { candidateId, organizationId, preserveRole } = event.data as CandidateProcessingPayload;

    setTenantContext({ organizationId, source: "system" });

    const candidate = await step.run("fetch-candidate", async () => {
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

    const parsedData = await step.run("ai-parse-candidate", async () => {
      try {
        return await parseCvWithAI(candidate.resumeText!);
      } catch (e) {
        console.warn("[process-candidate-cv] AI parsing non riuscito:", e);
        return null;
      }
    });

    if (!parsedData) {
      return { ok: false, reason: "ai-parse-failed", candidateId };
    }

    await step.run("update-candidate", async () => {
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
