import { NextRequest, NextResponse } from "next/server";
import prisma from "@/utils/db";
import { DocumentSignatureStatus } from "@prisma/client";
import { getAuthContext, canWrite } from "@/utils/authz";
import { sendSignatureRequest } from "@/utils/integrations/dropboxSign";

export async function POST(req: NextRequest) {
  const auth = await getAuthContext();
  if (!auth) return new NextResponse("unauthorized", { status: 401 });
  if (!canWrite(auth.role)) return new NextResponse("forbidden", { status: 403 });

  const body = await req.json().catch(() => null);
  const documentId = body?.documentId as string | undefined;
  const signerEmail = body?.signerEmail as string | undefined;
  const signerName = body?.signerName as string | undefined;
  const subject = (body?.subject as string | undefined) || "Documento da firmare";
  const message = (body?.message as string | undefined) || "Per favore firma il documento.";
  const testMode = Boolean(body?.testMode);

  if (!documentId || !signerEmail || !signerName) {
    return NextResponse.json({ error: "Parametri mancanti" }, { status: 400 });
  }

  const doc = await prisma.document.findFirst({
    where: { id: documentId, organizationId: auth.organizationId },
  });
  if (!doc) return NextResponse.json({ error: "Documento non trovato" }, { status: 404 });

  const clientId = process.env.DROPBOX_SIGN_CLIENT_ID || undefined;
  const signatureRequestId = await sendSignatureRequest({
    title: doc.title,
    subject,
    message,
    fileUrl: doc.fileUrl,
    signers: [{ email: signerEmail, name: signerName, order: 0 }],
    testMode,
    clientId,
  });

  await prisma.document.update({
    where: { id: doc.id },
    data: {
      signatureRequestId,
      signatureStatus: DocumentSignatureStatus.SENT,
    },
  });

  return NextResponse.json({ ok: true, signatureRequestId });
}

