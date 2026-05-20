'use client';

import { useState } from "react";
import { 
  createAbsenceAction, 
  updateAbsenceStatusAction, 
  deleteAbsenceAction,
  upsertAttendanceEntryAction 
} from "@/utils/actions";
import { useRouter } from "next/navigation";
import { 
  Calendar, 
  Clock, 
  Plus, 
  Check, 
  X, 
  Trash2, 
  Briefcase, 
  Coffee, 
  Umbrella, 
  Stethoscope 
} from "lucide-react";
import { cn } from "@/lib/utils";

type AttendanceClientProps = {
  employees: any[];
  initialAbsences: any[];
  initialAttendance: any[];
};

export default function AttendanceClient({ employees, initialAbsences, initialAttendance }: AttendanceClientProps) {
  const [activeTab, setActiveTab] = useState<"presenze" | "assenze">("presenze");
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  async function handleCreateAbsence(formData: FormData) {
    setIsLoading(true);
    const result = await createAbsenceAction({
      employeeId: String(formData.get("employeeId")),
      type: formData.get("type") as any,
      startDate: String(formData.get("startDate")),
      endDate: String(formData.get("endDate")),
      notes: String(formData.get("notes") || ""),
    });
    setIsLoading(false);
    if (result.ok) router.refresh();
  }

  async function handleUpdateStatus(id: string, status: string) {
    await updateAbsenceStatusAction(id, status as any);
    router.refresh();
  }

  async function handleDeleteAbsence(id: string) {
    if (confirm("Sei sicuro di voler eliminare questa richiesta?")) {
      await deleteAbsenceAction(id);
      router.refresh();
    }
  }

  async function handleUpsertAttendance(formData: FormData) {
    setIsLoading(true);
    const result = await upsertAttendanceEntryAction({
      employeeId: String(formData.get("employeeId")),
      date: String(formData.get("date")),
      minutesWorked: Number(formData.get("hours")) * 60,
      overtimeMinutes: Number(formData.get("overtime") || 0) * 60,
      notes: String(formData.get("notes") || ""),
    });
    setIsLoading(false);
    if (result.ok) router.refresh();
  }

  const absenceTypeIcons: Record<string, any> = {
    FERIE: <Umbrella className="w-4 h-4" />,
    PERMESSO: <Coffee className="w-4 h-4" />,
    MALATTIA: <Stethoscope className="w-4 h-4" />,
    ALTRO: <Plus className="w-4 h-4" />,
  };

  const statusColors: Record<string, string> = {
    REQUESTED: "text-amber-600 bg-amber-500/10 border-amber-200",
    APPROVED: "text-green-600 bg-green-500/10 border-green-200",
    REJECTED: "text-red-600 bg-red-500/10 border-red-200",
  };

  return (
    <div className="space-y-6">
      {/* Tabs Selector */}
      <div className="flex p-1 bg-background/50 border rounded-2xl w-fit">
        <button
          onClick={() => setActiveTab("presenze")}
          className={cn(
            "px-6 py-2 text-sm font-semibold rounded-xl transition-all duration-200 flex items-center gap-2",
            activeTab === "presenze" ? "bg-primary text-primary-foreground shadow-md" : "text-muted-foreground hover:bg-background"
          )}
        >
          <Clock className="w-4 h-4" /> Presenze
        </button>
        <button
          onClick={() => setActiveTab("assenze")}
          className={cn(
            "px-6 py-2 text-sm font-semibold rounded-xl transition-all duration-200 flex items-center gap-2",
            activeTab === "assenze" ? "bg-primary text-primary-foreground shadow-md" : "text-muted-foreground hover:bg-background"
          )}
        >
          <Calendar className="w-4 h-4" /> Assenze
        </button>
      </div>

      {activeTab === "presenze" ? (
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Form Presenze */}
          <div className="lg:col-span-1 glass rounded-3xl p-6 h-fit sticky top-6">
            <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
              <Plus className="w-5 h-5 text-primary" /> Registra Ore
            </h3>
            <form action={handleUpsertAttendance} className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase text-muted-foreground ml-1">Dipendente</label>
                <select name="employeeId" required className="w-full h-11 rounded-xl border bg-background/50 px-3 text-sm focus:ring-2 focus:ring-primary/20 outline-none">
                  {employees.map(e => (
                    <option key={e.id} value={e.id}>{e.firstName} {e.lastName}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase text-muted-foreground ml-1">Data</label>
                <input name="date" type="date" required defaultValue={new Date().toISOString().split('T')[0]} className="w-full h-11 rounded-xl border bg-background/50 px-3 text-sm focus:ring-2 focus:ring-primary/20 outline-none" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase text-muted-foreground ml-1">Ore Lavorate</label>
                  <input name="hours" type="number" step="0.5" required placeholder="8" className="w-full h-11 rounded-xl border bg-background/50 px-3 text-sm focus:ring-2 focus:ring-primary/20 outline-none" />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase text-muted-foreground ml-1">Straordinari</label>
                  <input name="overtime" type="number" step="0.5" placeholder="0" className="w-full h-11 rounded-xl border bg-background/50 px-3 text-sm focus:ring-2 focus:ring-primary/20 outline-none" />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase text-muted-foreground ml-1">Note</label>
                <textarea name="notes" placeholder="Dettagli attività..." className="w-full h-24 rounded-xl border bg-background/50 px-3 py-2 text-sm focus:ring-2 focus:ring-primary/20 outline-none resize-none" />
              </div>
              <button
                type="submit"
                disabled={isLoading}
                className="w-full h-12 bg-primary text-primary-foreground font-bold rounded-xl hover:bg-primary/90 transition-colors shadow-lg shadow-primary/20 disabled:opacity-50"
              >
                {isLoading ? "Salvataggio..." : "Salva Presenza"}
              </button>
            </form>
          </div>

          {/* List Presenze */}
          <div className="lg:col-span-2 space-y-4">
            <div className="glass rounded-3xl overflow-x-auto border-0">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b bg-background/30">
                    <th className="p-4 text-xs font-bold uppercase text-muted-foreground">Dipendente</th>
                    <th className="p-4 text-xs font-bold uppercase text-muted-foreground">Data</th>
                    <th className="p-4 text-xs font-bold uppercase text-muted-foreground text-center">Ore</th>
                    <th className="p-4 text-xs font-bold uppercase text-muted-foreground text-center">Extra</th>
                    <th className="p-4 text-xs font-bold uppercase text-muted-foreground">Note</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {initialAttendance.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-12 text-center text-muted-foreground italic">Nessuna presenza registrata.</td>
                    </tr>
                  ) : (
                    initialAttendance.map((entry) => (
                      <tr key={entry.id} className="hover:bg-primary/5 transition-colors group">
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary font-bold text-xs">
                              {entry.employee.firstName[0]}{entry.employee.lastName[0]}
                            </div>
                            <span className="font-semibold text-sm">{entry.employee.firstName} {entry.employee.lastName}</span>
                          </div>
                        </td>
                        <td className="p-4 text-sm font-medium">
                          {new Date(entry.date).toLocaleDateString("it-IT", { day: 'numeric', month: 'short' })}
                        </td>
                        <td className="p-4 text-center">
                          <span className="bg-blue-500/10 text-blue-600 px-2 py-1 rounded-md text-xs font-bold">
                            {entry.minutesWorked / 60}h
                          </span>
                        </td>
                        <td className="p-4 text-center">
                          {entry.overtimeMinutes ? (
                            <span className="bg-amber-500/10 text-amber-600 px-2 py-1 rounded-md text-xs font-bold">
                              +{entry.overtimeMinutes / 60}h
                            </span>
                          ) : "-"}
                        </td>
                        <td className="p-4 text-xs text-muted-foreground max-w-[200px] truncate">
                          {entry.notes || "-"}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Form Assenze */}
          <div className="lg:col-span-1 glass rounded-3xl p-6 h-fit sticky top-6">
            <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
              <Plus className="w-5 h-5 text-primary" /> Nuova Richiesta
            </h3>
            <form action={handleCreateAbsence} className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase text-muted-foreground ml-1">Dipendente</label>
                <select name="employeeId" required className="w-full h-11 rounded-xl border bg-background/50 px-3 text-sm focus:ring-2 focus:ring-primary/20 outline-none">
                  {employees.map(e => (
                    <option key={e.id} value={e.id}>{e.firstName} {e.lastName}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase text-muted-foreground ml-1">Tipo Assenza</label>
                <div className="grid grid-cols-2 gap-2">
                  {["FERIE", "PERMESSO", "MALATTIA", "ALTRO"].map((type) => (
                    <label key={type} className="flex items-center gap-2 p-2 border rounded-xl cursor-pointer hover:bg-primary/5 transition-colors">
                      <input type="radio" name="type" value={type} required className="text-primary focus:ring-primary" />
                      <span className="text-[10px] font-bold uppercase">{type}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase text-muted-foreground ml-1">Dal</label>
                  <input name="startDate" type="date" required className="w-full h-11 rounded-xl border bg-background/50 px-3 text-sm focus:ring-2 focus:ring-primary/20 outline-none" />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase text-muted-foreground ml-1">Al</label>
                  <input name="endDate" type="date" required className="w-full h-11 rounded-xl border bg-background/50 px-3 text-sm focus:ring-2 focus:ring-primary/20 outline-none" />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase text-muted-foreground ml-1">Motivazione</label>
                <textarea name="notes" placeholder="Note facoltative..." className="w-full h-24 rounded-xl border bg-background/50 px-3 py-2 text-sm focus:ring-2 focus:ring-primary/20 outline-none resize-none" />
              </div>
              <button
                type="submit"
                disabled={isLoading}
                className="w-full h-12 bg-primary text-primary-foreground font-bold rounded-xl hover:bg-primary/90 transition-colors shadow-lg shadow-primary/20 disabled:opacity-50"
              >
                {isLoading ? "Invio..." : "Invia Richiesta"}
              </button>
            </form>
          </div>

          {/* List Assenze */}
          <div className="lg:col-span-2 space-y-4">
            {initialAbsences.length === 0 ? (
              <div className="glass rounded-3xl p-12 text-center text-muted-foreground italic">Nessuna richiesta di assenza trovata.</div>
            ) : (
              initialAbsences.map((absence) => (
                <div key={absence.id} className="glass rounded-2xl p-5 hover:border-primary/20 transition-all duration-200">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-background border flex items-center justify-center text-primary">
                        {absenceTypeIcons[absence.type]}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-base">{absence.employee.firstName} {absence.employee.lastName}</span>
                          <span className={cn("text-[10px] px-2 py-0.5 rounded-full font-bold border uppercase tracking-wider", statusColors[absence.status])}>
                            {absence.status === "REQUESTED" ? "In attesa" : absence.status === "APPROVED" ? "Approvata" : "Rifiutata"}
                          </span>
                        </div>
                        <div className="text-sm text-muted-foreground mt-1 flex items-center gap-2">
                          <span className="font-medium text-primary uppercase text-[10px] tracking-widest">{absence.type}</span>
                          <span>•</span>
                          <span>Dal {new Date(absence.startDate).toLocaleDateString()} al {new Date(absence.endDate).toLocaleDateString()}</span>
                        </div>
                        {absence.notes && <p className="text-xs text-muted-foreground mt-2 italic">"{absence.notes}"</p>}
                      </div>
                    </div>

                    <div className="flex flex-col gap-2">
                      {absence.status === "REQUESTED" && (
                        <div className="flex items-center gap-1">
                          <button 
                            onClick={() => handleUpdateStatus(absence.id, "APPROVED")}
                            className="p-2 rounded-xl bg-green-500/10 text-green-600 hover:bg-green-500/20 transition-colors"
                            title="Approva"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => handleUpdateStatus(absence.id, "REJECTED")}
                            className="p-2 rounded-xl bg-red-500/10 text-red-600 hover:bg-red-500/20 transition-colors"
                            title="Rifiuta"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                      <button 
                        onClick={() => handleDeleteAbsence(absence.id)}
                        className="p-2 rounded-xl text-muted-foreground hover:bg-red-500/10 hover:text-red-500 transition-colors ml-auto"
                        title="Elimina"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
