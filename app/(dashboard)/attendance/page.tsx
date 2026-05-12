export const dynamic = 'force-dynamic';

import { getEmployeesAction, getAbsencesAction, getAttendanceEntriesAction } from "@/utils/actions";
import AttendanceClient from "@/components/AttendanceClient";
import { 
  Calendar as CalendarIcon, 
  Clock, 
  Plane, 
  AlertCircle,
  CheckCircle2,
  XCircle,
  Timer
} from "lucide-react";

export default async function AttendancePage() {
  const [employees, absences, attendance] = await Promise.all([
    getEmployeesAction(),
    getAbsencesAction(),
    getAttendanceEntriesAction()
  ]);

  // Semplici statistiche
  const pendingAbsences = absences.filter(a => a.status === "REQUESTED").length;
  const totalHoursThisMonth = attendance.reduce((acc, curr) => acc + (curr.minutesWorked / 60), 0);

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Presenze & Assenze</h1>
          <p className="text-muted-foreground mt-1">Gestisci orari di lavoro, ferie e permessi del team</p>
        </div>
        <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center">
          <Timer className="w-5 h-5 text-primary" />
        </div>
      </div>

      {/* Stats Quick View */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="glass rounded-2xl p-4 flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-600">
            <AlertCircle className="w-5 h-5" />
          </div>
          <div>
            <div className="text-2xl font-bold">{pendingAbsences}</div>
            <div className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Richieste in attesa</div>
          </div>
        </div>
        <div className="glass rounded-2xl p-4 flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-600">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <div className="text-2xl font-bold">{totalHoursThisMonth.toFixed(1)}h</div>
            <div className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Ore totali registrate</div>
          </div>
        </div>
        <div className="glass rounded-2xl p-4 flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center text-green-600">
            <Plane className="w-5 h-5" />
          </div>
          <div>
            <div className="text-2xl font-bold">{absences.filter(a => a.status === "APPROVED").length}</div>
            <div className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Assenze approvate</div>
          </div>
        </div>
      </div>

      <AttendanceClient 
        employees={employees} 
        initialAbsences={absences} 
        initialAttendance={attendance} 
      />
    </div>
  );
}
