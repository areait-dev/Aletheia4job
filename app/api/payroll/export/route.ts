import { NextRequest, NextResponse } from "next/server";
import { canManageMembers, getAuthContext } from "@/utils/authz";
import { generatePayrollCsv } from "@/utils/payrollExport";

export async function GET(req: NextRequest) {
  const auth = await getAuthContext();
  if (!auth) return new NextResponse("unauthorized", { status: 401 });
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

