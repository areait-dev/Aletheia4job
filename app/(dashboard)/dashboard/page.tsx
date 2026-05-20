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
  CalendarX,
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
      {/* Welcome Header + CTA */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl sm:text-4xl font-black tracking-tight leading-tight">
            Bentornato su <span className="text-primary italic">Aletheia</span>
          </h1>
          <p className="text-muted-foreground mt-2 text-base">Ecco cosa sta succedendo nella tua organizzazione oggi.</p>
        </div>
        <div className="flex gap-2 shrink-0">
          <Link
            href="/add-job"
            className="group h-10 px-5 rounded-xl bg-primary text-primary-foreground font-bold text-sm flex items-center gap-2 hover:bg-primary/90 transition-all shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 active:scale-[0.97]"
          >
            <UserPlus className="w-4 h-4 group-hover:scale-110 transition-transform" />
            <span>Nuovo Candidato</span>
          </Link>
        </div>
      </div>

      {/* Primary Stats Grid — 4 card su una riga con larghezze identiche */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-5">
        {[
          { label: "Candidati Totali", value: stats.totalCandidates, icon: <Users />, color: "text-blue-600", bg: "bg-blue-500/10", href: "/jobs" },
          { label: "Posizioni Aperte", value: openPositions, icon: <Briefcase />, color: "text-indigo-600", bg: "bg-indigo-500/10", href: "/positions" },
          { label: "Team Attivo", value: activeEmployees, icon: <Users />, color: "text-green-600", bg: "bg-green-500/10", href: "/employees" },
          { label: "Documenti Firma", value: pendingSignatures, icon: <Files />, color: "text-amber-600", bg: "bg-amber-500/10", href: "/documents" },
        ].map((s, idx) => (
          <Link key={idx} href={s.href} className="glass-card group rounded-2xl sm:rounded-[2.5rem] p-5 sm:p-8 flex flex-col gap-4 sm:gap-6 hover:border-primary/40 transition-all duration-300 hover:-translate-y-1">
            <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform", s.bg, s.color)}>
              {s.icon}
            </div>
            <div>
              <div className="text-2xl sm:text-4xl font-black">{s.value}</div>
              <div className="text-sm font-bold uppercase tracking-widest text-muted-foreground mt-1">{s.label}</div>
            </div>
          </Link>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Upcoming Interviews */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <h2 className="text-2xl font-bold flex items-center gap-3">
              <Calendar className="w-6 h-6 text-primary" /> Prossimi Colloqui
            </h2>
            <Link href="/calendar" className="text-sm font-bold text-primary hover:underline flex items-center gap-1">
              Vedi Calendario <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          
          <div className="space-y-3">
            {interviews.length === 0 ? (
              <div className="glass-card rounded-3xl p-6 sm:p-10 text-center flex flex-col items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-muted/50 flex items-center justify-center">
                  <CalendarX className="w-7 h-7 text-muted-foreground/40" />
                </div>
                <div>
                  <p className="font-semibold text-foreground/70">Nessun colloquio programmato</p>
                  <p className="text-sm text-muted-foreground/60 mt-0.5">I prossimi appuntamenti appariranno qui.</p>
                </div>
              </div>
            ) : (
              interviews.map(i => (
                <div key={i.id} className="glass-card rounded-2xl p-4 sm:p-5 flex items-center justify-between hover:bg-white/50 dark:hover:bg-white/5 transition-all duration-200">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-primary/15 backdrop-blur-sm flex items-center justify-center text-primary font-bold ring-1 ring-primary/20">
                      {i.candidate.firstName[0]}{i.candidate.lastName[0]}
                    </div>
                    <div>
                      <div className="font-bold">{i.candidate.firstName} {i.candidate.lastName}</div>
                      <div className="text-xs text-muted-foreground flex items-center gap-2">
                        <Clock className="w-3 h-3" /> {new Date(i.scheduledAt).toLocaleString("it-IT", { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-tighter px-2 py-1 bg-background/60 backdrop-blur-sm border border-white/20 rounded-lg">{i.type}</span>
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
              <Link href="/attendance" className="glass-card rounded-[2rem] p-6 flex items-center gap-4 border-amber-300/30 hover:bg-amber-50/30 dark:hover:bg-amber-500/10 transition-all duration-200">
                <div className="w-12 h-12 rounded-2xl bg-amber-500/15 backdrop-blur-sm text-amber-600 flex items-center justify-center shrink-0 ring-1 ring-amber-500/20">
                  <Clock className="w-6 h-6" />
                </div>
                <div>
                  <div className="font-bold text-amber-900 dark:text-amber-300">{pendingAbsences} Richieste Assenza</div>
                  <div className="text-xs text-amber-700/70 dark:text-amber-400/70">Da revisionare ed approvare</div>
                </div>
              </Link>
            )}

            {pendingReviews > 0 && (
              <Link href="/performance" className="glass-card rounded-[2rem] p-6 flex items-center gap-4 border-green-300/30 hover:bg-green-50/30 dark:hover:bg-green-500/10 transition-all duration-200">
                <div className="w-12 h-12 rounded-2xl bg-green-500/15 backdrop-blur-sm text-green-600 flex items-center justify-center shrink-0 ring-1 ring-green-500/20">
                  <Star className="w-6 h-6" />
                </div>
                <div>
                  <div className="font-bold text-green-900 dark:text-green-300">{pendingReviews} Cicli Valutazione</div>
                  <div className="text-xs text-green-700/70 dark:text-green-400/70">Cicli attivi in corso</div>
                </div>
              </Link>
            )}

            <div className="glass-card rounded-[2rem] p-8 text-center space-y-4 bg-primary/10 border-primary/30">
               <PlusCircle className="w-10 h-10 text-primary mx-auto opacity-60" />
               <p className="text-sm font-medium text-foreground/80">Vuoi migliorare la tua ricerca? Attiva il multiposting su LinkedIn.</p>
               <Link href="/admin" className="block text-xs font-black uppercase tracking-widest text-primary hover:underline">Configura Ora →</Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
