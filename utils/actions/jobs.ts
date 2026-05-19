"use server";

import prisma from "@/utils/db";
import { 
  JobType, 
  CreateAndEditJobType,
  JobStatus,
  JobMode
} from "../types";
import { AuditAction, Prisma } from "@prisma/client";
import { canWrite, createAuditLogEntry } from "../authz";
import { authenticateAndRedirect } from "./shared";
import { inngest } from "@/inngest/client";

// Libreria OpenAI (compatibile con Groq)
import OpenAI from 'openai';

// Crea cartella per la posizione aperta in Supabase Storage
async function ensureJobFolder(jobId: string) {
  try {
    const { createServiceClient } = await import('@/utils/supabase/service');
    const supabase = createServiceClient();
    const { error } = await supabase.storage
      .from('cvs')
      .upload(`${jobId}/.keep`, new Uint8Array(0), { upsert: true, contentType: 'text/plain' });
    if (error && !error.message.includes('Duplicate')) {
      console.warn('[ensureJobFolder] Errore creazione cartella:', error.message);
    }
  } catch (e) {
    console.warn('[ensureJobFolder] Fallito:', e);
  }
}

// Configurazione client per Groq
function getGroqClient() {
  return new OpenAI({
    apiKey: process.env.GROQ_API_KEY,
    baseURL: "https://api.groq.com/openai/v1",
  });
}

export async function createJobAction(values: CreateAndEditJobType): Promise<JobType | null> {
  const { userId, organizationId, role } = await authenticateAndRedirect();
  if (!canWrite(role)) return null;
  try {
    const job = await prisma.job.create({
      data: {
        ...values,
        userId,
        organizationId,
      },
    });
    await createAuditLogEntry({ userId, organizationId, action: AuditAction.CREATE, entity: "job", entityId: job.id });
    ensureJobFolder(job.id);
    return {
      ...job,
      status: job.status as JobStatus,
      mode: job.mode as JobMode,
    };
  } catch (error) {
    console.error("Errore creazione job:", error);
    return null;
  }
}

export async function getAllJobsAction() {
  const { organizationId } = await authenticateAndRedirect();
  try {
    return await prisma.job.findMany({
      where: { organizationId },
      orderBy: { createdAt: "desc" },
      include: { _count: { select: { applications: true } } }
    });
  } catch (error) { 
    console.error("Errore fetch jobs:", error);
    return []; 
  }
}

export async function getSingleJobAction(id: string) {
  const { organizationId } = await authenticateAndRedirect();
  try {
    return await prisma.job.findFirst({
      where: { id, organizationId },
      include: {
        applications: {
          include: { candidate: true },
          orderBy: { createdAt: 'desc' }
        }
      }
    });
  } catch (error) { 
    console.error("Errore fetch singolo job:", error);
    return null; 
  }
}

export async function updateJobAction(jobId: string, values: Partial<CreateAndEditJobType>): Promise<JobType | null> {
  const { userId, organizationId, role } = await authenticateAndRedirect();
  if (!canWrite(role)) return null;
  try {
    await prisma.job.updateMany({
      where: { id: jobId, organizationId },
      data: values,
    });
    await createAuditLogEntry({ userId, organizationId, action: AuditAction.UPDATE, entity: "job", entityId: jobId });
    const updatedJob = await prisma.job.findFirst({ where: { id: jobId, organizationId } });
    if (!updatedJob) return null;
    if (updatedJob.status === "Aperto") ensureJobFolder(jobId);
    return {
      ...updatedJob,
      status: updatedJob.status as JobStatus,
      mode: updatedJob.mode as JobMode,
    };
  } catch (error) { 
    console.error("Errore update job:", error);
    return null; 
  }
}

export async function deleteJobAction(id: string): Promise<boolean> {
  const { userId, organizationId, role } = await authenticateAndRedirect();
  if (!canWrite(role)) return false;
  try {
    await prisma.job.delete({ where: { id, organizationId } });
    await createAuditLogEntry({ userId, organizationId, action: AuditAction.DELETE, entity: "job", entityId: id });
    return true;
  } catch (error) { 
    console.error("Errore delete job:", error);
    return false; 
  }
}

