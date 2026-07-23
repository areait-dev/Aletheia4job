export const dynamic = 'force-dynamic';

import type { Metadata } from 'next';
import { Suspense } from 'react';
import { getPublicJobsAction, getPublicJobSlugMapAction } from '@/utils/actions';
import { MapPin, Briefcase, Clock, Euro, Wifi, Search, ArrowRight, LayoutDashboard, Linkedin, Instagram, Facebook } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { createClient } from '@/utils/supabase/server';
import SectorFilterDropdown from '@/components/SectorFilterDropdown';

const modeColor: Record<string, string> = {
  'Full-time': 'bg-blue-500/15 text-blue-600',
  'Part-time': 'bg-purple-500/15 text-purple-600',
  'Freelance': 'bg-orange-500/15 text-orange-600',
};

export const metadata: Metadata = {
  title: "Offerte di Lavoro | Alètheia4Job – Agenzia per il Lavoro",
  description: "Sfoglia le offerte di lavoro pubblicate su Alètheia4Job, agenzia per il lavoro autorizzata ANPAL. Annunci aggiornati, selezione professionale, supporto reale dalla candidatura all'assunzione.",
  alternates: { canonical: '/' },
};

export default async function CareersPage({
  searchParams,
}: {
  searchParams: { sector?: string; location?: string; mode?: string; q?: string };
}) {
  const [jobs, slugMap] = await Promise.all([
    getPublicJobsAction({
      sector:   searchParams.sector,
      location: searchParams.location,
      mode:     searchParams.mode,
    }),
    getPublicJobSlugMapAction(),
  ]);
  const slugById = new Map(slugMap.map(e => [e.id, e.slug]));

  const sectors = Array.from(new Set(jobs.map(j => j.sector))).sort();

  // Client-side text filter (done server-side for simplicity)
  const q = searchParams.q?.toLowerCase() ?? '';
  const filtered = q
    ? jobs.filter(j =>
        j.title.toLowerCase().includes(q) ||
        j.company.toLowerCase().includes(q) ||
        j.sector.toLowerCase().includes(q)
      )
    : jobs;

  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const isLoggedIn = !!user;

  return (
    <div className="min-h-screen bg-background">
      {/* Hero */}
      <div className="relative overflow-hidden bg-gradient-to-br from-primary/15 via-muted/40 to-background border-b border-border/50 min-h-[70vh] flex items-center">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/4 w-96 h-96 rounded-full bg-primary/10 blur-3xl" />
          <div className="absolute bottom-0 right-1/4 w-64 h-64 rounded-full bg-primary/10 blur-2xl" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(0,0,0,0.03),transparent_60%)]" />
        </div>
        <div className="relative w-full max-w-5xl mx-auto px-4 py-16 text-center space-y-6">
          <div className="flex items-center justify-center gap-3">
            <div className="inline-flex items-center gap-2 text-xs font-semibold text-primary bg-primary/10 px-3 py-1.5 rounded-full border border-primary/20 uppercase tracking-wider">
              <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
              Offerte di lavoro
            </div>
            {isLoggedIn && (
              <Link
                href="/dashboard"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-foreground bg-muted/80 px-3 py-1.5 rounded-full border border-border hover:bg-muted transition-colors"
              >
                <LayoutDashboard className="w-3.5 h-3.5" />
                ATS
              </Link>
            )}
          </div>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
            Smetti di cercare. <span className="text-primary">Inizia a trovare.</span>
          </h1>

          <p className="text-base md:text-lg text-muted-foreground font-medium">
            Esplora le posizioni disponibili e candidati in pochi click.
          </p>

          <form method="GET" className="max-w-2xl mx-auto">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 p-2 bg-white/70 dark:bg-background/70 backdrop-blur-md rounded-2xl sm:rounded-full border border-white/40 dark:border-white/10 shadow-sm shadow-black/5 focus-within:ring-2 focus-within:ring-primary/30 transition-shadow">
              <div className="flex items-center gap-2.5 flex-1 px-4">
                <Search className="w-4 h-4 text-muted-foreground shrink-0" />
                <input
                  name="q"
                  defaultValue={searchParams.q}
                  placeholder="Cerca per titolo, azienda o settore…"
                  className="flex-1 min-w-0 bg-transparent text-sm py-2 outline-none placeholder:text-muted-foreground/60"
                />
              </div>
              <div className="flex gap-2">
                <button
                  type="submit"
                  className="flex-1 sm:flex-none px-6 py-2.5 rounded-full bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 active:scale-95 transition-all shadow-sm"
                >
                  Cerca
                </button>
                <Link
                  href="/registrazione"
                  className="flex-1 sm:flex-none inline-flex items-center justify-center h-11 rounded-full bg-primary/10 border border-primary/30 px-5 text-sm font-semibold text-primary hover:bg-primary hover:text-primary-foreground active:scale-95 transition-all duration-200 whitespace-nowrap"
                >
                  Candidatura spontanea
                </Link>
              </div>
            </div>
          </form>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-10 space-y-8">
        {/* Filters */}
        <div className="flex items-center">
          <Suspense fallback={null}>
            <SectorFilterDropdown sectors={sectors} activeSector={searchParams.sector} />
          </Suspense>
        </div>

        {/* Results count */}
        <div className="flex items-center justify-between gap-2 flex-wrap">
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
            {filtered.map(job => (
              <div key={job.id}
                className="group bg-white/70 dark:bg-background/70 backdrop-blur-md rounded-2xl overflow-hidden border border-white/40 dark:border-white/10 shadow-sm hover:border-primary/30 hover:shadow-xl hover:shadow-primary/10 hover:-translate-y-1 transition-all duration-300 cursor-pointer">
                {job.imageUrl && (
                  <div className="w-full bg-muted/40">
                    <img
                      src={job.imageUrl}
                      alt={job.title}
                      className="w-full h-auto"
                    />
                  </div>
                )}
                <div className="p-4 sm:p-5 space-y-4">
                {/* Header */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    {job.companyLogoUrl && (
                      <img
                        src={job.companyLogoUrl}
                        alt={`Logo ${job.company}`}
                        className="w-10 h-10 rounded-xl object-contain bg-white border border-border/50 shrink-0"
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <h2 className="font-semibold text-base leading-tight line-clamp-2 group-hover:text-primary transition-colors">{job.title}</h2>
                      <p className="text-sm text-muted-foreground mt-0.5 truncate">{job.company}</p>
                    </div>
                  </div>
                  <span className={cn("text-xs px-2.5 py-1 rounded-full font-semibold shrink-0", modeColor[job.mode] ?? "bg-gray-100 text-gray-600")}>
                    {job.mode}
                  </span>
                </div>

                {/* Meta */}
                <div className="flex flex-wrap gap-1.5 text-xs">
                  <span className="flex items-center gap-1 px-2 py-1 rounded-full bg-muted/60 text-muted-foreground"><MapPin className="w-3 h-3" />{job.location}</span>
                  <span className="flex items-center gap-1 px-2 py-1 rounded-full bg-muted/60 text-muted-foreground"><Briefcase className="w-3 h-3" />{job.sector}</span>
                  {job.remoteType && <span className="flex items-center gap-1 px-2 py-1 rounded-full bg-muted/60 text-muted-foreground"><Wifi className="w-3 h-3" />{job.remoteType}</span>}
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
                    href={`/offerte-di-lavoro/${slugById.get(job.id) ?? job.id}`}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:gap-3 transition-all"
                  >
                    Scopri di più <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <footer className="bg-white/40 dark:bg-background/40 backdrop-blur-sm border-t border-white/20 dark:border-white/10">
        <div className="max-w-6xl mx-auto px-4 py-12">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
            {/* Info */}
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-foreground">Aletheia4Job</h3>
              <p className="text-xs text-muted-foreground leading-relaxed max-w-xs">
                La piattaforma che connette talenti e aziende, semplificando la ricerca del lavoro e la selezione dei candidati.
              </p>
              <div className="flex items-center gap-3 pt-1">
                <a href="#" aria-label="LinkedIn" className="text-muted-foreground hover:text-primary transition-colors">
                  <Linkedin className="w-4 h-4" />
                </a>
                <a href="#" aria-label="Instagram" className="text-muted-foreground hover:text-primary transition-colors">
                  <Instagram className="w-4 h-4" />
                </a>
                <a href="#" aria-label="Facebook" className="text-muted-foreground hover:text-primary transition-colors">
                  <Facebook className="w-4 h-4" />
                </a>
              </div>
            </div>

            {/* Link utili */}
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-foreground">Link utili</h3>
              <ul className="space-y-2 text-xs text-muted-foreground">
                <li><Link href="/" className="hover:text-primary transition-colors">Candidati</Link></li>
                <li><Link href="/login" className="hover:text-primary transition-colors">Aziende</Link></li>
                <li><Link href="/" className="hover:text-primary transition-colors">Chi Siamo</Link></li>
                <li><Link href="/" className="hover:text-primary transition-colors">FAQ</Link></li>
              </ul>
            </div>

            {/* Note legali & contatti */}
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-foreground">Note legali &amp; contatti</h3>
              <ul className="space-y-2 text-xs text-muted-foreground">
                <li>
                  <a href="mailto:supporto@aletheia4job.it" className="hover:text-primary transition-colors">supporto@aletheia4job.it</a>
                </li>
                <li>P.IVA 00000000000</li>
                <li><Link href="/" className="hover:text-primary transition-colors">Privacy Policy</Link></li>
                <li><Link href="/" className="hover:text-primary transition-colors">Cookie Policy</Link></li>
                <li>
                  <a href="https://anpal.gov.it" target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors">
                    Autorizzazione ANPAL
                  </a>
                </li>
              </ul>
            </div>
          </div>

          <div className="mt-10 pt-6 border-t border-white/20 dark:border-white/10 text-center">
            <p className="text-xs text-muted-foreground">
              © {new Date().getFullYear()} Aletheia4Job. Tutti i diritti riservati.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
