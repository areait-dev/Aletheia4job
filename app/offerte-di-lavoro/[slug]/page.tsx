import { getPublicJobByIdAction, resolvePublicJobSlugAction } from '@/utils/actions';
import { notFound, redirect } from 'next/navigation';
import { MapPin, Briefcase, Clock, Euro, ArrowLeft, Star, LayoutDashboard, MapPinned, ListChecks } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import JobApplicationForm from '@/components/JobApplicationForm';
import { createClient } from '@/utils/supabase/server';
import { truncateAtWordBoundary } from '@/utils/text';

const modeColor: Record<string, string> = {
  'Full-time': 'bg-blue-500/15 text-blue-600',
  'Part-time': 'bg-purple-500/15 text-purple-600',
  'Freelance': 'bg-orange-500/15 text-orange-600',
};

export async function generateMetadata({ params }: { params: { slug: string } }) {
  const resolved = await resolvePublicJobSlugAction(params.slug);
  if (!resolved) return { title: 'Posizione non trovata' };
  const job = await getPublicJobByIdAction(resolved.id);
  if (!job) return { title: 'Posizione non trovata' };

  const title = `${job.title} - ${job.company}`;
  const description = job.description
    ? truncateAtWordBoundary(job.description, 160)
    : `Candidati ora per la posizione di ${job.title} presso ${job.company}.`;
  const url = `/offerte-di-lavoro/${resolved.canonicalSlug}`;

  // og:image e' generata automaticamente da opengraph-image.tsx (file
  // convention Next.js) per questa stessa route: non va indicata qui,
  // altrimenti sovrascriverebbe l'immagine dinamica generata.
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      type: 'website',
      url,
      title,
      description,
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
    },
  };
}

