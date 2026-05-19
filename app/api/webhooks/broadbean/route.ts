import { NextRequest, NextResponse } from "next/server";
import prisma from "@/utils/db";
import { createServiceClient } from "@/utils/supabase/service";
import { extractTextFromCV } from "@/lib/cvParser";

export const dynamic = 'force-dynamic';

function mimeTypeFromFilename(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase();
  switch (ext) {
    case "pdf":  return "application/pdf";
    case "doc":  return "application/msword";
    case "docx": return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
    case "txt":  return "text/plain";
    default:     return "application/octet-stream";
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      job_reference,
      application_ref,
      source_board,
      candidate_first_name,
      candidate_last_name,
      candidate_email,
      cv_base64,
      cv_filename,
    } = body;

    if (!job_reference || !candidate_email) {
      return NextResponse.json(
        { error: "job_reference and candidate_email are required" },
        { status: 400 },
      );
    }

    const job = await prisma.job.findUnique({
      where: { broadbeanJobId: job_reference },
    });

    if (!job) {
      return NextResponse.json(
        { error: `No job found for broadbeanJobId: ${job_reference}` },
        { status: 404 },
      );
    }

    const cvBuffer = Buffer.from(cv_base64, "base64");

    const supabase = createServiceClient();
    const safeFilename = cv_filename ?? `cv_${Date.now()}.pdf`;
    const filePath = `cvs/${Date.now()}_${safeFilename}`;
    const contentType = mimeTypeFromFilename(safeFilename);

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from("cvs")
      .upload(filePath, cvBuffer, {
        contentType,
        upsert: false,
      });

    if (uploadError) {
      console.error("[broadbean-webhook] Supabase upload error:", uploadError);
      return NextResponse.json(
        { error: `CV upload failed: ${uploadError.message}` },
        { status: 500 },
      );
    }

    const { data: { publicUrl } } = supabase.storage
      .from("cvs")
      .getPublicUrl(filePath);

    let cvText = "";
    try {
      cvText = await extractTextFromCV(cvBuffer, contentType);
    } catch (parseError) {
      console.warn("[broadbean-webhook] CV text extraction non riuscita (non bloccante):", parseError);
    }

    const emailLower = candidate_email.toLowerCase().trim();
    const organizationId = job.organizationId;

    const candidate = await prisma.candidate.upsert({
      where: {
        organizationId_email: {
          organizationId,
          email: emailLower,
        },
      },
      update: {
        firstName: candidate_first_name,
        lastName: candidate_last_name,
        cvUrl: publicUrl,
        resumeText: cvText || undefined,
        source: source_board || "Broadbean",
      },
      create: {
        organizationId,
        userId: job.userId,
        firstName: candidate_first_name,
        lastName: candidate_last_name,
        email: emailLower,
        phone: "",
        city: "",
        role: job.title,
        seniority: "Mid",
        sector: job.category || job.sector,
        status: "Nuovo",
        source: source_board || "Broadbean",
        cvUrl: publicUrl,
        resumeText: cvText || undefined,
      },
    });

    try {
      await prisma.application.create({
        data: {
          candidateId: candidate.id,
          jobId: job.id,
          organizationId,
          status: "Nuovo",
          broadbeanApplicationRef: application_ref || undefined,
          broadbeanBoardId: source_board || undefined,
        },
      });
    } catch (appError: any) {
      if (appError?.code === "P2002") {
        console.log("[broadbean-webhook] Application già esistente (idempotent), skip create");
      } else {
        throw appError;
      }
    }

    return NextResponse.json({ ok: true, candidateId: candidate.id });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Errore sconosciuto";
    console.error("[broadbean-webhook] Errore:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
