import Link from 'next/link';
import type { Metadata } from 'next';
import { GraduationCap, Briefcase, Lightbulb, Target, Send, Database, Search, HeartHandshake } from 'lucide-react';
import Logo from '@/components/Logo';
import Reveal from '@/components/Reveal';
import ThemeToggle from '@/components/ThemeToggle';
import TeacherLongListForm from '@/components/TeacherLongListForm';

const TITLE = 'Diventa Docente Alètheia | Entra nella Long List dei Formatori';
const DESCRIPTION =
  'Cerchiamo docenti, formatori e professionisti da coinvolgere nei progetti di formazione Alètheia. Inserisci il tuo profilo nella Long List: ti contatteremo quando si apre un’opportunità in linea con le tue competenze.';

export const metadata: Metadata = {
  title: { absolute: TITLE },
  description: DESCRIPTION,
  alternates: { canonical: '/diventa-docente' },
  openGraph: { type: 'website', url: '/diventa-docente', title: TITLE, description: DESCRIPTION },
  twitter: { card: 'summary_large_image', title: TITLE, description: DESCRIPTION },
};

const AUDIENCE = [
  {
    icon: GraduationCap,
    title: 'Docenti e formatori',
    text: 'con esperienza nella didattica e nella formazione professionale.',
  },
  {
    icon: Briefcase,
    title: 'Professionisti di settore',
    text: 'con competenze tecniche e specialistiche maturate sul campo.',
  },
  {
    icon: Lightbulb,
    title: 'Esperti tematici',
    text: 'con conoscenze aggiornate e capacità di trasferirle in aula.',
  },
  {
    icon: Target,
    title: 'Specialisti',
    text: 'con competenze verticali utili a progetti e percorsi formativi specifici.',
  },
];

const STEPS = [
  {
    icon: Send,
    title: 'Invia il tuo profilo',
    text: 'Compila il form con i tuoi dati, le esperienze professionali e gli ambiti in cui puoi svolgere attività di docenza.',
  },
  {
    icon: Database,
    title: 'Entra nel database',
    text: 'Il tuo profilo potrà essere consultato internamente per individuare competenze coerenti con i progetti e le esigenze formative.',
  },
  {
    icon: Search,
    title: 'Valuta le opportunità',
    text: 'Quando individueremo un progetto compatibile con il tuo profilo, ti contatteremo per verificare interesse, disponibilità e requisiti richiesti.',
  },
  {
    icon: HeartHandshake,
    title: 'Collabori con noi',
    text: 'Definisci insieme al team le modalità, i contenuti e le date. Ogni collaborazione è regolata da un incarico formale e trasparente.',
  },
];