function jobPostingJsonLd(job: NonNullable<Awaited<ReturnType<typeof getPublicJobByIdAction>>>, siteUrl: string, canonicalSlug: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'JobPosting',
    title: job.title,
    description: job.description ?? job.title,
    identifier: {
      '@type': 'PropertyValue',
      name: job.company,
      value: job.id,
    },
    datePosted: job.postedAt ? new Date(job.postedAt).toISOString() : undefined,
    employmentType: job.mode?.toUpperCase().replace('-', '_'),
    hiringOrganization: {
      '@type': 'Organization',
      name: job.company,
      logo: job.companyLogoUrl || undefined,
    },
    jobLocation: {
      '@type': 'Place',
      address: {
        '@type': 'PostalAddress',
        addressLocality: job.location,
        addressCountry: 'IT',
      },
    },
    baseSalary: (job.salaryMin || job.salaryMax) ? {
      '@type': 'MonetaryAmount',
      currency: job.salaryCurrency || 'EUR',
      value: {
        '@type': 'QuantitativeValue',
        minValue: job.salaryMin || undefined,
        maxValue: job.salaryMax || undefined,
        unitText: 'YEAR',
      },
    } : undefined,
    directApply: true,
    url: `${siteUrl}/offerte-di-lavoro/${canonicalSlug}`,
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

// I testi salvati iniziano quasi sempre con la stessa frase di presentazione
// dell'agenzia ("Alètheia S.r.l., Agenzia per il Lavoro di Promotergroup
// S.p.A., ricerca... per azienda operante nel settore..."), che ora mostriamo
// già in modo fisso in cima alla pagina. La rimuoviamo dalla descrizione per
// evitare di ripeterla due volte.
function stripAgencyIntro(text: string | null | undefined): string {
  if (!text) return '';
  const trimmed = text.trim();
  if (/^Al[eè]theia\s*S\.?r\.?l\.?/i.test(trimmed)) {
    const firstSentenceEnd = trimmed.indexOf('. ');
    if (firstSentenceEnd !== -1) {
      return trimmed.slice(firstSentenceEnd + 2).trim();
    }
  }
  return trimmed;
}

// Trasforma un campo di testo libero in un elenco di righe pulite, pronte per
// essere renderizzate come <ul><li>. I testi salvati non hanno sempre "a capo"
// reali tra un punto e l'altro (es. "Laurea in informatica; Disponibilità
// immediata. Buone capacità relazionali."): oltre al newline, spezziamo quindi
// anche su ";" o "." seguiti da una maiuscola, per ottenere comunque un vero
// elenco puntato invece di un unico blocco di testo.
function splitToBulletLines(text: string | null | undefined): string[] {
  return (text ?? '')
    .split(/\r?\n/)
    .flatMap(line => line.split(/(?<=[;.])\s+(?=[A-ZÀ-Ú])/))
    .map(line => line.replace(/^[-•*]\s*/, '').trim())
    .filter(line => line.length > 0);
}

export default async function CareerJobPage({ params }: { params: { slug: string } }) {
  const resolved = await resolvePublicJobSlugAction(params.slug);
  if (!resolved) notFound();
  if (params.slug !== resolved.canonicalSlug) redirect(`/offerte-di-lavoro/${resolved.canonicalSlug}`);

  const job = await getPublicJobByIdAction(resolved.id);
  if (!job) notFound();

  const hasMultipleSites = job.locationInputType === 'select' || job.locationInputType === 'free_text';

  const requirementsText = hasMultipleSites ? stripLocationTail(job.requirements) : job.requirements;

  const responsibilities = splitToBulletLines(job.responsibilities);
  const benefits = splitToBulletLines(job.benefits);
  const requirementsList = splitToBulletLines(requirementsText);

  const sedeMetaValue = job.locationInputType === 'select'
    ? `${job.locationOptions.length} sedi disponibili`
    : job.locationInputType === 'free_text'
    ? 'Più sedi disponibili'
    : job.location;

  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const isLoggedIn = !!user;

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://aletheia4job.it';

  return (
    <div className="min-h-screen bg-background">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jobPostingJsonLd(job, siteUrl, resolved.canonicalSlug)) }}
      />
      {/* Top bar */}
      <div className="border-b border-border/50 bg-background/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors font-medium">
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

    {/* Testo annuncio */}
        <section className="glass rounded-3xl p-6 sm:p-8 space-y-7">
          {/* Introduzione */}
          <p className="text-sm sm:text-base leading-relaxed">
            <span className="font-semibold text-primary">Aletheia Srl</span>, Agenzia per il Lavoro di{' '}
            <span className="font-semibold text-primary">Promotergroup S.p.A.</span>, ricerca per azienda cliente
            operante nel settore <span className="font-semibold">{job.sector}</span>:
          </p>

          {/* Principali responsabilità */}
          {responsibilities.length > 0 && (
            <div className="space-y-3">
              <h2 className="font-bold text-base sm:text-lg">La risorsa si occuperà di:</h2>
              <ul className="list-disc pl-5 space-y-2.5 text-muted-foreground text-sm sm:text-base leading-relaxed">
                {responsibilities.map((line, i) => <li key={i}>{line}</li>)}
              </ul>
            </div>
          )}

          {/* Si offre */}
          {benefits.length > 0 && (
            <div className="space-y-3">
              <h2 className="font-bold text-base sm:text-lg">Si offre:</h2>
              <ul className="list-disc pl-5 space-y-2.5 text-muted-foreground text-sm sm:text-base leading-relaxed">
                {benefits.map((line, i) => <li key={i}>{line}</li>)}
              </ul>
            </div>
          )}

          {/* Requisiti */}
          {requirementsList.length > 0 && (
            <div className="space-y-3">
              <h2 className="font-bold text-base sm:text-lg flex items-center gap-2">
                <ListChecks className="w-4 h-4 text-primary" />
                Requisiti:
              </h2>
              <ul className="list-disc pl-5 space-y-2.5 text-muted-foreground text-sm sm:text-base leading-relaxed">
                {requirementsList.map((line, i) => <li key={i}>{line}</li>)}
              </ul>
            </div>
          )}

        </section>

        {/* Application Form anchor */}
        <div id="apply" className="scroll-mt-24">
          <JobApplicationForm
            jobId={job.id}
            jobTitle={job.title}
            locationInputType={job.locationInputType}
            locationOptions={job.locationOptions}
          />
        </div>
      </div>

      {/* Footer minimale — la CTA "Candidati" resta l'elemento con più peso visivo */}
      <footer className="bg-white/40 dark:bg-background/40 backdrop-blur-sm border-t border-white/20 dark:border-white/10">
        <div className="max-w-4xl mx-auto px-4 py-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-muted-foreground">
          <p>© {new Date().getFullYear()} Alètheia4Job. Tutti i diritti riservati.</p>
          <div className="flex items-center gap-4">
            <a href="mailto:supporto@aletheia4job.it" className="hover:text-primary transition-colors">
              supporto@aletheia4job.it
            </a>
            <Link href="/" className="hover:text-primary transition-colors">
              Privacy Policy
            </Link>
          </div>
        </div>
      </footer>
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
