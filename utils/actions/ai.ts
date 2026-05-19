"use server";

import prisma from "@/utils/db";
import { Groq } from 'groq-sdk';
import { extractTextFromUrl } from "../cv-extraction";
import { authenticateAndRedirect } from "./shared";
import { canWrite } from "../authz";
import { inngest } from "@/inngest/client";
import { revalidatePath } from "next/cache";

function getGroqClient() {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new Error("GROQ_API_KEY is not defined in environment variables");
  }
  return new Groq({ apiKey });
}

export async function parseCVAction(text: string) {
  const apiKey = process.env.GEMINI_API_KEY;
  const { GoogleGenerativeAI } = require("@google/generative-ai");
  const genAI = new GoogleGenerativeAI(apiKey);
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
    ${text}
    
    Restituisci ESCLUSIVAMENTE il JSON puro.
  `;

  try {
    const result = await model.generateContent(prompt);
    const responseText = result.response.text();
    const jsonString = responseText.replace(/```json/g, "").replace(/```/g, "").trim();
    return JSON.parse(jsonString);
  } catch (error) {
    console.error("Errore AI CV Parsing:", error);
    return null;
  }
}

export async function calculateMatchingScoreAction(candidateId: string, jobId: string) {
  try {
    const { role } = await authenticateAndRedirect();
    if (!canWrite(role)) return { ok: false, error: "Non autorizzato" };

    return await processAICandidateAnalysis(candidateId, jobId);
  } catch (error) {
    console.error('Error in AI matching action:', error);
    return { ok: false, error: "Errore durante l'analisi AI" };
  }
}

export async function retryCvParsingAction(applicationId: string) {
  try {
    const { role } = await authenticateAndRedirect();
    if (!canWrite(role)) return { ok: false, error: "Non autorizzato" };

    const application = await prisma.application.findUnique({
      where: { id: applicationId },
      include: {
        candidate: { select: { id: true, cvUrl: true } },
        job: { select: { id: true, organizationId: true } },
      },
    });

    if (!application) return { ok: false, error: "Candidatura non trovata" };

    await prisma.application.update({
      where: { id: applicationId },
      data: { parsingStatus: "PENDING", parsingError: null },
    });

    await inngest.send({
      name: "cv/process.requested",
      data: {
        applicationId,
        candidateId: application.candidateId,
        jobId: application.job.id,
        organizationId: application.job.organizationId,
        cvUrl: application.candidate.cvUrl || undefined,
      },
    });

    revalidatePath(`/positions/${application.job.id}`);
    revalidatePath(`/jobs/${application.candidateId}`);

    return { ok: true };
  } catch (error) {
    console.error("[retryCvParsingAction] Errore:", error);
    return { ok: false, error: error instanceof Error ? error.message : "Errore nel retry" };
  }
}

/**
 * Funzione interna per processare l'analisi AI senza controlli di sessione (per trigger automatici)
 */
export async function processAICandidateAnalysis(candidateId: string, jobId: string) {
  try {
    console.log('[AI] processAICandidateAnalysis called with:', { candidateId, jobId });

    const candidate = await prisma.candidate.findUnique({
      where: { id: candidateId },
      select: { id: true, cvUrl: true, resumeText: true, organizationId: true }
    });

    if (!candidate) {
      console.warn('[AI] Candidate not found for ID:', candidateId);
      return { ok: false, error: "Candidato o Job non trovato" };
    }

    const job = await prisma.job.findUnique({
      where: { id: jobId },
      select: { title: true, requirements: true, description: true }
    });

    if (!job) {
      console.warn('[AI] Job not found for ID:', jobId);
      return { ok: false, error: "Candidato o Job non trovato" };
    }
    if (!candidate.cvUrl && !candidate.resumeText) return { ok: false, error: "Il candidato non ha un CV caricato" };

    // 2. Estrai testo se non presente
    let text = candidate.resumeText;
    if (!text && candidate.cvUrl) {
      console.log('🔄 [AI] Estrazione testo dal CV...');
      const extractionResult = await extractTextFromUrl(candidate.cvUrl);
      
      if (extractionResult.success) {
        text = extractionResult.text;
        await prisma.candidate.update({
          where: { id: candidateId },
          data: { resumeText: text }
        });
        console.log('✅ [AI] Testo estratto e salvato');
      } else {
        console.warn('⚠️ [AI] Estrazione testo fallita:', extractionResult.error);
        // Non blocchiamo, ma restituiamo un errore gestito
        return { ok: false, error: extractionResult.error };
      }
    }

    if (!text) {
      console.warn('⚠️ [AI] Nessun testo disponibile per l\'analisi');
      return { ok: false, error: "Nessun testo disponibile per l'analisi" };
    }

    // 3. Prompt per Groq
    const prompt = `
      Sei un esperto HR Senior. Analizza il CV di un candidato rispetto ai requisiti di una posizione lavorativa.
      
      JOB TITLE: ${job.title}
      JOB REQUIREMENTS: ${job.requirements}
      JOB DESCRIPTION: ${job.description}
      
      CV TEXT:
      ${text.substring(0, 10000)}
      
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

    const groq = getGroqClient();
    const response = await groq.chat.completions.create({
      messages: [
        { role: "system", content: "Sei un assistente HR che risponde esclusivamente in formato JSON." },
        { role: "user", content: prompt }
      ],
      model: "llama-3.3-70b-versatile",
      response_format: { type: "json_object" }
    });

    const content = response.choices[0]?.message?.content;
    if (!content) throw new Error("Risposta AI vuota");
    
    const result = JSON.parse(content);

    // 4. Aggiorna il record Candidate (score generale)
    await prisma.candidate.update({
      where: { id: candidateId },
      data: {
        matchingScore: result.matchingScore,
        matchedKeywords: result.matchedKeywords,
        missingKeywords: result.missingKeywords,
        recommendation: result.recommendation
      }
    });

    // 5. Aggiorna anche l'Application specifica (score per posizione)
    await prisma.application.updateMany({
      where: { candidateId, jobId, organizationId: candidate.organizationId },
      data: {
        matchingScore: result.matchingScore,
        matchedKeywords: result.matchedKeywords,
        missingKeywords: result.missingKeywords,
        recommendation: result.recommendation
      }
    });

    return { ok: true, data: result };

  } catch (error) {
    console.error('Error in processAICandidateAnalysis:', error);
    return { ok: false, error: error instanceof Error ? error.message : "Errore analisi AI" };
  }
}
