import { NextRequest, NextResponse } from "next/server";
import { inngest } from "@/inngest/client";

export const dynamic = "force-dynamic";

/**
 * Endpoint interno usato dagli script batch locali (es.
 * scripts/import-cv-archive.ts) per accodare il parsing AI di un Candidate
 * non collegato a nessuna Application (import da archivio). Gira
 * nell'ambiente di produzione, quindi inngest.send() qui usa le credenziali
 * Inngest reali — a differenza di uno script lanciato in locale, che
 * userebbe la config Inngest locale (INNGEST_DEV) e non raggiungerebbe la
 * coda di produzione.
 *
 * Autenticazione: header X-Internal-Secret verificato contro
 * INTERNAL_IMPORT_SECRET (stesso pattern del webhook multiposting).
 *
 * Payload atteso (JSON):
 * {
 *   "candidateId": string,
 *   "organizationId": string,
 *   "preserveRole"?: boolean
 * }
 */
function isAuthorized(req: NextRequest): boolean {
  const expected = process.env.INTERNAL_IMPORT_SECRET;
  if (!expected) return false;

  const headerSecret = req.headers.get("x-internal-secret");
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
    const { candidateId, organizationId, preserveRole } = body ?? {};

    if (!candidateId || !organizationId) {
      return NextResponse.json(
        { error: "candidateId e organizationId sono obbligatori" },
        { status: 400 },
      );
    }

    await inngest.send({
      name: "cv/candidate-process.requested",
      data: {
        candidateId,
        organizationId,
        preserveRole: preserveRole ?? false,
      },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[queue-cv-processing] Errore:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Errore sconosciuto" },
      { status: 500 },
    );
  }
}
