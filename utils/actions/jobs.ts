"use server";

import prisma, { dbUnscoped } from "@/utils/db";
import { setTenantContext, runWithTenantContext } from "@/utils/tenant-context";
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
import { buildJobSlugMap, extractJobIdFromSlug } from "@/utils/jobSlug";
import { logger } from "../logger";
import { checkRateLimit, getClientIp } from "../rate-limiter";
import { unstable_cache } from "next/cache";
import { logFunnelEvent } from "./funnelEvents";

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
      logger.warn('[ensureJobFolder] Errore creazione cartella', { message: error.message });
    }
  } catch (e) {
    logger.warn('[ensureJobFolder] Fallito', { error: e });
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
    const job = await prisma.$transaction(async (tx) => {
      const created = await tx.job.create({
        data: {
          ...values,
          userId,
          organizationId,
        },
      });
      await createAuditLogEntry({ userId, organizationId, action: AuditAction.CREATE, entity: "job", entityId: created.id }, tx);
      return created;
    });
    ensureJobFolder(job.id);
    return {
      ...job,
      status: job.status as JobStatus,
      mode: job.mode as JobMode,
    };
  } catch (error) {
    logger.error("Errore creazione job", error, { organizationId });
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
    logger.error("Errore fetch jobs", error, { organizationId });
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
    logger.error("Errore fetch singolo job", error, { jobId: id });
    return null;
  }
}

export async function updateJobAction(jobId: string, values: Partial<CreateAndEditJobType>): Promise<JobType | null> {
  const { userId, organizationId, role } = await authenticateAndRedirect();
  if (!canWrite(role)) return null;
  try {
    const updatedJob = await prisma.$transaction(async (tx) => {
      const result = await tx.job.updateMany({
        where: { id: jobId, organizationId },
        data: values,
      });
      if (result.count === 0) return null;
      await createAuditLogEntry({ userId, organizationId, action: AuditAction.UPDATE, entity: "job", entityId: jobId }, tx);
      return tx.job.findFirst({ where: { id: jobId, organizationId } });
    });
    if (!updatedJob) return null;
    if (updatedJob.status === "Aperto") ensureJobFolder(jobId);
    return {
      ...updatedJob,
      status: updatedJob.status as JobStatus,
      mode: updatedJob.mode as JobMode,
    };
  } catch (error) {
    logger.error("Errore update job", error, { jobId });
    return null;
  }
}

export type DeleteJobResult = { success: true } | { success: false; reason: "forbidden" | "error" };

export async function deleteJobAction(id: string): Promise<DeleteJobResult> {
  const { userId, organizationId, role } = await authenticateAndRedirect();
  if (!canWrite(role)) {
    logger.warn("Eliminazione job negata: ruolo senza permessi di scrittura", { jobId: id, role });
    return { success: false, reason: "forbidden" };
  }
  try {
    await runWithTenantContext({ organizationId, userId, role, source: "session" }, () =>
      prisma.$transaction(async (tx) => {
        await tx.job.delete({ where: { id, organizationId } });
        await createAuditLogEntry({ userId, organizationId, action: AuditAction.DELETE, entity: "job", entityId: id }, tx);
      })
    );
    return { success: true };
  } catch (error) {
    logger.error("Errore delete job", error, { jobId: id });
    return { success: false, reason: "error" };
  }
}

