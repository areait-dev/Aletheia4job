import { NextRequest, NextResponse } from "next/server";
import prisma, { dbUnscoped } from "@/utils/db";
import { DocumentSignatureStatus } from "@prisma/client";
import { isValidDropboxSignEventHash } from "@/utils/integrations/dropboxSign";
import { setTenantContext } from "@/utils/tenant-context";

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
      // Nessuna sessione utente qui (webhook esterno verificato via hash): risolve
      // il documento e la sua organizzazione da un id esterno univoco prima di
      // poter scopare l'update.
      const doc = await dbUnscoped.document.findFirst({ where: { signatureRequestId } });
      if (doc) {
        setTenantContext({ organizationId: doc.organizationId, source: "webhook" });
        await prisma.document.update({
          where: { id: doc.id },
          data: { signatureStatus: DocumentSignatureStatus.SIGNED },
        });
      }
    }
  }

  return new NextResponse("Hello API Event Received", {
    status: 200,
    headers: { "content-type": "text/plain" },
  });
}

