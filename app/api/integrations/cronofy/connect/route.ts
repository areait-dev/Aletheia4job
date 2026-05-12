import { NextRequest, NextResponse } from "next/server";
import { getAuthContext } from "@/utils/authz";
import { signState } from "@/utils/signedState";
import { buildCronofyAuthorizeUrl } from "@/utils/integrations/cronofy";

export async function GET(req: NextRequest) {
  const auth = await getAuthContext();
  if (!auth) {
    const url = new URL("/login", req.url);
    url.searchParams.set("redirect_url", "/api/integrations/cronofy/connect");
    return NextResponse.redirect(url);
  }

  const state = signState({
    userId: auth.userId,
    organizationId: auth.organizationId,
    ts: Date.now(),
  });
  return NextResponse.redirect(buildCronofyAuthorizeUrl(state));
}