// Career page pubblica: nessun dato per-utente (stesso risultato per tutti i
// visitatori a parità di filtri), quindi la query può essere messa in cache
// invece di rieseguirla ad ogni richiesta. `unstable_cache` chiave la cache
// anche sugli argomenti della funzione, quindi ogni combinazione di filtri
// (sector/location/mode) ottiene la propria entry, coerente con quanto
// mostrato all'utente; uno annuncio nuovo può impiegare fino a 60s a comparire.
const getCachedPublicJobs = unstable_cache(
  async (sector?: string, location?: string, mode?: string) => {
    const where: Prisma.JobWhereInput = { isActive: true, status: "Aperto", postToCareerPage: { not: false } };
    if (sector && sector !== "tutti") where.sector = { equals: sector, mode: "insensitive" };
    if (location) where.location = { contains: location, mode: "insensitive" };
    if (mode) where.mode = mode;

    return dbUnscoped.job.findMany({
      where,
      orderBy: { postedAt: "desc" },
      select: {
        id: true, title: true, company: true, companyLogoUrl: true, imageUrl: true, location: true, sector: true, mode: true,
        salaryMin: true, salaryMax: true, salaryCurrency: true, remoteType: true,
        experienceLevel: true, postedAt: true, description: true, requirements: true, benefits: true,
        locationInputType: true, locationOptions: true,
      },
    });
  },
  ["public-jobs"],
  { revalidate: 60, tags: ["public-jobs"] }
);

export async function getPublicJobsAction(params?: { sector?: string; location?: string; mode?: string; }) {
  try {
    return await getCachedPublicJobs(params?.sector, params?.location, params?.mode);
  } catch (error) {
    logger.error("Errore fetch public jobs", error);
    return [];
  }
}

// Career page pubblica: aggrega job di TUTTE le organizzazioni per design (nessuna
// sessione utente disponibile), quindi usa deliberatamente il client non scoped.
// Stessa motivazione di cache di getPublicJobsAction sopra.
const getCachedPublicJobSlugMap = unstable_cache(
  async () => {
    const jobs = await dbUnscoped.job.findMany({
      where: { isActive: true, status: "Aperto", postToCareerPage: { not: false } },
      orderBy: [{ postedAt: "asc" }, { id: "asc" }],
      select: { id: true, title: true, location: true },
    });
    return buildJobSlugMap(jobs);
  },
  ["public-job-slug-map"],
  { revalidate: 60, tags: ["public-jobs"] }
);

export async function getPublicJobSlugMapAction() {
  try {
    return await getCachedPublicJobSlugMap();
  } catch (error) {
    logger.error("Errore generazione slug annunci", error);
    return [];
  }
}

// Risolve lo slug pubblico (basato sul solo titolo) all'id del job.
// Supporta anche i vecchi formati di link (id nudo o "titolo-<uuid>")
// cosi' i link gia' condivisi non si rompono: vengono reindirizzati
// allo slug canonico corrente. Condivisa tra la pagina annuncio e la
// generazione dell'immagine Open Graph, cosi' restano sempre in sync.
export async function resolvePublicJobSlugAction(slug: string): Promise<{ id: string; canonicalSlug: string } | null> {
  const slugMap = await getPublicJobSlugMapAction();
  const bySlug = slugMap.find(e => e.slug === slug);
  if (bySlug) return { id: bySlug.id, canonicalSlug: bySlug.slug };

  const legacyId = extractJobIdFromSlug(slug);
  const byId = slugMap.find(e => e.id === legacyId);
  if (byId) return { id: byId.id, canonicalSlug: byId.slug };

  return null;
}

export async function getPublicJobByIdAction(id: string) {
  try {
    return await dbUnscoped.job.findFirst({
      where: { id, isActive: true, status: "Aperto", postToCareerPage: { not: false } },
      select: {
        id: true, organizationId: true, title: true, company: true, companyLogoUrl: true, imageUrl: true, location: true, sector: true, mode: true,
        salaryMin: true, salaryMax: true, salaryCurrency: true, remoteType: true,
        experienceLevel: true, postedAt: true, description: true, requirements: true, responsibilities: true, benefits: true,
        locationInputType: true, locationOptions: true,
      },
    });
  } catch (error) {
    logger.error("Errore fetch public job by id", error, { jobId: id });
    return null;
  }
}

