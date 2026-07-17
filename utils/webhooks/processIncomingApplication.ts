import prisma from "@/utils/db";
import { createServiceClient } from "@/utils/supabase/service";
import { inngest } from "@/inngest/client";

function mimeTypeFromFilename(filename: string): string {
  const ext = filename.split(".").pop()?.toLowerCase();
  switch (ext) {
    case "pdf":  return "application/pdf";
    case "doc":  return "application/msword";
    case "docx": return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
    case "txt":  return "text/plain";
    default:     return "application/octet-stream";
  }
}

export type IncomingApplicationInput = {
  jobId: string;
  candidateEmail: string;
  candidateFirstName?: string | null;
  candidateLastName?: string | null;
  /** CV già ospitato altrove: verrà usato così com'è, nessun upload. */
  cvUrl?: string | null;
  /** CV inviato inline: verrà caricato su Supabase Storage. */
  cvBase64?: string | null;
  cvFilename?: string | null;
  /** Nome libero del provider di origine (es. "in-recruiting", "broadbean"). */
  sourceProvider: string;
  /** Riferimento candidatura lato provider esterno, per idempotenza/tracciamento. */
  sourceApplicationRef?: string | null;
};

export type ProcessIncomingApplicationResult = {
  candidateId: string;
  applicationId: string | null;
};

/**
 * Logica condivisa per ricevere una candidatura da un provider esterno di
 * multiposting: upload CV (se inline), upsert Candidate, create Application
 * idempotente, trigger Inngest per il parsing CV. Usata da qualsiasi webhook
 * di ingresso (Broadbean in passato, ora il webhook multiposting generico).
 */
export async function processIncomingApplication(
  input: IncomingApplicationInput,
): Promise<ProcessIncomingApplicationResult> {
  const job = await prisma.job.findUnique({ where: { id: input.jobId } });

  if (!job) {
    throw new Error(`No job found for jobId: ${input.jobId}`);
  }

  let cvUrl: string | null = input.cvUrl ?? null;
  let filePath: string | null = null;
  let mimeType: string | null = null;

  if (!cvUrl && input.cvBase64) {
    const cvBuffer = Buffer.from(input.cvBase64, "base64");
    const supabase = createServiceClient();
    const safeFilename = input.cvFilename ?? `cv_${Date.now()}.pdf`;
    filePath = `cvs/${Date.now()}_${safeFilename}`;
    mimeType = mimeTypeFromFilename(safeFilename);

    const { error: uploadError } = await supabase.storage
      .from("cvs")
      .upload(filePath, cvBuffer, {
        contentType: mimeType,
        upsert: false,
      });

    if (uploadError) {
      throw new Error(`CV upload failed: ${uploadError.message}`);
    }

    const { data: { publicUrl } } = supabase.storage
      .from("cvs")
      .getPublicUrl(filePath);

    cvUrl = publicUrl;
  }

  const emailLower = input.candidateEmail.toLowerCase().trim();
  const organizationId = job.organizationId;
  const firstName = input.candidateFirstName ?? "";
  const lastName = input.candidateLastName ?? "";

  const candidate = await prisma.candidate.upsert({
    where: {
      organizationId_email: {
        organizationId,
        email: emailLower,
      },
    },
    update: {
      firstName,
      lastName,
      cvUrl: cvUrl ?? undefined,
      source: input.sourceProvider,
    },
    create: {
      organizationId,
      userId: job.userId,
      firstName,
      lastName,
      email: emailLower,
      phone: "",
      city: "",
      role: job.title,
      seniority: "Mid",
      sector: job.category || job.sector,
      status: "Nuovo",
      source: input.sourceProvider,
      cvUrl: cvUrl ?? undefined,
    },
  });

  let applicationId: string | null = null;

  try {
    const application = await prisma.application.create({
      data: {
        candidateId: candidate.id,
        jobId: job.id,
        organizationId,
        status: "Nuovo",
        parsingStatus: "PENDING",
      },
    });
    applicationId = application.id;
  } catch (appError: any) {
    if (appError?.code === "P2002") {
      const existing = await prisma.application.findUnique({
        where: {
          candidateId_jobId: {
            candidateId: candidate.id,
            jobId: job.id,
          },
        },
        select: { id: true },
      });
      applicationId = existing?.id ?? null;
    } else {
      throw appError;
    }
  }

  if (applicationId && cvUrl) {
    try {
      await inngest.send({
        name: "cv/process.requested",
        data: {
          applicationId,
          candidateId: candidate.id,
          jobId: job.id,
          organizationId,
          ...(filePath ? { filePath } : { cvUrl }),
          mimeType: mimeType ?? undefined,
        },
      });
    } catch (queueError) {
      await prisma.application.update({
        where: { id: applicationId },
        data: {
          parsingStatus: "FAILED",
          parsingError: `Impossibile accodare job: ${queueError instanceof Error ? queueError.message : "errore sconosciuto"}`,
        },
      });
    }
  }

  return { candidateId: candidate.id, applicationId };
}
