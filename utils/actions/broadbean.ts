"use server";

import prisma from "@/utils/db";
import { authenticateAndRedirect } from "./shared";
import { fetchJsonOrThrow, ExternalApiError } from "../externalApi";

const BROADBEAN_SANDBOX_URL = "https://veritonehire.com";

export async function publishToBroadbeanAction(jobId: string) {
  const { organizationId } = await authenticateAndRedirect();

  try {
    const job = await prisma.job.findUnique({
      where: { id: jobId, organizationId },
    });

    if (!job) {
      return { success: false, message: "Annuncio non trovato" };
    }

    const apiKey = process.env.BROADBEAN_API_KEY;
    if (!apiKey) {
      await prisma.job.update({
        where: { id: jobId },
        data: {
          broadbeanStatus: "ERROR",
          broadbeanError: "BROADBEAN_API_KEY mancante nelle variabili d'ambiente",
        },
      });
      return { success: false, message: "API key Broadbean non configurata" };
    }

    const payload = {
      job_title: job.title,
      job_description: job.description,
      job_requirements: job.requirements,
      job_location: job.location,
      job_company: job.company,
      job_sector: job.sector,
      job_mode: job.mode,
      job_salary_min: job.salaryMin,
      job_salary_max: job.salaryMax,
      job_currency: job.salaryCurrency,
      job_application_url: job.applicationUrl,
    };

    const response = await fetchJsonOrThrow<{
      job_reference: string;
      widget_url: string;
    }>(`${BROADBEAN_SANDBOX_URL}/api/jobs`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify(payload),
    }, { timeoutMs: 15000, provider: "Broadbean" });

    await prisma.job.update({
      where: { id: jobId },
      data: {
        broadbeanJobId: response.job_reference,
        broadbeanStatus: "PUBLISHED",
        broadbeanError: null,
        broadbeanLastSyncedAt: new Date(),
      },
    });

    return { success: true, widgetUrl: response.widget_url };
  } catch (error) {
    const message = error instanceof ExternalApiError
      ? `Broadbean API error${error.status ? ` (${error.status})` : ""}: ${error.message}`
      : error instanceof Error
        ? error.message
        : "Errore sconosciuto";

    console.error("[publishToBroadbeanAction] Errore:", error);

    await prisma.job.update({
      where: { id: jobId },
      data: {
        broadbeanStatus: "ERROR",
        broadbeanError: message,
      },
    });

    return { success: false, message };
  }
}

export async function unpublishFromBroadbeanAction(jobId: string) {
  const { organizationId } = await authenticateAndRedirect();

  try {
    const job = await prisma.job.findUnique({
      where: { id: jobId, organizationId },
    });

    if (!job) {
      return { success: false, message: "Annuncio non trovato" };
    }

    if (job.broadbeanJobId) {
      const apiKey = process.env.BROADBEAN_API_KEY;

      if (apiKey) {
        try {
          await fetchJsonOrThrow(
            `${BROADBEAN_SANDBOX_URL}/api/jobs/${job.broadbeanJobId}`,
            {
              method: "DELETE",
              headers: {
                "Authorization": `Bearer ${apiKey}`,
              },
            },
            { timeoutMs: 10000, provider: "Broadbean" },
          );
        } catch (deleteError) {
          console.error("[unpublishFromBroadbeanAction] DELETE fallito (procedo comunque):", deleteError);
        }
      }
    }

    await prisma.job.update({
      where: { id: jobId },
      data: {
        broadbeanJobId: null,
        broadbeanStatus: "NOT_SENT",
        broadbeanError: null,
        broadbeanLastSyncedAt: new Date(),
      },
    });

    return { success: true };
  } catch (error) {
    const message = error instanceof Error
      ? error.message
      : "Errore sconosciuto";

    console.error("[unpublishFromBroadbeanAction] Errore:", error);

    await prisma.job.update({
      where: { id: jobId },
      data: {
        broadbeanStatus: "ERROR",
        broadbeanError: message,
      },
    });

    return { success: false, message };
  }
}
