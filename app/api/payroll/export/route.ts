import { NextRequest, NextResponse } from "next/server";
import { canManageMembers, getAuthContext, type AuthContext } from "@/utils/authz";
import { generatePayrollCsv } from "@/utils/payrollExport";

export const dynamic = "force-dynamic";

type AuthResult =
  | { ok: true; auth: AuthContext }
  | { ok: false; response: NextResponse };

async function resolveAuth(): Promise<AuthResult> {
  try {
    const auth = await getAuthContext();
    if (!auth) {
      return {
        ok: false,
        response: new NextResponse("unauthorized", { status: 401 }),
      };
    }
    return { ok: true, auth };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[payroll/export] getAuthContext failed:", error);

    if (message.includes("context error") || message.includes("cookies()")) {
      return {
        ok: false,
        response: NextResponse.json(
          { error: "Authentication service unavailable" },
          { status: 500 },
        ),
      };
    }

    return {
      ok: false,
      response: NextResponse.json({ error: "Internal authentication error" }, { status: 500 }),
    };
  }
}

export async function GET(req: NextRequest) {
  const authResult = await resolveAuth();
  if (!authResult.ok) return authResult.response;
  const { auth } = authResult;

  if (!canManageMembers(auth.role)) return new NextResponse("forbidden", { status: 403 });

  const url = new URL(req.url);
  const provider = (url.searchParams.get("provider") || "zucchetti") as "zucchetti" | "teamsystem";
  const fromStr = url.searchParams.get("from");
  const toStr = url.searchParams.get("to");
  if (!fromStr || !toStr) {
    return NextResponse.json({ error: "Parametri from/to obbligatori" }, { status: 400 });
  }

  const from = new Date(fromStr);
  const to = new Date(toStr);
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
    return NextResponse.json({ error: "Date non valide" }, { status: 400 });
  }

  const { csv, filename } = await generatePayrollCsv({
    organizationId: auth.organizationId,
    provider,
    from,
    to,
  });

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="${filename}"`,
    },
  });
}
