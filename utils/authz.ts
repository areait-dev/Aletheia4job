import { MembershipRole, AuditAction, Prisma } from "@prisma/client";
import prisma from "./db";
import { redirect } from "next/navigation";
import { createClient } from "./supabase/server";
import { 
  canWrite, 
  canAccessDocuments, 
  canManageOrg, 
  canAccessAdmin, 
  canApproveAbsence, 
  canManageMembers 
} from "./permissions";

export { 
  canWrite, 
  canAccessDocuments, 
  canManageOrg, 
  canAccessAdmin, 
  canApproveAbsence, 
  canManageMembers 
};

export type AuthContext = {
  userId: string;
  organizationId: string;
  role: MembershipRole;
};

export async function getAuthContext(): Promise<AuthContext | null> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return null;
  }

  const userId = user.id;
  const email = user.email?.toLowerCase() ?? null;

  // Cerchiamo la membership principale dell'utente
  let membership = await prisma.membership.findFirst({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });

  if (!membership) {
    // Se non ha una membership, cerchiamo se il suo dominio email è mappato a un'organizzazione
    const domain = email?.split("@")[1] ?? null;
    const mapped = domain
      ? await prisma.organizationDomain.findFirst({
          where: { domain },
        })
      : null;

    if (mapped) {
      membership = await prisma.membership.create({
        data: {
          userId,
          organizationId: mapped.organizationId,
          role: MembershipRole.VIEWER,
        },
      });
    } else {
      // Altrimenti creiamo una nuova organizzazione per lui (Personal Org)
      const organization = await prisma.organization.create({
        data: {
          name: `Org di ${user.user_metadata?.full_name || email || userId.slice(0, 8)}`,
        },
      });

      membership = await prisma.membership.create({
        data: {
          userId,
          organizationId: organization.id,
          role: MembershipRole.OWNER,
        },
      });
    }
  }

  return {
    userId,
    organizationId: membership.organizationId,
    role: membership.role,
  };
}

export async function getCurrentUserPrimaryEmail() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user?.email?.toLowerCase() ?? null;
}

export async function getCurrentUserDisplayName() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return "User";
  
  return (
    user.user_metadata?.full_name ||
    user.user_metadata?.first_name ||
    user.email?.split("@")[0] ||
    "User"
  );
}

// ─── PERMISSIONS ──────────────────────────────────────────────────────────


// ─── AUDIT ────────────────────────────────────────────────────────────────

export async function createAuditLogEntry(params: {
  userId: string;
  organizationId: string;
  action: AuditAction;
  entity: string;
  entityId?: string;
  metadata?: Prisma.InputJsonValue;
}) {
  await prisma.auditLog.create({
    data: params,
  });
}

// ─── HELPERS ──────────────────────────────────────────────────────────────

export async function protectPageByRole(checkFn: (role: MembershipRole) => boolean) {
  const auth = await getAuthContext();
  if (!auth) redirect("/login"); // Con Supabase la rotta è solitamente /login
  if (!checkFn(auth.role)) {
    redirect("/dashboard");
  }
  return auth;
}
