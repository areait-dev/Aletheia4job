import Image from 'next/image';
import Link from 'next/link';
import type { Metadata } from 'next';
import { Nunito, Viga } from 'next/font/google';
import Logo from '@/components/Logo';
import ThemeToggle from '@/components/ThemeToggle';
import TeacherLongListForm from '@/components/TeacherLongListForm';
import { getPublicTeacherOrgId, readTeacherPageContent } from '@/utils/pageContentReader';

const display = Nunito({ subsets: ['latin'], variable: '--font-display', display: 'swap' });
const title = Viga({ subsets: ['latin'], weight: '400', variable: '--font-title', display: 'swap' });

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

// I testi arrivano dal gestionale (Contenuti → Diventa docente); senza nulla di
// salvato valgono quelli originali. Pagina dinamica per mostrare subito le modifiche.
export const dynamic = 'force-dynamic';

// **parola** → grassetto.
function Rich({ text }: { text: string }) {
  return (
    <>
      {text.split('**').map((part, i) =>
        i % 2 === 1 ? (
          <strong key={i} className="text-foreground font-semibold">
            {part}
          </strong>
        ) : (
          part
        ),
      )}
    </>
  );
}

export default async function DiventaDocentePage() {
  const { content } = await readTeacherPageContent(getPublicTeacherOrgId());

  return (
    <div className={`${display.variable} ${title.variable} font-[family-name:var(--font-display)] min-h-screen bg-background`}>
      {/* Hero: la lavagna */}
      <header className="bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-20 flex items-center">
          <Link href="/" aria-label="Alètheia — home">
            <Logo size={40} showText={false} />
          </Link>
        </div>
      </header>

      <section className="bg-[#007882] text-[#FFFFFF] overflow-hidden">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 grid lg:grid-cols-12 lg:gap-12">
          <div className="lg:col-span-6 lg:self-center pt-10 pb-12 sm:pt-16 lg:py-16 space-y-10 sm:space-y-12">
            <div className="space-y-6">
              <h1 className="font-[family-name:var(--font-title)] text-5xl sm:text-6xl leading-[1.04] tracking-normal text-white">
                {content.hero.title}
              </h1>
              <p className="max-w-2xl text-lg leading-relaxed text-[#FFFFFF]/90">
                {content.hero.text}
              </p>
            </div>

            <a
              href="#candidatura"
              className="inline-flex items-center rounded-full bg-white px-6 py-3 text-sm font-semibold text-[#007882] hover:bg-white/90 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E9D879] focus-visible:ring-offset-2 focus-visible:ring-offset-[#007882]"
            >
              {content.hero.cta}
            </a>
          </div>

          <div className="lg:col-span-6 self-end">
            <Image
              src="/longlist-banner.png"
              alt=""
              width={1267}
              height={1054}
              priority
              sizes="(min-width: 1024px) 640px, 90vw"
              className="w-full max-w-md mx-auto lg:mx-0 lg:max-w-none lg:w-[114%] h-auto"
            />
          </div>
        </div>
      </section>

      {/* Il registro */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-16 sm:py-24 grid lg:grid-cols-12 gap-8 lg:gap-16">
        <h2 className="lg:col-span-5 font-[family-name:var(--font-title)] text-3xl sm:text-4xl leading-tight tracking-normal">
          {content.intro.title}
        </h2>
        <div className="lg:col-span-6 lg:col-start-7 space-y-5 text-lg leading-relaxed text-muted-foreground">
          {content.intro.paragraphs.map((paragraph, i) => (
            <p key={i}>
              <Rich text={paragraph} />
            </p>
          ))}
        </div>
      </section>

      {/* A chi ci rivolgiamo */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 pb-16 sm:pb-24 grid lg:grid-cols-12 gap-8 lg:gap-16">
        <h2 className="lg:col-span-5 font-[family-name:var(--font-title)] text-3xl sm:text-4xl leading-tight tracking-normal">
          {content.audience.title}
        </h2>
        <div className="lg:col-span-6 lg:col-start-7 space-y-5">
          <p className="text-lg leading-relaxed text-muted-foreground">
            {content.audience.intro}
          </p>
          <ul className="space-y-3 text-lg leading-relaxed text-muted-foreground list-disc pl-5 marker:text-primary">
            {content.audience.items.map((item, i) => (
              <li key={i}>
                <span className="text-foreground font-semibold">{item.role}</span> {item.text}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Come funziona */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 pb-16 sm:pb-24 grid lg:grid-cols-12 gap-8 lg:gap-16">
        <h2 className="lg:col-span-5 font-[family-name:var(--font-title)] text-3xl sm:text-4xl leading-tight tracking-normal">
          {content.steps.title}
        </h2>
        <ol className="lg:col-span-6 lg:col-start-7 space-y-8 border-l-2 border-primary/30 pl-6 sm:pl-8">
          {content.steps.items.map((step, i) => (
            <li key={i} className="relative">
              <span
                aria-hidden="true"
                className="absolute left-[calc(-1.5rem-13px)] sm:left-[calc(-2rem-13px)] top-0.5 w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-semibold flex items-center justify-center tabular-nums"
              >
                {i + 1}
              </span>
              <h3 className="font-semibold text-lg">{step.title}</h3>
              <p className="mt-1 text-muted-foreground leading-relaxed">{step.text}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* Form */}
      <section id="candidatura" className="scroll-mt-6 bg-secondary/60 dark:bg-muted/30">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-16 sm:py-24 space-y-10">
          <div className="space-y-3 max-w-2xl">
            <h2 className="font-[family-name:var(--font-title)] text-3xl sm:text-4xl leading-tight tracking-normal">
              {content.form.title}
            </h2>
            <p className="text-muted-foreground leading-relaxed">
              {content.form.text}
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
