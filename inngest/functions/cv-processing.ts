import { inngest } from "@/inngest/client";
import prisma from "@/utils/db";
import { createServiceClient } from "@/utils/supabase/service";
import { extractTextFromCV } from "@/lib/cvParser";

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
    if (process.env.GEMINI_API_KEY) {
      try {
        parsedData = await step.run("ai-parse-cv", async () => {
          const { GoogleGenerativeAI } = require("@google/generative-ai");
          const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
          const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

          const prompt = `
            Analizza il seguente testo estratto da un CV e restituisci un oggetto JSON con i seguenti campi:
            - firstName: string
            - lastName: string
            - email: string
            - phone: string
            - city: string
            - role: string
            - seniority: string
            - education: string
            - skills: string
            - sector: string

            Testo del CV:
            ${cvText}

            Restituisci ESCLUSIVAMENTE il JSON puro.
          `;

          const result = await model.generateContent(prompt);
          const responseText = result.response.text();
          const jsonString = responseText
            .replace(/```json/g, "")
            .replace(/```/g, "")
            .trim();
          return JSON.parse(jsonString);
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

    if (process.env.GROQ_API_KEY) {
      try {
        await step.run("ai-match-score", async () => {
          const { Groq } = require("groq-sdk");
          const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

          const job = await prisma.job.findUnique({
            where: { id: jobId },
            select: { title: true, requirements: true, description: true },
          });

          if (!job) {
            throw new Error(`Job ${jobId} non trovato per AI matching`);
          }

          const prompt = `
            Sei un esperto HR Senior. Analizza il CV di un candidato rispetto ai requisiti di una posizione lavorativa.

            JOB TITLE: ${job.title}
            JOB REQUIREMENTS: ${job.requirements}
            JOB DESCRIPTION: ${job.description}

            CV TEXT:
            ${cvText.substring(0, 10000)}

            REGOLE:
            - Restituisci un oggetto JSON.
            - matchingScore: un intero da 0 a 100.
            - matchedKeywords: array di stringhe (massimo 10 competenze chiave trovate).
            - missingKeywords: array di stringhe (massimo 5 competenze importanti mancanti).
            - recommendation: una breve frase (massimo 15 parole).

            FORMATO JSON:
            {
              "matchingScore": 85,
              "matchedKeywords": ["React", "TypeScript", "Node.js"],
              "missingKeywords": ["AWS", "Docker"],
              "recommendation": "Profilo solido con ottime basi tecniche, consigliato per colloquio tecnico."
            }
          `;

          const response = await groq.chat.completions.create({
            messages: [
              { role: "system", content: "Sei un assistente HR che risponde esclusivamente in formato JSON." },
              { role: "user", content: prompt },
            ],
            model: "llama-3.3-70b-versatile",
            response_format: { type: "json_object" },
          });

          const content = response.choices[0]?.message?.content;
          if (!content) throw new Error("Risposta AI vuota");

          const result = JSON.parse(content);

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
