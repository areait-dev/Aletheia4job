import { NextRequest, NextResponse } from "next/server";
import {
  processIncomingApplication,
  type IncomingApplicationInput,
} from "@/utils/webhooks/processIncomingApplication";

export const dynamic = "force-dynamic";

/**
 * Webhook generico per ricevere candidature da un provider esterno di
 * multiposting (es. In-recruiting, o altri in futuro). Il formato payload
 * qui sotto è provvisorio: verrà adattato al contratto reale del provider
 * scelto quando disponibile la relativa documentazione API.
 *
 * Payload atteso (JSON):
 * {
 *   "jobId": string,                 // id interno del Job (non un riferimento esterno)
 *   "candidateEmail": string,        // obbligatorio
 *   "candidateFirstName"?: string,
 *   "candidateLastName"?: string,
 *   "cvUrl"?: string,                // CV già ospitato altrove, oppure...
 *   "cvBase64"?: string,             // ...CV inline in base64 (richiede cvFilename)
 *   "cvFilename"?: string,
 *   "sourceProvider": string,        // es. "in-recruiting"
 *   "sourceApplicationRef"?: string  // riferimento candidatura lato provider esterno
 * }
 *
 * Autenticazione: header X-Webhook-Secret verificato contro
 * MULTIPOSTING_WEBHOOK_SECRET (assunzione: secret condiviso, stesso
 * meccanismo usato in passato per il webhook Broadbean).
 */
function isAuthorized(req: NextRequest): boolean {
  const expected = process.env.MULTIPOSTING_WEBHOOK_SECRET;
  if (!expected) return false;

  const headerSecret = req.headers.get("x-webhook-secret");
  const authHeader = req.headers.get("authorization");
  const bearerSecret = authHeader?.startsWith("Bearer ")
    ? authHeader.slice("Bearer ".length)
    : null;

  return headerSecret === expected || bearerSecret === expected;
}

export async function POST(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();

    const {
      jobId,
      candidateEmail,
      candidateFirstName,
      candidateLastName,
      cvUrl,
      cvBase64,
      cvFilename,
      sourceProvider,
      sourceApplicationRef,
    } = body as Partial<IncomingApplicationInput>;

    if (!jobId || !candidateEmail || !sourceProvider) {
      return NextResponse.json(
        { error: "jobId, candidateEmail and sourceProvider are required" },
        { status: 400 },
      );
    }

    if (!cvUrl && !cvBase64) {
      return NextResponse.json(
        { error: "either cvUrl or cvBase64 must be provided" },
        { status: 400 },
      );
    }

    const result = await processIncomingApplication({
      jobId,
      candidateEmail,
      candidateFirstName,
      candidateLastName,
      cvUrl,
      cvBase64,
      cvFilename,
      sourceProvider,
      sourceApplicationRef,
    });

    return NextResponse.json(
      { ok: true, candidateId: result.candidateId, applicationId: result.applicationId },
      { status: 202 },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Errore sconosciuto";
    console.error("[multiposting-webhook] Errore:", error);

    if (message.startsWith("No job found for jobId")) {
      return NextResponse.json({ error: message }, { status: 404 });
    }

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
