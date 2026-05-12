export const dynamic = 'force-dynamic';

import { getPublicJobsAction } from '@/utils/actions';
import { MapPin, Briefcase, Clock, Euro, Wifi, Search, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

const modeColor: Record<string, string> = {
  'Full-time': 'bg-blue-500/15 text-blue-600',
  'Part-time': 'bg-purple-500/15 text-purple-600',
  'Freelance': 'bg-orange-500/15 text-orange-600',
};

export const metadata = {
  title: 'Posizioni Aperte | Job Aletheia',
  description: 'Scopri le posizioni aperte e candidati direttamente.',
};

export default async function CareersPage({
  searchParams,
}: {
  searchParams: { sector?: string; location?: string; mode?: string; q?: string };
}) {
  const jobs = await getPublicJobsAction({
    sector:   searchParams.sector,
    location: searchParams.location,
    mode:     searchParams.mode,
  });

  const sectors = Array.from(new Set(jobs.map(j => j.sector))).sort();
  const modes   = Array.from(new Set(jobs.map(j => j.mode))).filter(Boolean);

  // Client-side text filter (done server-side for simplicity)
  const q = searchParams.q?.toLowerCase() ?? '';
  const filtered = q
    ? jobs.filter(j =>
        j.title.toLowerCase().includes(q) ||
        j.company.toLowerCase().includes(q) ||
        j.sector.toLowerCase().includes(q)
      )
    : jobs;

  return (
    <div className="min-h-screen bg-background">
      {/* Hero */}
      <div className="relative overflow-hidden bg-gradient-to-br from-primary/10 via-background to-background border-b border-border/50">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/4 w-96 h-96 rounded-full bg-primary/5 blur-3xl" />
          <div className="absolute bottom-0 right-1/4 w-64 h-64 rounded-full bg-primary/8 blur-2xl" />
        </div>
        <div className="relative max-w-5xl mx-auto px-4 py-16 text-center space-y-6">
          <div className="inline-flex items-center gap-2 text-xs font-semibold text-primary bg-primary/10 px-3 py-1.5 rounded-full border border-primary/20 uppercase tracking-wider">
            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
            Posizioni Aperte
          </div>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
            Trova il tuo <span className="text-primary">prossimo ruolo</span>
          </h1>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Esplora le posizioni disponibili e candidati in pochi click.
          </p>

          {/* Search bar */}
          <form method="GET" className="max-w-xl mx-auto">
            <div className="flex gap-2 p-1.5 glass rounded-2xl border border-white/20">
              <div className="flex items-center gap-2 flex-1 px-3">
                <Search className="w-4 h-4 text-muted-foreground shrink-0" />
                <input
                  name="q"
                  defaultValue={searchParams.q}
                  placeholder="Cerca per titolo, azienda o settore…"
                  className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground/60"
                />
              </div>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors"
              >
                Cerca
              </button>
            </div>
          </form>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-10 space-y-8">
        {/* Filters */}
        <div className="flex flex-wrap gap-3 items-center">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Settore:</span>
          <Link href="/careers"
            className={cn("text-xs px-3 py-1.5 rounded-xl font-medium border transition-all",
              !searchParams.sector ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:bg-primary/5"
            )}>Tutti</Link>
          {sectors.map(s => (
            <Link key={s} href={`/careers?sector=${encodeURIComponent(s)}`}
              className={cn("text-xs px-3 py-1.5 rounded-xl font-medium border transition-all",
                searchParams.sector === s ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:bg-primary/5"
              )}>{s}</Link>
          ))}
        </div>

        {/* Results count */}
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            <span className="font-semibold text-foreground">{filtered.length}</span>{" "}
            {filtered.length === 1 ? "posizione trovata" : "posizioni trovate"}
            {q && <span className="ml-1">per &quot;<em>{q}</em>&quot;</span>}
          </p>
          <Link href="/login" className="text-xs text-primary font-medium hover:underline">
            Sei un recruiter? Accedi →
          </Link>
        </div>

        {/* Jobs grid */}
        {filtered.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground space-y-2">
            <Briefcase className="w-12 h-12 mx-auto text-muted-foreground/30" />
            <p className="font-medium">Nessuna posizione trovata</p>
            <p className="text-sm">Prova a cambiare i filtri di ricerca</p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 gap-4">
            {filtered.map(job => (
              <div key={job.id}
                className="group glass rounded-2xl p-5 space-y-4 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5 transition-all duration-300 cursor-pointer">
                {/* Header */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <h2 className="font-bold text-base leading-tight group-hover:text-primary transition-colors">{job.title}</h2>
                    <p className="text-sm text-muted-foreground mt-0.5">{job.company}</p>
                  </div>
                  <span className={cn("text-xs px-2.5 py-1 rounded-xl font-semibold shrink-0", modeColor[job.mode] ?? "bg-gray-100 text-gray-600")}>
                    {job.mode}
                  </span>
                </div>

                {/* Meta */}
                <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{job.location}</span>
                  <span className="flex items-center gap-1"><Briefcase className="w-3 h-3" />{job.sector}</span>
                  {job.remoteType && <span className="flex items-center gap-1"><Wifi className="w-3 h-3" />{job.remoteType}</span>}
                  {(job.salaryMin || job.salaryMax) && (
                    <span className="flex items-center gap-1">
                      <Euro className="w-3 h-3" />
                      {job.salaryMin && `${(job.salaryMin / 1000).toFixed(0)}k`}
                      {job.salaryMin && job.salaryMax && " - "}
                      {job.salaryMax && `${(job.salaryMax / 1000).toFixed(0)}k`}
                    </span>
                  )}
                  {job.postedAt && (
                    <span className="flex items-center gap-1 ml-auto">
                      <Clock className="w-3 h-3" />
                      {new Date(job.postedAt).toLocaleDateString("it-IT")}
                    </span>
                  )}
                </div>

                {/* Description preview */}
                <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                  {job.description}
                </p>

                {/* CTA */}
                <div className="pt-2 border-t border-border/40">
                  <Link
                    href={`/careers/${job.id}`}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:gap-3 transition-all"
                  >
                    Scopri di più <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
