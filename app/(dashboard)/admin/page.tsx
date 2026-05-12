export const dynamic = 'force-dynamic';

import { Globe, Shield, Users, BarChart3, Clock, ArrowRight } from "lucide-react";
import { AuditAction, MembershipRole } from "@prisma/client";
import { revalidatePath } from "next/cache";
import {
  createMemberInviteAction,
  getAuditLogsAction,
  getCurrentOrganizationContextAction,
  getPendingInvitesAction,
  resendMemberInviteAction,
  revokeMemberInviteAction,
  getTenantMembersAction,
  updateMemberRoleAction,
} from "@/utils/actions";
import { canAccessAdmin, protectPageByRole } from "@/utils/authz";

const roles = Object.values(MembershipRole);
const auditActions = Object.values(AuditAction);

async function AdminPage({
  searchParams,
}: {
  searchParams?: { entity?: string; action?: string; fromDate?: string; toDate?: string; cronofy?: string };
}) {
  await protectPageByRole(canAccessAdmin);
  const context = await getCurrentOrganizationContextAction();
  const members = await getTenantMembersAction();
  const pendingInvites = await getPendingInvitesAction();
  const logs = await getAuditLogsAction({
    limit: 30,
    entity: searchParams?.entity || undefined,
    action: (searchParams?.action as AuditAction) || undefined,
    fromDate: searchParams?.fromDate || undefined,
    toDate: searchParams?.toDate || undefined,
  });
  const canManage = context.role === MembershipRole.OWNER || context.role === MembershipRole.ADMIN;

  async function updateRole(formData: FormData) {
    "use server";
    const membershipId = String(formData.get("membershipId") ?? "");
    const role = String(formData.get("role") ?? "") as MembershipRole;
    if (!membershipId || !roles.includes(role)) return;
    await updateMemberRoleAction(membershipId, role);
    revalidatePath("/admin");
  }

  async function createInvite(formData: FormData) {
    "use server";
    const email = String(formData.get("email") ?? "");
    const role = String(formData.get("role") ?? "") as MembershipRole;
    if (!email || !roles.includes(role)) return;
    await createMemberInviteAction(email, role);
    revalidatePath("/admin");
  }

  async function revokeInvite(formData: FormData) {
    "use server";
    const inviteId = String(formData.get("inviteId") ?? "");
    if (!inviteId) return;
    await revokeMemberInviteAction(inviteId);
    revalidatePath("/admin");
  }

  async function resendInvite(formData: FormData) {
    "use server";
    const inviteId = String(formData.get("inviteId") ?? "");
    if (!inviteId) return;
    await resendMemberInviteAction(inviteId);
    revalidatePath("/admin");
  }

  return (
    <section className="space-y-8">
      <header>
        <h1 className="text-2xl font-bold">Tenant Admin</h1>
        <p className="text-sm text-muted-foreground mt-2">
          Organization: <span className="font-semibold">{context.organizationName}</span> - Role:{" "}
          <span className="font-semibold">{context.role}</span>
        </p>
      </header>

      <div className="rounded-xl border p-4">
        <h2 className="font-semibold mb-4">Invite Member</h2>
        <form action={createInvite} className="flex flex-wrap items-center gap-3">
          <input
            name="email"
            type="email"
            placeholder="new.member@company.com"
            className="h-9 min-w-[280px] rounded-md border bg-background px-3 text-sm"
            disabled={!canManage}
          />
          <select
            name="role"
            defaultValue={MembershipRole.RECRUITER}
            className="h-9 rounded-md border bg-background px-3 text-sm"
            disabled={!canManage}
          >
            {roles.map((role) => (
              <option key={role} value={role}>
                {role}
              </option>
            ))}
          </select>
          <button type="submit" className="h-9 rounded-md border px-3 text-sm font-medium" disabled={!canManage}>
            Send Invite
          </button>
        </form>
        <div className="mt-4 space-y-2">
          {pendingInvites.length === 0 ? (
            <p className="text-sm text-muted-foreground">No pending invites.</p>
          ) : (
            pendingInvites.map((invite) => (
              <div key={invite.id} className="text-sm border rounded-md p-3">
                <div className="font-medium">{invite.email}</div>
                <div className="text-muted-foreground">
                  role: {invite.role} | expires: {invite.expiresAt ? new Date(invite.expiresAt).toLocaleDateString() : "-"}
                </div>
                <div className="mt-1">
                  <code className="text-xs break-all">/invite/{invite.token}</code>
                </div>
                <div className="mt-3 flex items-center gap-2">
                  <form action={resendInvite}>
                    <input type="hidden" name="inviteId" value={invite.id} />
                    <button
                      type="submit"
                      className="h-8 rounded-md border px-3 text-xs font-medium"
                      disabled={!canManage}
                    >
                      Resend
                    </button>
                  </form>
                  <form action={revokeInvite}>
                    <input type="hidden" name="inviteId" value={invite.id} />
                    <button
                      type="submit"
                      className="h-8 rounded-md border px-3 text-xs font-medium"
                      disabled={!canManage}
                    >
                      Revoke
                    </button>
                  </form>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="rounded-xl border p-4">
        <h2 className="font-semibold mb-4">Members</h2>
        <div className="space-y-3">
          {members.map((member) => (
            <form key={member.id} action={updateRole} className="flex items-center gap-3">
              <input type="hidden" name="membershipId" value={member.id} />
              <div className="min-w-[260px] text-sm">
                <div className="font-medium">{member.userId}</div>
                <div className="text-muted-foreground">Joined: {new Date(member.createdAt).toLocaleDateString()}</div>
              </div>
              <select
                name="role"
                defaultValue={member.role}
                className="h-9 rounded-md border bg-background px-3 text-sm"
                disabled={!canManage}
              >
                {roles.map((role) => (
                  <option value={role} key={role}>
                    {role}
                  </option>
                ))}
              </select>
              <button
                type="submit"
                className="h-9 rounded-md border px-3 text-sm font-medium"
                disabled={!canManage}
              >
                Save
              </button>
            </form>
          ))}
        </div>
        {!canManage && (
          <p className="text-xs text-muted-foreground mt-3">
            You can view members but only OWNER/ADMIN can change roles.
          </p>
        )}
      </div>

      <div className="rounded-xl border p-4 bg-primary/5 border-primary/20">
        <h2 className="font-semibold mb-2 flex items-center gap-2 text-primary">
          <Globe className="w-4 h-4" /> Integrations & Multiposting
        </h2>
        {searchParams?.cronofy ? (
          <p className="text-sm mb-4">
            Cronofy: <span className="font-semibold">{searchParams.cronofy}</span>
          </p>
        ) : null}
        <p className="text-sm text-muted-foreground mb-4">
          Utilizza i seguenti link per collegare le tue offerte di lavoro agli aggregatori esterni.
        </p>
        <div className="space-y-4">
          <div className="p-3 bg-background rounded-lg border">
            <p className="text-xs font-bold uppercase tracking-wider mb-1">Calendari (Cronofy)</p>
            <div className="flex items-center justify-between gap-3">
              <code className="text-xs flex-1 truncate">/api/integrations/cronofy/connect</code>
              <a
                href="/api/integrations/cronofy/connect"
                className="text-xs font-bold text-primary hover:underline"
              >
                Connetti →
              </a>
            </div>
            <p className="text-[10px] text-muted-foreground mt-2 italic">
              Dopo la connessione, la sincronizzazione bidirezionale avviene via webhook su /api/webhooks/cronofy.
            </p>
          </div>
          <div className="p-3 bg-background rounded-lg border">
            <p className="text-xs font-bold uppercase tracking-wider mb-1">XML Job Feed (Indeed, Jooble, LinkedIn)</p>
            <div className="flex items-center gap-3">
              <code className="text-xs flex-1 truncate">/api/jobs/feed</code>
              <a 
                href="/api/jobs/feed" 
                target="_blank"
                className="text-xs font-bold text-primary hover:underline"
              >
                Apri Feed →
              </a>
            </div>
            <p className="text-[10px] text-muted-foreground mt-2 italic">
              Configura questo URL nei tuoi account recruiter su Indeed, Jooble o LinkedIn per l'importazione automatica.
            </p>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {['LinkedIn', 'Indeed', 'Jooble'].map(platform => (
              <div key={platform} className="p-3 bg-background rounded-lg border text-center">
                <div className="font-bold text-sm mb-1">{platform}</div>
                <div className="text-[10px] text-green-600 font-semibold uppercase">Pronto al collegamento</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="rounded-xl border p-4">
        <h2 className="font-semibold mb-4">Recent Audit Logs</h2>
        <form method="GET" className="mb-4 flex flex-wrap items-center gap-3">
          <input
            name="entity"
            defaultValue={searchParams?.entity ?? ""}
            placeholder="Entity (candidate, job, membership...)"
            className="h-9 min-w-[240px] rounded-md border bg-background px-3 text-sm"
          />
          <select
            name="action"
            defaultValue={searchParams?.action ?? ""}
            className="h-9 rounded-md border bg-background px-3 text-sm"
          >
            <option value="">All actions</option>
            {auditActions.map((action) => (
              <option key={action} value={action}>
                {action}
              </option>
            ))}
          </select>
          <input
            name="fromDate"
            type="date"
            defaultValue={searchParams?.fromDate ?? ""}
            className="h-9 rounded-md border bg-background px-3 text-sm"
          />
          <input
            name="toDate"
            type="date"
            defaultValue={searchParams?.toDate ?? ""}
            className="h-9 rounded-md border bg-background px-3 text-sm"
          />
          <button type="submit" className="h-9 rounded-md border px-3 text-sm font-medium">
            Filter
          </button>
        </form>
        <div className="space-y-2">
          {logs.length === 0 ? (
            <p className="text-sm text-muted-foreground">No logs available or insufficient permissions.</p>
          ) : (
            logs.map((log) => (
              <div key={log.id} className="text-sm border rounded-md p-3">
                <div className="font-medium">
                  {log.action} - {log.entity}
                </div>
                <div className="text-muted-foreground">
                  user: {log.userId} | entityId: {log.entityId ?? "-"} | {new Date(log.createdAt).toLocaleString()}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </section>
  );
}

export default AdminPage;
