import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export const metadata = {
  title: 'Privacy Policy - Candidati e Lavoratori | Alètheia S.r.l.',
  description: "Informativa Privacy ufficiale per la protezione dei dati dei candidati e gestione dei CV sul portale Alètheia4job.",
  alternates: { canonical: '/privacy-policy' },
};

const dataTable = [
  {
    finalita: 'Ricezione dei Curriculum Vitae, valutazione del profilo professionale e gestione delle candidature (spontanee o in risposta ad annunci)',
    dati: 'Dati identificativi, contatti, foto, titoli di studio, esperienze lavorative e informazioni contenute nel CV',
    base: 'Esecuzione di misure precontrattuali adottate su richiesta dell’interessato (Art. 6, par. 1, lett. b, GDPR)',
    conservazione: "Massimo 36 mesi (3 anni) dalla data di ricezione o dall'ultimo contatto significativo con il candidato, salvo instaurazione del rapporto di lavoro.",
  },
  {
    finalita: "Gestione di categorie particolari di dati (es. iscrizione a liste di collocamento mirato, categorie protette L. 68/99, idoneità fisiche) se spontaneamente inseriti dall'utente nel CV",
    dati: "Dati relativi allo stato di salute o altre categorie particolari ai sensi dell'Art. 9 GDPR",
    base: "Consenso esplicito dell'interessato (Art. 9, par. 2, lett. a, GDPR) espresso tramite la spunta sul form",
    conservazione: 'Allineata alla conservazione del CV (massimo 36 mesi) o cancellazione immediata in caso di revoca del consenso.',
  },
  {
    finalita: "Comunicazione del profilo e del CV ad aziende terze (clienti di Alètheia S.r.l.) interessate all'inserimento lavorativo del candidato",
    dati: 'Dati professionali e di contatto del candidato',
    base: 'Esecuzione di misure precontrattuali; Consenso specifico dell’interessato',
    conservazione: 'Legata alla gestione della specifica selezione e comunque non oltre i 36 mesi di validità del CV nel database.',
  },
];

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="relative overflow-hidden bg-gradient-to-br from-primary/15 via-muted/40 to-background border-b border-border/50">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/4 w-96 h-96 rounded-full bg-primary/10 blur-3xl" />
          <div className="absolute bottom-0 right-1/4 w-64 h-64 rounded-full bg-primary/10 blur-2xl" />
        </div>
        <div className="relative max-w-3xl mx-auto px-4 py-10 space-y-4">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-primary transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Torna alle posizioni
          </Link>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight">Privacy Policy</h1>
          <p className="text-sm text-muted-foreground">Informativa sul trattamento dei dati personali di candidati e lavoratori</p>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-10">
        <article className="bg-white/70 dark:bg-background/70 backdrop-blur-md border border-white/40 dark:border-white/10 rounded-3xl p-6 sm:p-10 shadow-sm space-y-10 text-sm leading-relaxed text-foreground">

          <section className="space-y-3">
            <h2 className="text-lg font-bold">Titolare del trattamento</h2>
            <p className="text-muted-foreground">
              Il Titolare del trattamento dei dati raccolti tramite il portale Alètheia4job è:
            </p>
            <div className="rounded-2xl border border-border bg-muted/30 px-4 py-3 space-y-1 text-muted-foreground">
              <p className="font-semibold text-foreground">Alètheia S.r.l.</p>
              <p>Via del Carrubo snc, 97019 Vittoria (RG)</p>
              <p>P.IVA: 01524530894</p>
              <p>
                E-mail:{' '}
                <a href="mailto:info@aletheiasrl.it" className="text-primary font-medium hover:underline">
                  info@aletheiasrl.it
                </a>
              </p>
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold">Finalità, dati trattati e periodi di conservazione</h2>
            <p className="text-muted-foreground">
              In qualità di Agenzia per il Lavoro, Alètheia S.r.l. tratta i dati personali dei candidati per le finalità di ricerca,
              selezione e intermediazione di personale, secondo quanto riepilogato nella tabella seguente.
            </p>
            <div className="overflow-x-auto rounded-2xl border border-border">
              <table className="w-full min-w-[720px] border-collapse text-xs sm:text-sm">
                <thead>
                  <tr className="bg-muted/50 text-left">
                    <th className="px-4 py-3 font-semibold border-b border-border align-top w-[28%]">Finalità</th>
                    <th className="px-4 py-3 font-semibold border-b border-border align-top w-[24%]">Dati trattati</th>
                    <th className="px-4 py-3 font-semibold border-b border-border align-top w-[24%]">Base giuridica</th>
                    <th className="px-4 py-3 font-semibold border-b border-border align-top w-[24%]">Conservazione</th>
                  </tr>
                </thead>
                <tbody>
                  {dataTable.map((row, i) => (
                    <tr key={i} className={i % 2 === 1 ? 'bg-muted/20' : undefined}>
                      <td className="px-4 py-3 border-b border-border/60 align-top text-muted-foreground">{row.finalita}</td>
                      <td className="px-4 py-3 border-b border-border/60 align-top text-muted-foreground">{row.dati}</td>
                      <td className="px-4 py-3 border-b border-border/60 align-top text-muted-foreground">{row.base}</td>
                      <td className="px-4 py-3 border-b border-border/60 align-top text-muted-foreground">{row.conservazione}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold">Destinatari dei dati</h2>
            <p className="text-muted-foreground">
              I dati personali raccolti tramite il portale Aletheia4job potranno essere comunicati a:
            </p>
            <ol className="list-decimal list-outside pl-5 space-y-2 text-muted-foreground">
              <li>
                Aziende clienti di Alètheia S.r.l. che hanno conferito mandato per la ricerca, selezione e intermediazione di
                personale professionale.
              </li>
              <li>Personale interno di Alètheia S.r.l. debitamente autorizzato e istruito.</li>
              <li>
                Fornitori di servizi informatici o hosting del database nominati Responsabili del Trattamento ai sensi
                dell&apos;art. 28 GDPR.
              </li>
            </ol>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold">Diritti dell&apos;interessato</h2>
            <p className="text-muted-foreground">
              Il candidato può esercitare in ogni momento il diritto di accesso, rettifica, cancellazione (oblio) del proprio
              CV, limitazione del trattamento o opposizione inviando una comunicazione a{' '}
              <a href="mailto:info@aletheiasrl.it" className="text-primary font-medium hover:underline">
                info@aletheiasrl.it
              </a>
              . Ha inoltre il diritto di proporre reclamo al Garante per la protezione dei dati personali.
            </p>
          </section>

        </article>
      </div>
    </div>
  );
}
