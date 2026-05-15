import { NextRequest, NextResponse } from "next/server";
import prisma from "@/utils/db";
import { DocumentSignatureStatus } from "@prisma/client";
import { isValidDropboxSignEventHash } from "@/utils/integrations/dropboxSign";

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  let jsonStr: string | null = null;
  try {
    const form = await req.formData();
    const field = form.get("json");
    jsonStr = typeof field === "string" ? field : null;
  } catch {
    jsonStr = null;
  }

  if (!jsonStr) {
    return new NextResponse("invalid", { status: 400 });
  }

  let payload: any;
  try {
    payload = JSON.parse(jsonStr);
  } catch {
    return new NextResponse("invalid", { status: 400 });
  }

  const eventTime = payload?.event?.event_time;
  const eventType = payload?.event?.event_type;
  const eventHash = payload?.event?.event_hash;

  if (!eventTime || !eventType || !eventHash) {
    return new NextResponse("invalid", { status: 400 });
  }

  if (!isValidDropboxSignEventHash({ eventTime, eventType, eventHash })) {
    return new NextResponse("invalid", { status: 401 });
  }

  if (eventType === "signature_request_signed" || eventType === "signature_request_all_signed") {
    const signatureRequestId = payload?.signature_request?.signature_request_id;
    if (signatureRequestId) {
      await prisma.document.updateMany({
        where: { signatureRequestId },
        data: { signatureStatus: DocumentSignatureStatus.SIGNED },
      });
    }
  }

  return new NextResponse("Hello API Event Received", {
    status: 200,
    headers: { "content-type": "text/plain" },
  });
}