export async function getPublicJobsAction(params?: { sector?: string; location?: string; mode?: string; }) {
  try {
    const where: Prisma.JobWhereInput = { isActive: true, status: "Aperto", postToCareerPage: { not: false } };
    if (params?.sector && params.sector !== "tutti") where.sector = { equals: params.sector, mode: "insensitive" };
    if (params?.location) where.location = { contains: params.location, mode: "insensitive" };
    if (params?.mode) where.mode = params.mode;

    return await prisma.job.findMany({
      where,
      orderBy: { postedAt: "desc" },
      select: {
        id: true, title: true, company: true, location: true, sector: true, mode: true,
        salaryMin: true, salaryMax: true, salaryCurrency: true, remoteType: true,
        experienceLevel: true, postedAt: true, description: true, requirements: true, benefits: true,
      },
    });
  } catch (error) { 
    console.error("Errore fetch public jobs:", error);
    return []; 
  }
}

export async function applyToJobAction(values: {
  jobId: string; firstName: string; lastName: string; email: string; phone?: string; city: string; cvUrl?: string; source?: string;
}) {
  try {
    console.log('🔍 [applyToJobAction] Inizio processo per jobId:', values.jobId, 'email:', values.email);
    
    const job = await prisma.job.findUnique({
      where: { id: values.jobId },
      select: { organizationId: true, sector: true, title: true, userId: true, category: true }
    });
    
    if (!job) {
      console.warn('⚠️ [applyToJobAction] Job non trovato:', values.jobId);
      return { ok: false, error: "Posizione non trovata" };
    }

    const { organizationId, userId: jobCreatorId } = job;
    const emailLower = values.email.toLowerCase();

    // Operazioni DB atomiche in transazione
    const result = await prisma.$transaction(async (tx) => {
      // Find or create candidate
      let candidate = await tx.candidate.findFirst({
        where: { email: { equals: emailLower, mode: 'insensitive' }, organizationId }
      });

      if (candidate) {
        candidate = await tx.candidate.update({
          where: { id: candidate.id },
          data: {
            firstName: values.firstName,
            lastName: values.lastName,
            phone: values.phone || candidate.phone,
            city: values.city,
            ...(values.cvUrl ? { cvUrl: values.cvUrl } : {}),
          },
        });
      } else {
        candidate = await tx.candidate.create({
          data: {
            firstName: values.firstName,
            lastName: values.lastName,
            email: emailLower,
            phone: values.phone,
            city: values.city,
            role: job.title,
            seniority: 'Mid',
            sector: job.category || job.sector,
            status: "Nuovo",
            source: values.source || "Career Page",
            organizationId,
            userId: jobCreatorId,
            cvUrl: values.cvUrl,
          },
        });
      }

      // Check duplicate application
      const existingApp = await tx.application.findUnique({
        where: { candidateId_jobId: { candidateId: candidate.id, jobId: values.jobId } }
      });

      if (existingApp) {
        throw new Error("DUPLICATE_APPLICATION");
      }

      // Create application record
      const application = await tx.application.create({
        data: {
          candidateId: candidate.id,
          jobId: values.jobId,
          organizationId,
          status: "Nuovo",
          parsingStatus: values.cvUrl ? "PENDING" : undefined,
        }
      });

      return { candidateId: candidate.id, applicationId: application.id };
    });

    // CV parsing asincrono via Inngest
    if (values.cvUrl) {
      try {
        await inngest.send({
          name: "cv/process.requested",
          data: {
            applicationId: result.applicationId,
            candidateId: result.candidateId,
            jobId: values.jobId,
            organizationId: job.organizationId,
            cvUrl: values.cvUrl,
          },
        });
        console.log("[applyToJobAction] Inngest event cv/process.requested inviato per:", result.applicationId);
      } catch (e) {
        console.error("[applyToJobAction] Errore invio a Inngest:", e);
      }
    }

    return { ok: true };
  } catch (error) {
    if (error instanceof Error && error.message === "DUPLICATE_APPLICATION") {
      return { ok: false, error: "Hai già inviato una candidatura per questa posizione." };
    }
    console.error("❌ [applyToJobAction] Errore critico durante l'invio:", error);
    const errorMessage = error instanceof Error ? error.message : "Errore interno del server";
    return { ok: false, error: `Impossibile completare l'invio: ${errorMessage}` };
  }
}

