import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export const metadata = {
  title: 'Cookie Policy | Alètheia S.r.l.',
  description: 'Informativa sui cookie utilizzati dal portale Alètheia4job per la gestione di sessione e autenticazione.',
  alternates: { canonical: '/cookie-policy' },
};

const cookieTable = [
  {
    nome: 'sb-access-token / sb-refresh-token',
    tipologia: 'Tecnico / necessario',
    finalita: 'Gestione della sessione di autenticazione degli utenti registrati (recruiter e staff Alètheia)',
    durata: 'Sessione / fino al logout o alla scadenza del token',
  },
];

export default function CookiePolicyPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="relative overflow-hidden bg-gradient-to-br from-primary/15 via-muted/40 to-background border-b border-border/50">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/4 w-96 h-96 rounded-full bg-primary/10 blur-3xl" />
          <div className="absolute bottom-0 right-1/4 w-64 h-64 rounded-full bg-primary/10 blur-2xl" />
        </div>
        <div className="relative max-w-5xl mx-auto px-4 py-10 space-y-4">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-primary transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Torna alle posizioni
          </Link>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight">Cookie Policy</h1>
          <p className="text-sm text-muted-foreground">Informativa sull&apos;utilizzo dei cookie sul portale Alètheia4job</p>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-10">
        <article className="bg-white/70 dark:bg-background/70 backdrop-blur-md border border-white/40 dark:border-white/10 rounded-3xl p-6 sm:p-10 lg:p-12 shadow-sm space-y-10 text-sm leading-relaxed text-foreground">

          <section className="space-y-3">
            <h2 className="text-lg font-bold">Cosa sono i cookie</h2>
            <p className="text-muted-foreground">
              I cookie sono piccoli file di testo che i siti visitati inviano al browser dell&apos;utente, dove vengono
              memorizzati per essere poi ritrasmessi agli stessi siti alla visita successiva. Il portale Alètheia4job
              (di titolarità di Alètheia S.r.l.) utilizza esclusivamente cookie tecnici, necessari al corretto
              funzionamento del servizio.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold">Cookie utilizzati</h2>
            <p className="text-muted-foreground">
              Non vengono utilizzati cookie di profilazione o di terze parti a fini pubblicitari. I soli cookie
              presenti sono di natura tecnica, indispensabili per l&apos;autenticazione degli utenti registrati
              (recruiter e staff interno) e non richiedono consenso ai sensi della normativa vigente.
            </p>
            <div className="overflow-x-auto rounded-2xl border border-border">
              <table className="w-full min-w-[640px] border-collapse text-xs sm:text-sm">
                <thead>
                  <tr className="bg-muted/50 text-left">
                    <th className="px-4 py-3 font-semibold border-b border-border align-top w-[28%]">Nome cookie</th>
                    <th className="px-4 py-3 font-semibold border-b border-border align-top w-[20%]">Tipologia</th>
                    <th className="px-4 py-3 font-semibold border-b border-border align-top w-[32%]">Finalità</th>
                    <th className="px-4 py-3 font-semibold border-b border-border align-top w-[20%]">Durata</th>
                  </tr>
                </thead>
                <tbody>
                  {cookieTable.map((row, i) => (
                    <tr key={i}>
                      <td className="px-4 py-3 border-b border-border/60 align-top text-muted-foreground font-mono text-[11px]">{row.nome}</td>
                      <td className="px-4 py-3 border-b border-border/60 align-top text-muted-foreground">{row.tipologia}</td>
                      <td className="px-4 py-3 border-b border-border/60 align-top text-muted-foreground">{row.finalita}</td>
                      <td className="px-4 py-3 border-b border-border/60 align-top text-muted-foreground">{row.durata}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold">Gestione dei cookie</h2>
            <p className="text-muted-foreground">
              Trattandosi di cookie tecnici necessari all&apos;erogazione del servizio, la loro disattivazione tramite le
              impostazioni del browser può impedire il corretto funzionamento dell&apos;area riservata e delle funzionalità
              di autenticazione del portale.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold">Titolare del trattamento</h2>
            <p className="text-muted-foreground">
              Alètheia S.r.l. — Via del Carrubo snc, 97019 Vittoria (RG) — P.IVA 01524530894 — e-mail{' '}
              <a href="mailto:info@aletheiasrl.it" className="text-primary font-medium hover:underline">
                info@aletheiasrl.it
              </a>
              . Per informazioni sul trattamento dei dati personali consulta la{' '}
              <Link href="/privacy-policy" className="text-primary font-medium hover:underline">
                Privacy Policy
              </Link>
              .
            </p>
          </section>

        </article>
      </div>
    </div>
  );
}
