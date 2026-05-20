export const dynamic = 'force-dynamic';

import { revalidatePath } from "next/cache";
import {
  createEmployeeReviewAction, createReviewCycleAction,
  getEmployeesAction, getReviewCyclesAction, getReviewsAction,
} from "@/utils/actions";
import { Trophy, Plus, Star, TrendingUp, Users, BarChart3, Calendar } from "lucide-react";
import { cn } from "@/lib/utils";

const cycleStatusCls: Record<string, string> = {
  DRAFT:  "bg-gray-500/10 text-gray-500 border-gray-200",
  ACTIVE: "bg-green-500/15 text-green-600 border-green-200",
  CLOSED: "bg-primary/10 text-primary border-primary/20",
};
const cycleStatusLabel: Record<string, string> = {
  DRAFT: "Bozza", ACTIVE: "Attivo", CLOSED: "Chiuso",
};

function StarRating({ score }: { score: number | null }) {
  if (!score) return <span className="text-xs text-muted-foreground">—</span>;
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map(i => (
        <Star key={i} className={cn("w-3.5 h-3.5", i <= score ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30")} />
      ))}
    </div>
  );
}

async function PerformancePage() {
  const [cycles, employees, reviews] = await Promise.all([
    getReviewCyclesAction(), getEmployeesAction(), getReviewsAction(),
  ]);

  const avgScore = reviews.length > 0
    ? (reviews.reduce((acc, r) => acc + (r.score ?? 0), 0) / reviews.filter(r => r.score).length).toFixed(1)
    : "—";

  async function createCycle(formData: FormData) {
    "use server";
    await createReviewCycleAction({
      name:     String(formData.get("name") ?? ""),
      startsAt: String(formData.get("startsAt") ?? ""),
      endsAt:   String(formData.get("endsAt") ?? ""),
    });
    revalidatePath("/performance");
  }

  async function saveReview(formData: FormData) {
    "use server";
    await createEmployeeReviewAction({
      employeeId:    String(formData.get("employeeId") ?? ""),
      reviewCycleId: String(formData.get("reviewCycleId") ?? ""),
      score:         Number(formData.get("score") ?? 0),
      summary:       String(formData.get("summary") ?? ""),
    });
    revalidatePath("/performance");
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Performance</h1>
          <p className="text-muted-foreground mt-1">Cicli di valutazione e review dei dipendenti</p>
        </div>
        <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center">
          <Trophy className="w-5 h-5 text-primary" />
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Cicli totali",   value: cycles.length,             icon: <BarChart3 className="w-4 h-4" />,   color: "text-primary",   bg: "bg-primary/10" },
          { label: "Cicli attivi",   value: cycles.filter(c => c.status === "ACTIVE").length, icon: <TrendingUp className="w-4 h-4" />, color: "text-green-600", bg: "bg-green-500/15" },
          { label: "Review totali",  value: reviews.length,            icon: <Star className="w-4 h-4" />,         color: "text-amber-600", bg: "bg-amber-500/15" },
          { label: "Score medio",    value: avgScore,                  icon: <Users className="w-4 h-4" />,        color: "text-primary",   bg: "bg-primary/10" },
        ].map(s => (
          <div key={s.label} className="glass rounded-2xl p-4 flex items-center gap-3">
            <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center", s.bg, s.color)}>
              {s.icon}
            </div>
            <div>
              <div className="text-2xl font-bold">{s.value}</div>
              <div className="text-xs text-muted-foreground font-medium">{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Create cycle */}
      <div className="glass rounded-3xl p-6 space-y-4">
        <h2 className="font-semibold text-primary flex items-center gap-2">
          <Plus className="w-4 h-4" /> Crea Ciclo di Valutazione
        </h2>
        <form action={createCycle} className="grid sm:grid-cols-4 gap-3">
          <input name="name" placeholder="Nome ciclo (es. Q2 2026) *" required
            className="h-10 rounded-xl border border-border bg-background/50 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
          <input name="startsAt" type="date"
            className="h-10 rounded-xl border border-border bg-background/50 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
          <input name="endsAt" type="date"
            className="h-10 rounded-xl border border-border bg-background/50 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
          <button type="submit"
            className="h-10 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors shadow-sm shadow-primary/20">
            Crea Ciclo
          </button>
        </form>
      </div>

      {/* Active cycles list */}
      {cycles.length > 0 && (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {cycles.map(cycle => {
            const cycleReviews = reviews.filter(r => r.reviewCycleId === cycle.id);
            const cycleAvg = cycleReviews.length > 0
              ? (cycleReviews.reduce((a, r) => a + (r.score ?? 0), 0) / cycleReviews.filter(r => r.score).length)
              : null;
            return (
              <div key={cycle.id} className="glass rounded-2xl p-5 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="font-semibold">{cycle.name}</div>
                    {cycle.startsAt && (
                      <div className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                        <Calendar className="w-3 h-3" />
                        {new Date(cycle.startsAt).toLocaleDateString("it-IT")}
                        {cycle.endsAt && ` → ${new Date(cycle.endsAt).toLocaleDateString("it-IT")}`}
                      </div>
                    )}
                  </div>
                  <span className={cn("text-xs px-2 py-0.5 rounded-full font-semibold border shrink-0", cycleStatusCls[cycle.status])}>
                    {cycleStatusLabel[cycle.status]}
                  </span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">{cycleReviews.length} review</span>
                  {cycleAvg && <StarRating score={Math.round(cycleAvg)} />}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add review form */}
      {cycles.length > 0 && employees.length > 0 && (
        <div className="glass rounded-3xl p-6 space-y-4">
          <h2 className="font-semibold text-primary flex items-center gap-2">
            <Star className="w-4 h-4" /> Aggiungi Valutazione
          </h2>
          <form action={saveReview} className="grid sm:grid-cols-2 lg:grid-cols-5 gap-3">
            <select name="employeeId" required
              className="h-10 rounded-xl border border-border bg-background/50 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30">
              <option value="">Dipendente</option>
              {employees.map(e => <option key={e.id} value={e.id}>{e.firstName} {e.lastName}</option>)}
            </select>
            <select name="reviewCycleId" required
              className="h-10 rounded-xl border border-border bg-background/50 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30">
              <option value="">Ciclo</option>
              {cycles.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <select name="score"
              className="h-10 rounded-xl border border-border bg-background/50 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30">
              <option value="">Score</option>
              {[1,2,3,4,5].map(n => <option key={n} value={n}>{"★".repeat(n)} ({n}/5)</option>)}
            </select>
            <input name="summary" placeholder="Commento breve"
              className="h-10 rounded-xl border border-border bg-background/50 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
            <button type="submit"
              className="h-10 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors shadow-sm shadow-primary/20">
              Salva
            </button>
          </form>
        </div>
      )}

      {/* Reviews list */}
      {reviews.length > 0 && (
        <div className="space-y-3">
          <h2 className="font-semibold text-muted-foreground text-sm uppercase tracking-wide">Ultime Valutazioni</h2>
          {reviews.map(review => (
            <div key={review.id} className="glass rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center gap-4">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-primary/60 text-white font-bold text-sm flex items-center justify-center shrink-0">
                {review.employee.firstName[0]}{review.employee.lastName[0]}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-sm">{review.employee.firstName} {review.employee.lastName}</div>
                <div className="text-xs text-muted-foreground">{review.reviewCycle.name}</div>
                {review.summary && <div className="text-xs text-muted-foreground mt-1 italic">&quot;{review.summary}&quot;</div>}
              </div>
              <StarRating score={review.score} />
            </div>
          ))}
        </div>
      )}

      {reviews.length === 0 && cycles.length === 0 && (
        <div className="glass rounded-3xl p-12 text-center text-muted-foreground">
          Crea prima un ciclo di valutazione, poi aggiungi le review.
        </div>
      )}
    </div>
  );
}

export default PerformancePage;
