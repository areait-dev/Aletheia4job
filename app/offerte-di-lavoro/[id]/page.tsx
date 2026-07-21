import { getPublicJobByIdAction } from '@/utils/actions';
import { notFound } from 'next/navigation';
import { MapPin, Briefcase, Clock, Euro, ArrowLeft, Star, LayoutDashboard, MapPinned, ListChecks } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import JobApplicationForm from '@/components/JobApplicationForm';
import { createClient } from '@/utils/supabase/server';

const modeColor: Record<string, string> = {
  'Full-time': 'bg-blue-500/15 text-blue-600',
  'Part-time': 'bg-purple-500/15 text-purple-600',
  'Freelance': 'bg-orange-500/15 text-orange-600',
};

export async function generateMetadata({ params }: { params: { id: string } }) {
  const job = await getPublicJobByIdAction(params.id);
  return {
    title: job ? `${job.title} | Offerte di Lavoro - Job Aletheia` : 'Posizione non trovata',
    description: job?.description?.slice(0, 160),
  };
}

// Marcatori che nel testo originale introducono l'elenco delle sedi (es. "Sedi:",
// "SEDI", "Sede di lavoro:"). Per gli annunci multi-sede questo elenco viene
// mostrato nella sezione dedicata "Sedi disponibili", quindi va tagliato via dal
// testo di descrizione/requisiti per non ripeterlo due volte. Puramente
// presentazionale: non modifica i dati salvati, solo cosa viene renderizzato.
const LOCATION_TAIL_MARKERS = [
  /\bSEDI\b/,
  /\bSedi\b/,
  /\bSede di lavoro\b/i,
  /\bSedi di lavoro\b/i,
];

function stripLocationTail(text: string | null | undefined): string {
  if (!text) return '';
  let cutIndex = text.length;
  for (const re of LOCATION_TAIL_MARKERS) {
    const m = text.match(re);
    if (m && m.index !== undefined && m.index < cutIndex) cutIndex = m.index;
  }
  return text.slice(0, cutIndex).trim();
}

