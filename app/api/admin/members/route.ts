import { NextResponse } from "next/server";
import { AuditAction, MembershipRole } from "@prisma/client";
import prisma from "@/utils/db";
import {
  canManageMembers,
  createAuditLogEntry,
  getAuthContext,
  type AuthContext,
} from "@/utils/authz";

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
        response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
      };
    }
    return { ok: true, auth };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[admin/members] getAuthContext failed:", error);

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

export async function GET() {
  const authResult = await resolveAuth();
  if (!authResult.ok) return authResult.response;
  const { auth } = authResult;

  const members = await prisma.membership.findMany({
    where: { organizationId: auth.organizationId },
    orderBy: [{ role: "asc" }, { createdAt: "asc" }],
  });

  return NextResponse.json({ members });
}

export async function PATCH(request: Request) {
  const authResult = await resolveAuth();
  if (!authResult.ok) return authResult.response;
  const { auth } = authResult;

  if (!canManageMembers(auth.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json().catch(() => null) as { membershipId?: string; role?: MembershipRole } | null;
  if (!body?.membershipId || !body.role) {
    return NextResponse.json({ error: "membershipId and role are required" }, { status: 400 });
  }

  const membership = await prisma.membership.findFirst({
    where: {
      id: body.membershipId,
      organizationId: auth.organizationId,
    },
  });
  if (!membership) return NextResponse.json({ error: "Member not found" }, { status: 404 });

  const updated = await prisma.membership.update({
    where: { id: body.membershipId },
    data: { role: body.role },
  });

  await createAuditLogEntry({
    userId: auth.userId,
    organizationId: auth.organizationId,
    action: AuditAction.UPDATE,
    entity: "membership",
    entityId: membership.id,
    metadata: { role: body.role },
  });

  return NextResponse.json({ member: updated });
}

export async function POST(request: Request) {
  const authResult = await resolveAuth();
  if (!authResult.ok) return authResult.response;
  const { auth } = authResult;

  if (!canManageMembers(auth.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json().catch(() => null) as { email?: string; role?: MembershipRole } | null;
  if (!body?.email || !body.role) {
    return NextResponse.json({ error: "email and role are required" }, { status: 400 });
  }
  const normalizedEmail = body.email.trim().toLowerCase();
  if (!normalizedEmail.includes("@")) {
    return NextResponse.json({ error: "Invalid email" }, { status: 400 });
  }

  try {
    const invite = await prisma.membershipInvite.create({
      data: {
        organizationId: auth.organizationId,
        invitedByUserId: auth.userId,
        email: normalizedEmail,
        role: body.role,
        token: crypto.randomUUID(),
        expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7),
      },
    });

    await createAuditLogEntry({
      userId: auth.userId,
      organizationId: auth.organizationId,
      action: AuditAction.CREATE,
      entity: "membership_invite",
      entityId: invite.id,
      metadata: { email: normalizedEmail, role: body.role },
    });

    return NextResponse.json({ invite }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: "Invite already exists or could not be created" }, { status: 409 });
  }
}
