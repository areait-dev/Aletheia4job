import { 
  getCandidateStatsAction, 
  getEmployeesAction, 
  getUpcomingInterviewsAction, 
  getReviewCyclesAction,
  getAbsencesAction,
  getDocumentsAction,
  getAllJobsAction
} from "@/utils/actions";
import { 
  Users, 
  Briefcase, 
  Calendar, 
  Star, 
  Clock, 
  Files, 
  TrendingUp,
  ArrowRight,
  UserPlus,
  PlusCircle
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

export const revalidate = 30;

export default async function DashboardPage() {
  const [
    stats,
    employees,
    interviews,
    cycles,
    absences,
    documents,
    jobs
  ] = await Promise.all([
    getCandidateStatsAction(),
    getEmployeesAction(),
    getUpcomingInterviewsAction(5),
    getReviewCyclesAction(),
    getAbsencesAction({ from: new Date().toISOString() }),
    getDocumentsAction(),
    getAllJobsAction()
  ]);

  const activeEmployees = employees.filter(e => e.status === "ACTIVE").length;
  const pendingAbsences = absences.filter(a => a.status === "REQUESTED").length;
  const pendingReviews = cycles.filter(c => c.status === "ACTIVE").length;
  const openPositions = jobs.filter(j => j.status === "Aperto").length;
  const pendingSignatures = documents.filter(d => d.signatureStatus === "SENT").length;

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Welcome Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black tracking-tight">Bentornato su <span className="text-primary italic">Aletheia</span></h1>
          <p className="text-muted-foreground mt-2 text-lg">Ecco cosa sta succedendo nella tua organizzazione oggi.</p>
        </div>
        <div className="flex gap-3">
          <Link href="/add-candidate" className="h-12 px-6 rounded-2xl bg-primary text-primary-foreground font-bold flex items-center gap-2 hover:opacity-90 transition-opacity shadow-lg shadow-primary/20">
            <UserPlus className="w-5 h-5" /> Nuovo Candidato
          </Link>
        </div>
      </div>

      {/* Primary Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: "Candidati Totali", value: stats.totalCandidates, icon: <Users />, color: "text-blue-600", bg: "bg-blue-500/10", href: "/jobs" },
          { label: "Posizioni Aperte", value: openPositions, icon: <Briefcase />, color: "text-indigo-600", bg: "bg-indigo-500/10", href: "/positions" },
          { label: "Team Attivo", value: activeEmployees, icon: <Users />, color: "text-green-600", bg: "bg-green-500/10", href: "/employees" },
          { label: "Documenti Firma", value: pendingSignatures, icon: <Files />, color: "text-amber-600", bg: "bg-amber-500/10", href: "/documents" },
        ].map((s, idx) => (
          <Link key={idx} href={s.href} className="glass group rounded-[2.5rem] p-8 flex flex-col gap-6 hover:border-primary/30 transition-all duration-300">
            <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform", s.bg, s.color)}>
              {s.icon}
            </div>
            <div>
              <div className="text-4xl font-black">{s.value}</div>
              <div className="text-sm font-bold uppercase tracking-widest text-muted-foreground mt-1">{s.label}</div>
            </div>
          </Link>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Upcoming Interviews */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold flex items-center gap-3">
              <Calendar className="w-6 h-6 text-primary" /> Prossimi Colloqui
            </h2>
            <Link href="/calendar" className="text-sm font-bold text-primary hover:underline flex items-center gap-1">
              Vedi Calendario <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          
          <div className="space-y-3">
            {interviews.length === 0 ? (
              <div className="glass rounded-3xl p-12 text-center text-muted-foreground italic">Nessun colloquio programmato.</div>
            ) : (
              interviews.map(i => (
                <div key={i.id} className="glass rounded-2xl p-5 flex items-center justify-between hover:bg-white/40 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary font-bold">
                      {i.candidate.firstName[0]}{i.candidate.lastName[0]}
                    </div>
                    <div>
                      <div className="font-bold">{i.candidate.firstName} {i.candidate.lastName}</div>
                      <div className="text-xs text-muted-foreground flex items-center gap-2">
                        <Clock className="w-3 h-3" /> {new Date(i.scheduledAt).toLocaleString("it-IT", { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-tighter px-2 py-1 bg-background border rounded-lg">{i.type}</span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Notifications / Alerts Sidebar */}
        <div className="space-y-6">
          <h2 className="text-2xl font-bold flex items-center gap-3">
            <TrendingUp className="w-6 h-6 text-primary" /> Azioni Richieste
          </h2>
          
          <div className="space-y-4">
            {pendingAbsences > 0 && (
              <Link href="/attendance" className="glass rounded-[2rem] p-6 flex items-center gap-4 border-amber-200/50 hover:bg-amber-50/50 transition-colors">
                <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-600 flex items-center justify-center shrink-0">
                  <Clock className="w-6 h-6" />
                </div>
                <div>
                  <div className="font-bold text-amber-900">{pendingAbsences} Richieste Assenza</div>
                  <div className="text-xs text-amber-700/70">Da revisionare ed approvare</div>
                </div>
              </Link>
            )}

            {pendingReviews > 0 && (
              <Link href="/performance" className="glass rounded-[2rem] p-6 flex items-center gap-4 border-green-200/50 hover:bg-green-50/50 transition-colors">
                <div className="w-12 h-12 rounded-2xl bg-green-500/10 text-green-600 flex items-center justify-center shrink-0">
                  <Star className="w-6 h-6" />
                </div>
                <div>
                  <div className="font-bold text-green-900">{pendingReviews} Cicli Valutazione</div>
                  <div className="text-xs text-green-700/70">Cicli attivi in corso</div>
                </div>
              </Link>
            )}

            <div className="glass rounded-[2rem] p-8 text-center space-y-4 bg-primary/5 border-primary/20">
               <PlusCircle className="w-10 h-10 text-primary mx-auto opacity-50" />
               <p className="text-sm font-medium">Vuoi migliorare la tua ricerca? Attiva il multiposting su LinkedIn.</p>
               <Link href="/admin" className="block text-xs font-black uppercase tracking-widest text-primary hover:underline">Configura Ora →</Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