export default async function CareerJobPage({ params }: { params: { id: string } }) {
  const job = await getPublicJobByIdAction(params.id);
  if (!job) notFound();

  const hasMultipleSites = job.locationInputType === 'select' || job.locationInputType === 'free_text';

  const description = hasMultipleSites ? stripLocationTail(job.description) : job.description;
  const requirementsText = hasMultipleSites ? stripLocationTail(job.requirements) : job.requirements;

  const benefits = job.benefits
    ?.split('\n')
    .map(b => b.replace(/^[-•*]\s*/, '').trim())
    .filter(Boolean) ?? [];

  const sedeMetaValue = job.locationInputType === 'select'
    ? `${job.locationOptions.length} sedi disponibili`
    : job.locationInputType === 'free_text'
    ? 'Più sedi disponibili'
    : job.location;

  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const isLoggedIn = !!user;

  return (
    <div className="min-h-screen bg-background">
      {/* Top bar */}
      <div className="border-b border-border/50 bg-background/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/offerte-di-lavoro" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors font-medium">
              <ArrowLeft className="w-4 h-4" /> Tutte le posizioni
            </Link>
            {isLoggedIn && (
              <Link
                href="/dashboard"
                className="flex items-center gap-1.5 text-xs font-semibold text-foreground bg-muted/80 px-2.5 py-1.5 rounded-full border border-border hover:bg-muted transition-colors"
              >
                <LayoutDashboard className="w-3 h-3" />
                ATS
              </Link>
            )}
          </div>
              <a
                href="#apply"
                className="px-4 py-2 sm:px-5 sm:py-2.5 rounded-xl bg-primary text-primary-foreground text-xs sm:text-sm font-semibold hover:bg-primary/90 transition-colors shadow-sm shadow-primary/20"
              >
            Candidati ora
          </a>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-10 space-y-8">
        {/* Immagine annuncio */}
        {job.imageUrl && (
          <div className="w-full rounded-2xl sm:rounded-3xl bg-muted/40 overflow-hidden">
            <img
              src={job.imageUrl}
              alt={job.title}
              className="w-full h-auto"
            />
          </div>
        )}

        {/* Hero */}
        <div className="glass rounded-2xl sm:rounded-3xl p-5 sm:p-8 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-start gap-4">
            {job.companyLogoUrl && (
              <img
                src={job.companyLogoUrl}
                alt={`Logo ${job.company}`}
                className="w-16 h-16 rounded-2xl object-contain bg-white border border-border/50 shadow-lg shadow-primary/10 shrink-0"
              />
            )}
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <span className={cn("text-xs px-2.5 py-1 rounded-xl font-semibold", modeColor[job.mode] ?? "bg-gray-100 text-gray-600")}>
                  {job.mode}
                </span>
                {job.remoteType && (
                  <span className="text-xs px-2.5 py-1 rounded-xl bg-primary/10 text-primary font-semibold">
                    {job.remoteType}
                  </span>
                )}
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">{job.title}</h1>
              <p className="text-muted-foreground font-medium mt-1">{job.company}</p>
            </div>
          </div>

          {/* Meta grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <MetaCard icon={<MapPin className="w-4 h-4" />} label="Sede" value={sedeMetaValue} />
            <MetaCard icon={<Briefcase className="w-4 h-4" />} label="Settore" value={job.sector} />
            {(job.salaryMin || job.salaryMax) && (
              <MetaCard
                icon={<Euro className="w-4 h-4" />}
                label="RAL"
                value={
                  job.salaryMin && job.salaryMax
                    ? `€${(job.salaryMin / 1000).toFixed(0)}k – €${(job.salaryMax / 1000).toFixed(0)}k`
                    : job.salaryMin
                    ? `da €${(job.salaryMin / 1000).toFixed(0)}k`
                    : `fino a €${(job.salaryMax! / 1000).toFixed(0)}k`
                }
              />
            )}
            {job.experienceLevel && (
              <MetaCard icon={<Star className="w-4 h-4" />} label="Esperienza" value={job.experienceLevel} />
            )}
            {job.postedAt && (
              <MetaCard
                icon={<Clock className="w-4 h-4" />}
                label="Pubblicato"
                value={new Date(job.postedAt).toLocaleDateString("it-IT")}
              />
            )}
          </div>
        </div>

        {/* Sedi disponibili — solo per annunci multi-sede */}
        {hasMultipleSites && (
          <section className="glass rounded-2xl sm:rounded-3xl p-5 sm:p-6 space-y-3">
            <div className="flex items-center gap-2">
              <MapPinned className="w-5 h-5 text-primary" />
              <h2 className="font-bold text-lg">Sedi disponibili</h2>
            </div>
            {job.locationInputType === 'select' ? (
              <div className="flex flex-wrap gap-2">
                {job.locationOptions.map(loc => (
                  <span
                    key={loc}
                    className="text-sm font-medium px-3 py-1.5 rounded-full bg-primary/10 text-primary border border-primary/20"
                  >
                    {loc}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Questo annuncio è disponibile per numerose sedi diverse: consulta l&apos;elenco completo nel testo dell&apos;annuncio qui sotto, poi indica nel form la sede per cui ti candidi.
              </p>
            )}
          </section>
        )}

        <div className={cn("grid gap-8", benefits.length > 0 ? "lg:grid-cols-3" : "lg:grid-cols-1 w-full")}>
          {/* Main content */}
          <div className={cn(benefits.length > 0 ? "lg:col-span-2" : "", "space-y-8")}>
            {/* Description */}
            <section className="glass rounded-3xl p-6 sm:p-8 space-y-4">
              <h2 className="font-bold text-xl">Descrizione della posizione</h2>
              <div className="text-sm sm:text-base text-muted-foreground leading-relaxed whitespace-pre-wrap">
                {description}
              </div>
            </section>

            {/* Requirements */}
            {requirementsText && (
              <section className="glass rounded-3xl p-6 sm:p-8 space-y-4">
                <div className="flex items-center gap-2">
                  <ListChecks className="w-5 h-5 text-primary" />
                  <h2 className="font-bold text-xl">Requisiti</h2>
                </div>
                <div className="text-sm sm:text-base text-muted-foreground leading-relaxed whitespace-pre-wrap">
                  {requirementsText}
                </div>
              </section>
            )}

            {/* Application Form anchor */}
            <div id="apply" className="scroll-mt-24 pt-4">
              <JobApplicationForm
                jobId={job.id}
                jobTitle={job.title}
                locationInputType={job.locationInputType}
                locationOptions={job.locationOptions}
              />
            </div>
          </div>

          {/* Sidebar */}
          {benefits.length > 0 && (
            <div className="space-y-6">
              <div className="glass rounded-2xl sm:rounded-3xl p-4 sm:p-6 space-y-4">
                <h3 className="font-bold text-lg">Cosa offriamo</h3>
                <ul className="space-y-3">
                  {benefits.map((b, i) => (
                    <li key={i} className="flex items-start gap-3 text-sm text-muted-foreground">
                      <div className="w-1.5 h-1.5 rounded-full bg-primary mt-2 shrink-0" />
                      {b}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function MetaCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-primary/5 border border-primary/10 p-3 space-y-1">
      <div className="flex items-center gap-1.5 text-primary">{icon}
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
      </div>
      <div className="text-sm font-semibold truncate" title={value}>{value}</div>
    </div>
  );
}