export default function DiventaDocentePage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Top bar */}
      <div className="border-b border-border/50 bg-background/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <Link href="/" className="shrink-0" aria-label="Alètheia — home">
            <Logo size={28} showText={false} />
          </Link>
          <div className="flex items-center gap-2 shrink-0">
            <ThemeToggle />
            <a
              href="#candidatura"
              className="px-4 py-2 sm:px-5 sm:py-2.5 rounded-xl bg-primary text-primary-foreground text-xs sm:text-sm font-semibold hover:bg-primary/90 transition-colors shadow-sm shadow-primary/20"
            >
              Invia la tua candidatura
            </a>
          </div>
        </div>
      </div>

      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-primary/15 via-muted/40 to-background border-b border-border/50">
        <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
          <div className="absolute -top-10 left-1/4 w-96 h-96 rounded-full bg-primary/10 blur-3xl" />
          <div className="absolute bottom-0 right-1/4 w-64 h-64 rounded-full bg-primary/10 blur-2xl" />
        </div>
        <div className="relative max-w-3xl mx-auto px-4 py-16 sm:py-24 text-center space-y-6">
          <span className="inline-block text-xs font-semibold uppercase tracking-wider px-3 py-1.5 rounded-full bg-primary/10 text-primary border border-primary/20">
            Long List Formatori · Candidature sempre aperte
          </span>
          <h1 className="text-3xl sm:text-5xl font-bold tracking-tight leading-tight">
            Hai competenze da condividere? Entra nella rete dei docenti Alètheia.
          </h1>
          <p className="text-base sm:text-lg text-muted-foreground leading-relaxed">
            Cerchiamo docenti, formatori e professionisti da coinvolgere nei nostri progetti di formazione.
            Inserisci il tuo profilo: ti contatteremo quando si apre un&apos;opportunità in linea con la tua area di
            competenza.
          </p>
          <a
            href="#candidatura"
            className="inline-flex items-center justify-center px-7 py-3.5 rounded-2xl bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition-colors shadow-lg shadow-primary/20"
          >
            Invia la tua candidatura
          </a>
        </div>
      </section>

      <div className="max-w-5xl mx-auto px-4 py-14 sm:py-20 space-y-16 sm:space-y-24">
        {/* Intro */}
        <Reveal as="section" className="grid md:grid-cols-5 gap-8 items-start">
          <h2 className="md:col-span-2 text-2xl sm:text-3xl font-bold tracking-tight">
            Le opportunità giuste iniziano dalle competenze
          </h2>
          <div className="md:col-span-3 space-y-4 text-muted-foreground leading-relaxed">
            <p>
              <span className="font-semibold text-foreground">Alètheia</span>, parte della rete di imprese{' '}
              <span className="font-semibold text-foreground">Promotergroup S.p.A.</span>, progetta e realizza
              percorsi formativi per persone, imprese e territori. Per farlo, ci affidiamo a una rete di
              professionisti con competenze, esperienze e specializzazioni diverse.
            </p>
            <p className="rounded-2xl border border-primary/20 bg-primary/5 p-4 text-foreground">
              La Long List Alètheia non è un bando con scadenza: è un registro permanente di professionisti
              qualificati a cui attingiamo ogni volta che si apre un percorso formativo, un avviso pubblico
              regionale o una nuova attività didattica.
            </p>
          </div>
        </Reveal>

        {/* A chi ci rivolgiamo */}
        <section className="space-y-8">
          <Reveal className="space-y-2 max-w-2xl">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">A chi ci rivolgiamo</h2>
            <p className="text-muted-foreground">
              Cerchiamo professionisti con esperienza e competenze da mettere a disposizione della formazione.
            </p>
          </Reveal>
          <div className="grid sm:grid-cols-2 gap-4">
            {AUDIENCE.map(({ icon: Icon, title, text }, i) => (
              <Reveal key={title} delay={i * 80} className="glass rounded-2xl p-5 sm:p-6 flex gap-4">
                <div className="w-11 h-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                  <Icon className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-semibold">{title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{text}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </section>

        {/* Come funziona */}
        <section className="space-y-8">
          <Reveal>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">Come funziona</h2>
          </Reveal>
          <ol className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {STEPS.map(({ icon: Icon, title, text }, i) => (
              <Reveal as="li" key={title} delay={i * 80} className="glass rounded-2xl p-5 sm:p-6 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-3xl font-bold text-primary/30 tabular-nums">{i + 1}</span>
                  <Icon className="w-5 h-5 text-primary" />
                </div>
                <h3 className="font-semibold">{title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{text}</p>
              </Reveal>
            ))}
          </ol>
        </section>

        {/* Form */}
        <section id="candidatura" className="scroll-mt-24 max-w-3xl mx-auto">
          <TeacherLongListForm />
        </section>
      </div>

      <footer className="bg-white/40 dark:bg-background/40 backdrop-blur-sm border-t border-white/20 dark:border-white/10">
        <div className="max-w-5xl mx-auto px-4 py-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-muted-foreground">
          <p>© {new Date().getFullYear()} Alètheia S.r.l. — Promotergroup S.p.A.</p>
          <Link href="/privacy-policy" className="hover:text-primary transition-colors">
            Privacy Policy
          </Link>
        </div>
      </footer>
    </div>
  );
}