export async function updateApplicationStatusAction(applicationId: string, status: string) {
  const { userId, organizationId, role } = await authenticateAndRedirect();
  if (!canWrite(role)) return null;
  try {
    const application = await prisma.application.update({
      where: { id: applicationId, organizationId },
      data: { status },
      include: { candidate: { select: { firstName: true, lastName: true } } }
    });
    await createAuditLogEntry({
      userId, organizationId, action: AuditAction.UPDATE, entity: "application", entityId: applicationId,
      metadata: { status, candidate: `${application.candidate.firstName} ${application.candidate.lastName}` }
    });
    return application;
  } catch (error) { 
    console.error("Errore update application:", error);
    return null; 
  }
}

export async function getActiveJobsForFeed() {
  return prisma.job.findMany({ where: { isActive: true }, orderBy: { postedAt: 'desc' } });
}

export async function getJobStatsBySourceAction() {
  const { organizationId } = await authenticateAndRedirect();
  try {
    const sourceStats = await prisma.job.groupBy({ where: { organizationId }, by: ['utmSource'], _count: { utmSource: true }, orderBy: { _count: { utmSource: 'desc' } } });
    return sourceStats.map((item) => ({ source: item.utmSource || 'direct', count: item._count.utmSource }));
  } catch (error) { 
    console.error("Errore stats:", error);
    return []; 
  }
}

/**
 * NUOVA FUNZIONE: Genera Job Description con GROQ (Llama 3 70B)
 */
export async function generateJobDescriptionAction({
  title,
  company,
  location,
  experienceLevel,
  remoteType,
}: {
  title: string;
  company: string;
  location: string;
  experienceLevel: string;
  remoteType: string;
}) {
  if (!process.env.GROQ_API_KEY) {
    throw new Error("Chiave API GROQ non configurata");
  }

  try {
    const prompt = `
      Agisci come un esperto Recruiter Senior e Analista del Mercato del Lavoro italiano.
      Genera una job description completa per il ruolo di "${title}" presso "${company}" a "${location}".
      Livello esperienza: ${experienceLevel}
      Modalità: ${remoteType}

       ANALISI AUTONOMA RICHIESTA:
      1. SALARY RANGE: Stima un range realistico (min/max in € RAL annuali) basandoti sulle medie di mercato italiane attuali per questa mansione e zona geografica.
      2. CATEGORY: Classifica il ruolo in una macro-categoria professionale standard (es. "IT & Sviluppo", "Vendite & Commerciale", "Amministrazione & HR", "Produzione & Logistica", "Marketing", "Sanità", ecc.)
      3. INDUSTRY: Identifica il settore industriale/mercato di riferimento basandoti sul titolo del ruolo e sul contesto aziendale.
      4. LOCATION: Estrai automaticamente Città, Provincia e inferisci il CAP principale dalla location fornita.

       ⚠️ FORMATO OUTPUT:
      Restituisci SOLO un oggetto JSON valido. I campi salaryMin e salaryMax DEVONO essere numeri (integer). 
      Tutto il testo deve essere in italiano professionale.
      5. SECTOR: Inferisci il settore produttivo/merceologico (es. "Information Technology", "Vendite", "Sanità", "Marketing", "Logistica", "Amministrazione", "Ristorazione", ecc.) in base al titolo del ruolo.

      {
        "description": "string",
        "requirements": "string (elenco puntato con '\\n')",
        "responsibilities": "string (elenco puntato con '\\n')",
        "benefits": "string (elenco puntato con '\\n')",
        "salaryMin": 25000,
        "salaryMax": 32000,
        "salaryText": "25.000 - 32.000 € RAL",
        "category": "Categoria professionale inferita",
        "industry": "Industria/mercato inferito",
        "sector": "Settore produttivo inferito dal titolo",
        "city": "Città estratta",
        "province": "Provincia estratta",
        "postalCode": "CAP principale",
        "country": "IT",
        "locationFormatted": "Città (Provincia), Italia"
      }
    `;

    const groqClient = getGroqClient();
    const response = await groqClient.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: "json_object" },
      temperature: 0.6, // Leggermente più basso per dati strutturati più precisi
    });

    const content = response.choices[0]?.message?.content;
    if (!content) throw new Error("Nessuna risposta da Groq");

    return JSON.parse(content);

  } catch (error) {
    console.error("Errore generazione AI (Groq):", error);
    throw new Error("Impossibile generare la Job Description. Riprova più tardi.");
  }
}