export const dynamic = 'force-dynamic';

import { revalidatePath } from "next/cache";
import {
  createOnboardingTaskAction, getEmployeesAction,
  getOnboardingTasksAction, updateOnboardingTaskStatusAction,
} from "@/utils/actions";
import { OnboardingTaskStatus } from "@prisma/client";
import { ClipboardList, CheckCircle2, Clock, Circle, Plus, User, Calendar } from "lucide-react";
import { cn } from "@/lib/utils";

const statuses = Object.values(OnboardingTaskStatus);

const statusConfig: Record<string, { label: string; icon: React.ReactNode; cls: string }> = {
  TODO:        { label: "Da fare",    icon: <Circle className="w-3.5 h-3.5" />,       cls: "bg-gray-500/10 text-gray-500 border-gray-200" },
  IN_PROGRESS: { label: "In corso",  icon: <Clock className="w-3.5 h-3.5" />,        cls: "bg-amber-500/15 text-amber-600 border-amber-200" },
  DONE:        { label: "Completato",icon: <CheckCircle2 className="w-3.5 h-3.5" />, cls: "bg-green-500/15 text-green-600 border-green-200" },
};

async function OnboardingPage() {
  const [employees, tasks] = await Promise.all([getEmployeesAction(), getOnboardingTasksAction()]);

  const stats = {
    total:      tasks.length,
    todo:       tasks.filter(t => t.status === "TODO").length,
    inProgress: tasks.filter(t => t.status === "IN_PROGRESS").length,
    done:       tasks.filter(t => t.status === "DONE").length,
  };

  const completionPct = stats.total > 0 ? Math.round((stats.done / stats.total) * 100) : 0;

  async function createTask(formData: FormData) {
    "use server";
    await createOnboardingTaskAction({
      employeeId: String(formData.get("employeeId") ?? ""),
      title:      String(formData.get("title") ?? ""),
      dueDate:    String(formData.get("dueDate") ?? ""),
    });
    revalidatePath("/onboarding");
  }

  async function updateStatus(formData: FormData) {
    "use server";
    const taskId = String(formData.get("taskId") ?? "");
    const status = String(formData.get("status") ?? "") as OnboardingTaskStatus;
    if (!taskId || !statuses.includes(status)) return;
    await updateOnboardingTaskStatusAction(taskId, status);
    revalidatePath("/onboarding");
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Onboarding</h1>
          <p className="text-muted-foreground mt-1">Traccia le attività di inserimento dei nuovi dipendenti</p>
        </div>
        <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center">
          <ClipboardList className="w-5 h-5 text-primary" />
        </div>
      </div>

      {/* Stats + progress */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Totale",     value: stats.total,      color: "text-primary",    bg: "bg-primary/10" },
          { label: "Da fare",    value: stats.todo,       color: "text-gray-500",   bg: "bg-gray-500/10" },
          { label: "In corso",   value: stats.inProgress, color: "text-amber-600",  bg: "bg-amber-500/15" },
          { label: "Completate", value: stats.done,       color: "text-green-600",  bg: "bg-green-500/15" },
        ].map(s => (
          <div key={s.label} className="glass rounded-2xl p-4 flex items-center gap-3">
            <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center text-lg font-bold", s.bg, s.color)}>
              {s.value}
            </div>
            <div className="text-sm font-medium text-muted-foreground">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Global progress bar */}
      {stats.total > 0 && (
        <div className="glass rounded-2xl p-4 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="font-medium text-muted-foreground">Completamento globale</span>
            <span className="font-bold text-primary">{completionPct}%</span>
          </div>
          <div className="h-2 rounded-full bg-primary/10 overflow-hidden">
            <div className="h-full rounded-full bg-gradient-to-r from-primary to-primary/60 transition-all duration-700"
              style={{ width: `${completionPct}%` }} />
          </div>
        </div>
      )}

      {/* Add task form */}
      <div className="glass rounded-3xl p-6 space-y-4">
        <h2 className="font-semibold text-primary flex items-center gap-2">
          <Plus className="w-4 h-4" /> Nuova Attività
        </h2>
        <form action={createTask} className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <select name="employeeId" required
            className="h-10 rounded-xl border border-border bg-background/50 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30">
            <option value="">Seleziona dipendente</option>
            {employees.map(e => (
              <option key={e.id} value={e.id}>{e.firstName} {e.lastName}</option>
            ))}
          </select>
          <input name="title" placeholder="Titolo attività *" required
            className="h-10 rounded-xl border border-border bg-background/50 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
          <input name="dueDate" type="date"
            className="h-10 rounded-xl border border-border bg-background/50 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
          <button type="submit"
            className="h-10 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors shadow-sm shadow-primary/20">
            Aggiungi Attività
          </button>
        </form>
      </div>

      {/* Tasks grouped by employee */}
      {employees.map(employee => {
        const empTasks = tasks.filter(t => t.employee.id === employee.id);
        if (empTasks.length === 0) return null;
        const empDone = empTasks.filter(t => t.status === "DONE").length;
        const empPct  = Math.round((empDone / empTasks.length) * 100);
        return (
          <div key={employee.id} className="glass rounded-3xl p-5 space-y-4">
            {/* Employee header */}
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-primary/60 text-white font-bold text-sm flex items-center justify-center">
                {employee.firstName[0]}{employee.lastName[0]}
              </div>
              <div className="flex-1">
                <div className="font-semibold text-sm">{employee.firstName} {employee.lastName}</div>
                <div className="text-xs text-muted-foreground">{employee.roleTitle}</div>
              </div>
              <div className="text-xs font-bold text-primary">{empPct}%</div>
            </div>
            {/* Mini progress */}
            <div className="h-1.5 rounded-full bg-primary/10 overflow-hidden">
              <div className="h-full rounded-full bg-primary transition-all duration-500"
                style={{ width: `${empPct}%` }} />
            </div>
            {/* Tasks */}
            <div className="space-y-2">
              {empTasks.map(task => (
                <form key={task.id} action={updateStatus}
                  className="flex items-center gap-3 p-3 rounded-xl bg-background/30 hover:bg-primary/5 transition-colors">
                  <input type="hidden" name="taskId" value={task.id} />
                  <div className={cn("shrink-0 flex items-center gap-1 text-xs px-2 py-1 rounded-lg font-medium border", statusConfig[task.status]?.cls)}>
                    {statusConfig[task.status]?.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className={cn("text-sm font-medium", task.status === "DONE" && "line-through text-muted-foreground")}>
                      {task.title}
                    </div>
                    {task.dueDate && (
                      <div className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                        <Calendar className="w-3 h-3" />
                        Scadenza: {new Date(task.dueDate).toLocaleDateString("it-IT")}
                      </div>
                    )}
                  </div>
                  <select name="status" defaultValue={task.status}
                    className="h-8 rounded-lg border border-border bg-background/50 px-2 text-xs focus:outline-none focus:ring-2 focus:ring-primary/30">
                    {statuses.map(s => <option key={s} value={s}>{statusConfig[s]?.label}</option>)}
                  </select>
                  <button type="submit"
                    className="h-8 px-3 rounded-lg bg-primary/10 text-primary text-xs font-semibold hover:bg-primary/20 transition-colors shrink-0">
                    Salva
                  </button>
                </form>
              ))}
            </div>
          </div>
        );
      })}

      {tasks.length === 0 && (
        <div className="glass rounded-3xl p-12 text-center text-muted-foreground">
          Nessuna attività di onboarding. Aggiungi la prima sopra.
        </div>
      )}
    </div>
  );
}

export default OnboardingPage;
