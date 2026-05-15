import { NextRequest, NextResponse } from "next/server";
import { getAuthContext, type AuthContext } from "@/utils/authz";
import { signState } from "@/utils/signedState";
import { buildCronofyAuthorizeUrl } from "@/utils/integrations/cronofy";

export const dynamic = "force-dynamic";

type AuthResult =
  | { ok: true; auth: AuthContext }
  | { ok: false; unauthorized: true }
  | { ok: false; unauthorized: false; response: NextResponse };

async function resolveAuth(): Promise<AuthResult> {
  try {
    const auth = await getAuthContext();
    if (!auth) {
      return { ok: false, unauthorized: true };
    }
    return { ok: true, auth };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[cronofy/connect] getAuthContext failed:", error);

    if (message.includes("context error") || message.includes("cookies()")) {
      return {
        ok: false,
        unauthorized: false,
        response: NextResponse.json(
          { error: "Authentication service unavailable" },
          { status: 500 },
        ),
      };
    }

    return {
      ok: false,
      unauthorized: false,
      response: NextResponse.json({ error: "Internal authentication error" }, { status: 500 }),
    };
  }
}

export async function GET(req: NextRequest) {
  const authResult = await resolveAuth();
  if (!authResult.ok) {
    if (authResult.unauthorized) {
      const url = new URL("/login", req.url);
      url.searchParams.set("redirect_url", "/api/integrations/cronofy/connect");
      return NextResponse.redirect(url);
    }
    return authResult.response;
  }
  const { auth } = authResult;

  const state = signState({
    userId: auth.userId,
    organizationId: auth.organizationId,
    ts: Date.now(),
  });
  return NextResponse.redirect(buildCronofyAuthorizeUrl(state));
}
