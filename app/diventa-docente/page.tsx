import Link from 'next/link';
import type { Metadata } from 'next';
import { Bricolage_Grotesque } from 'next/font/google';
import Logo from '@/components/Logo';
import ThemeToggle from '@/components/ThemeToggle';
import TeacherAreaIndex from '@/components/TeacherAreaIndex';
import TeacherLongListForm from '@/components/TeacherLongListForm';

const display = Bricolage_Grotesque({ subsets: ['latin'], variable: '--font-display', display: 'swap' });

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
  ['Docenti e formatori', 'con esperienza nella didattica e nella formazione professionale'],
  ['Professionisti di settore', 'con competenze tecniche e specialistiche maturate sul campo'],
  ['Esperti tematici', 'con conoscenze aggiornate e capacità di trasferirle in aula'],
  ['Specialisti', 'con competenze verticali utili a progetti e percorsi formativi specifici'],
];

const STEPS = [
  {
    title: 'Invia il tuo profilo',
    text: 'Compila il form con i tuoi dati, le esperienze professionali e gli ambiti in cui puoi svolgere attività di docenza.',
  },
  {
    title: 'Entra nel database',
    text: 'Il tuo profilo potrà essere consultato internamente per individuare competenze coerenti con i progetti e le esigenze formative.',
  },
  {
    title: 'Valuta le opportunità',
    text: 'Quando individueremo un progetto compatibile con il tuo profilo, ti contatteremo per verificare interesse, disponibilità e requisiti richiesti.',
  },
  {
    title: 'Collabori con noi',
    text: 'Definisci insieme al team le modalità, i contenuti e le date. Ogni collaborazione è regolata da un incarico formale e trasparente.',
  },
];

export default function DiventaDocentePage() {
  return (
    <div className={`${display.variable} min-h-screen bg-background`}>
      {/* Hero: la lavagna */}
      <header className="bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-20 flex items-center">
          <Link href="/" aria-label="Alètheia — home">
            <Logo size={40} showText={false} />
          </Link>
        </div>
      </header>

      <section className="bg-[#007882] text-[#FFFFFF]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="pt-10 pb-16 sm:pt-20 sm:pb-24 space-y-12 sm:space-y-16">
            <div className="max-w-4xl space-y-6">
              <h1 className="font-[family-name:var(--font-display)] text-5xl sm:text-7xl font-bold leading-[1.02] tracking-tight text-white">
                Hai competenze da condividere? Entra nella rete dei docenti Alètheia.
              </h1>
              <p className="max-w-2xl text-lg leading-relaxed text-[#FFFFFF]/90">
                Cerchiamo docenti, formatori e professionisti da coinvolgere nei nostri progetti di formazione.
                Inserisci il tuo profilo: ti contatteremo quando si apre un&apos;opportunità in linea con la tua area
                di competenza.
              </p>
            </div>

            <div className="space-y-6">
              <h2 className="text-lg font-medium text-[#FFFFFF]/90">
                Aree di competenza <span className="font-normal text-[#FFFFFF]/75">(seleziona una o più aree)</span>
              </h2>
              <TeacherAreaIndex />
            </div>
          </div>
        </div>
      </section>

      {/* Il registro */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-16 sm:py-24 grid lg:grid-cols-12 gap-8 lg:gap-16">
        <h2 className="lg:col-span-5 font-[family-name:var(--font-display)] text-3xl sm:text-4xl font-bold leading-tight tracking-tight">
          Le opportunità giuste iniziano dalle competenze
        </h2>
        <div className="lg:col-span-6 lg:col-start-7 space-y-5 text-lg leading-relaxed text-muted-foreground">
          <p>
            <span className="text-foreground font-medium">Alètheia</span>, parte della rete di imprese{' '}
            <span className="text-foreground font-medium">Promotergroup S.p.A.</span>, progetta e realizza percorsi
            formativi per persone, imprese e territori. Per farlo, ci affidiamo a una rete di professionisti con
            competenze, esperienze e specializzazioni diverse.
          </p>
          <p>
            La Long List Alètheia non è un bando con scadenza, è un registro permanente di professionisti qualificati
            a cui attingiamo ogni volta che si apre un percorso formativo, un avviso pubblico regionale o una nuova
            attività didattica.
          </p>
        </div>
      </section>

      {/* A chi ci rivolgiamo */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 pb-16 sm:pb-24 grid lg:grid-cols-12 gap-8 lg:gap-16">
        <h2 className="lg:col-span-5 font-[family-name:var(--font-display)] text-3xl sm:text-4xl font-bold leading-tight tracking-tight">
          A chi ci rivolgiamo
        </h2>
        <div className="lg:col-span-6 lg:col-start-7 space-y-5">
          <p className="text-lg leading-relaxed text-muted-foreground">
            Cerchiamo professionisti con esperienza e competenze da mettere a disposizione della formazione:
          </p>
          <ul className="space-y-3 text-lg leading-relaxed text-muted-foreground list-disc pl-5 marker:text-primary">
            {AUDIENCE.map(([role, text]) => (
              <li key={role}>
                <span className="text-foreground font-semibold">{role}</span> {text}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Come funziona */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 pb-16 sm:pb-24 grid lg:grid-cols-12 gap-8 lg:gap-16">
        <h2 className="lg:col-span-5 font-[family-name:var(--font-display)] text-3xl sm:text-4xl font-bold leading-tight tracking-tight">
          Come funziona
        </h2>
        <ol className="lg:col-span-6 lg:col-start-7 space-y-8 border-l-2 border-primary/30 pl-6 sm:pl-8">
          {STEPS.map(({ title, text }, i) => (
            <li key={title} className="relative">
              <span
                aria-hidden="true"
                className="absolute left-[calc(-1.5rem-13px)] sm:left-[calc(-2rem-13px)] top-0.5 w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-semibold flex items-center justify-center tabular-nums"
              >
                {i + 1}
              </span>
              <h3 className="font-semibold text-lg">{title}</h3>
              <p className="mt-1 text-muted-foreground leading-relaxed">{text}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* Form */}
      <section id="candidatura" className="scroll-mt-6 bg-secondary/60 dark:bg-muted/30">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-16 sm:py-24 space-y-10">
          <div className="space-y-3 max-w-2xl">
            <h2 className="font-[family-name:var(--font-display)] text-3xl sm:text-4xl font-bold leading-tight tracking-tight">
              Entra nella nostra long list
            </h2>
            <p className="text-muted-foreground leading-relaxed">
              Condividi il tuo percorso professionale e aiutaci a conoscerti. I dati che inserisci ci permettono di
              valutare le tue competenze in modo preciso e di contattarti per le opportunità più adatte a te.
            </p>
          </div>
          <div className="rounded-lg bg-card border border-border p-6 sm:p-8">
            <TeacherLongListForm />
          </div>
        </div>
      </section>

      <footer>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-muted-foreground">
          <p>© {new Date().getFullYear()} Alètheia S.r.l. — Promotergroup S.p.A.</p>
          <div className="flex items-center gap-4">
            <Link href="/privacy-policy" className="hover:text-primary transition-colors">
              Privacy Policy
            </Link>
            <ThemeToggle />
          </div>
        </div>
      </footer>
    </div>
  );
}