export async function applyToJobAction(values: {
  jobId: string; firstName: string; lastName: string; email: string; phone?: string; city: string; cvUrl?: string; source?: string; appliedLocation?: string;
}) {
  const clientIp = getClientIp();
  const rateLimit = checkRateLimit(`apply-to-job:${clientIp}`, 10, 10 * 60 * 1000);
  if (!rateLimit.allowed) {
    logger.warn("Rate limit superato su applyToJobAction", { clientIp, jobId: values.jobId });
    return { ok: false, error: "Troppe richieste. Riprova tra qualche minuto." };
  }

  try {
    // Nessuna sessione utente qui (form pubblico di candidatura): l'organizzazione
    // viene derivata dal Job target con una lettura non scoped, poi il tenant
    // context viene popolato esplicitamente per la transazione che segue.
    const job = await dbUnscoped.job.findUnique({
      where: { id: values.jobId },
      select: { organizationId: true, sector: true, title: true, userId: true, category: true }
    });

    if (!job) {
      return { ok: false, error: "Posizione non trovata" };
    }

    const { organizationId, userId: jobCreatorId } = job;
    const emailLower = values.email.toLowerCase();

    setTenantContext({ organizationId, source: "system" });

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
            role: job.title,
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
          appliedLocation: values.appliedLocation || undefined,
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
      } catch (e) {
        logger.error("[applyToJobAction] Errore invio a Inngest", e);
      }
    }

    // Solo dopo che la scrittura di candidato/candidatura è andata a buon
    // fine: logFunnelEvent inghiottisce già i propri errori internamente.
    await logFunnelEvent({ organizationId: job.organizationId, jobId: values.jobId, eventType: "application_submitted" });

    return { ok: true };
  } catch (error) {
    if (error instanceof Error && error.message === "DUPLICATE_APPLICATION") {
      return { ok: false, error: "Hai già inviato una candidatura per questa posizione." };
    }
    logger.error("[applyToJobAction] Errore critico durante l'invio", error);
    const errorMessage = error instanceof Error ? error.message : "Errore interno del server";
    return { ok: false, error: `Impossibile completare l'invio: ${errorMessage}` };
  }
}

export async function updateApplicationStatusAction(applicationId: string, status: string) {
  const { userId, organizationId, role } = await authenticateAndRedirect();
  if (!canWrite(role)) return null;
  try {
    const application = await prisma.$transaction(async (tx) => {
      const updated = await tx.application.update({
        where: { id: applicationId, organizationId },
        data: { status },
        include: { candidate: { select: { firstName: true, lastName: true } } }
      });
      await createAuditLogEntry({
        userId, organizationId, action: AuditAction.UPDATE, entity: "application", entityId: applicationId,
        metadata: { status, candidate: `${updated.candidate.firstName} ${updated.candidate.lastName}` }
      }, tx);
      return updated;
    });
    return application;
  } catch (error) {
    logger.error("Errore update application", error, { applicationId });
    return null;
  }
}

export async function getActiveJobsForFeed() {
  return dbUnscoped.job.findMany({ where: { isActive: true }, orderBy: { postedAt: 'desc' } });
}

export async function getJobStatsBySourceAction() {
  const { organizationId } = await authenticateAndRedirect();
  try {
    const sourceStats = await prisma.job.groupBy({ where: { organizationId }, by: ['utmSource'], _count: { utmSource: true }, orderBy: { _count: { utmSource: 'desc' } } });
    return sourceStats.map((item) => ({ source: item.utmSource || 'direct', count: item._count.utmSource }));
  } catch (error) { 
    logger.error("Errore stats job", error, { organizationId });
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
      model: "openai/gpt-oss-120b",
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: "json_object" },
      temperature: 0.6, // Leggermente più basso per dati strutturati più precisi
    });

    const content = response.choices[0]?.message?.content;
    if (!content) throw new Error("Nessuna risposta da Groq");

    return JSON.parse(content);

  } catch (error) {
    logger.error("Errore generazione AI (Groq)", error);
    throw new Error("Impossibile generare la Job Description. Riprova più tardi.");
  }
}