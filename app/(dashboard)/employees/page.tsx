export const dynamic = 'force-dynamic';

import { revalidatePath } from "next/cache";
import { createEmployeeAction, getEmployeesAction } from "@/utils/actions";
import { Users, UserPlus, Building2, Calendar, Briefcase, Mail, CheckCircle2, Clock, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { canWrite, protectPageByRole } from "@/utils/authz";

const statusBadge: Record<string, string> = {
  ACTIVE:       "bg-green-500/15 text-green-600 border-green-200",
  ONBOARDING:   "bg-amber-500/15 text-amber-600 border-amber-200",
  OFFBOARDING:  "bg-orange-500/15 text-orange-600 border-orange-200",
  INACTIVE:     "bg-gray-500/15 text-gray-500 border-gray-200",
};

const statusLabel: Record<string, string> = {
  ACTIVE: "Attivo", ONBOARDING: "Onboarding", OFFBOARDING: "Offboarding", INACTIVE: "Inattivo",
};

async function EmployeesPage() {
  await protectPageByRole(canWrite);
  const employees = await getEmployeesAction();

  const stats = {
    total:      employees.length,
    active:     employees.filter(e => e.status === "ACTIVE").length,
    onboarding: employees.filter(e => e.status === "ONBOARDING").length,
    inactive:   employees.filter(e => e.status === "INACTIVE").length,
  };

  async function createEmployee(formData: FormData) {
    "use server";
    await createEmployeeAction({
      firstName:   String(formData.get("firstName") ?? ""),
      lastName:    String(formData.get("lastName") ?? ""),
      email:       String(formData.get("email") ?? ""),
      roleTitle:   String(formData.get("roleTitle") ?? ""),
      department:  String(formData.get("department") ?? ""),
      managerName: String(formData.get("managerName") ?? ""),
      hiredAt:     String(formData.get("hiredAt") ?? ""),
    });
    revalidatePath("/employees");
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Team & Dipendenti</h1>
          <p className="text-muted-foreground mt-1">Gestisci i membri del tuo team e il loro stato</p>
        </div>
        <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center">
          <Users className="w-5 h-5 text-primary" />
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Totale",     value: stats.total,      icon: <Users className="w-4 h-4" />,         color: "text-primary" },
          { label: "Attivi",     value: stats.active,     icon: <CheckCircle2 className="w-4 h-4" />,   color: "text-green-600" },
          { label: "Onboarding", value: stats.onboarding, icon: <Clock className="w-4 h-4" />,          color: "text-amber-600" },
          { label: "Inattivi",   value: stats.inactive,   icon: <User className="w-4 h-4" />,           color: "text-gray-500" },
        ].map(stat => (
          <div key={stat.label} className="glass rounded-2xl p-4 flex items-center gap-3">
            <div className={cn("w-9 h-9 rounded-xl bg-background/50 flex items-center justify-center", stat.color)}>
              {stat.icon}
            </div>
            <div>
              <div className="text-2xl font-bold">{stat.value}</div>
              <div className="text-xs text-muted-foreground font-medium">{stat.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Add form */}
      <div className="glass rounded-3xl p-6 space-y-4">
        <h2 className="font-semibold text-primary flex items-center gap-2">
          <UserPlus className="w-4 h-4" /> Aggiungi Dipendente
        </h2>
        <form action={createEmployee} className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <input name="firstName"   placeholder="Nome *"         required className="h-10 rounded-xl border border-border bg-background/50 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
          <input name="lastName"    placeholder="Cognome *"      required className="h-10 rounded-xl border border-border bg-background/50 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
          <input name="email"       type="email" placeholder="Email *" required className="h-10 rounded-xl border border-border bg-background/50 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
          <input name="roleTitle"   placeholder="Ruolo *"        required className="h-10 rounded-xl border border-border bg-background/50 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
          <input name="department"  placeholder="Dipartimento"            className="h-10 rounded-xl border border-border bg-background/50 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
          <input name="managerName" placeholder="Manager diretto"         className="h-10 rounded-xl border border-border bg-background/50 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
          <input name="hiredAt"     type="date"                           className="h-10 rounded-xl border border-border bg-background/50 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
          <button type="submit" className="h-10 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors shadow-sm shadow-primary/20">
            Aggiungi
          </button>
        </form>
      </div>

      {/* Employees list */}
      <div className="space-y-3">
        {employees.length === 0 && (
          <div className="glass rounded-3xl p-12 text-center text-muted-foreground">
            Nessun dipendente ancora. Aggiungine uno sopra.
          </div>
        )}
        {employees.map(employee => (
          <div key={employee.id} className="glass rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center gap-4 hover:border-primary/20 transition-all duration-200">
            {/* Avatar */}
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center text-white font-bold text-sm shrink-0">
              {employee.firstName[0]}{employee.lastName[0]}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-semibold">{employee.firstName} {employee.lastName}</span>
                <span className={cn("text-xs px-2.5 py-0.5 rounded-full font-semibold border", statusBadge[employee.status])}>
                  {statusLabel[employee.status]}
                </span>
              </div>
              <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-xs text-muted-foreground">
                <span className="flex items-center gap-1"><Briefcase className="w-3 h-3" />{employee.roleTitle}</span>
                {employee.department && <span className="flex items-center gap-1"><Building2 className="w-3 h-3" />{employee.department}</span>}
                <span className="flex items-center gap-1"><Mail className="w-3 h-3" />{employee.email}</span>
                {employee.hiredAt && (
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {new Date(employee.hiredAt).toLocaleDateString("it-IT")}
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default EmployeesPage;
