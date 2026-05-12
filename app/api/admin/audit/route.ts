import { NextResponse } from "next/server";
import { AuditAction } from "@prisma/client";
import prisma from "@/utils/db";
import { canManageMembers, getAuthContext } from "@/utils/authz";

export async function GET(request: Request) {
  const auth = await getAuthContext();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canManageMembers(auth.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const url = new URL(request.url);
  const requestedLimit = Number(url.searchParams.get("limit") ?? "50");
  const limit = Math.min(Math.max(requestedLimit, 1), 200);
  const entity = url.searchParams.get("entity");
  const action = url.searchParams.get("action") as AuditAction | null;
  const fromDate = url.searchParams.get("fromDate");
  const toDate = url.searchParams.get("toDate");

  const where: {
    organizationId: string;
    entity?: { equals: string; mode: "insensitive" };
    action?: AuditAction;
    createdAt?: { gte?: Date; lte?: Date };
  } = {
    organizationId: auth.organizationId,
  };
  if (entity) where.entity = { equals: entity, mode: "insensitive" };
  if (action && Object.values(AuditAction).includes(action)) where.action = action;
  if (fromDate || toDate) {
    where.createdAt = {};
    if (fromDate) where.createdAt.gte = new Date(fromDate);
    if (toDate) where.createdAt.lte = new Date(toDate);
  }

  const logs = await prisma.auditLog.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: limit,
  });

  return NextResponse.json({ logs });
}
