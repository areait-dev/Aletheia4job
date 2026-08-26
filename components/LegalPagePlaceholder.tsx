import Link from "next/link";
import { ArrowLeft, Construction } from "lucide-react";

export function LegalPagePlaceholder({ title }: { title: string }) {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="max-w-lg w-full text-center space-y-4 bg-white/70 dark:bg-background/70 backdrop-blur-md border border-white/40 dark:border-white/10 rounded-3xl p-10 shadow-sm">
        <Construction className="w-8 h-8 mx-auto text-primary" />
        <h1 className="text-xl font-bold">{title}</h1>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Questa pagina è in preparazione.{" "}
          <a href="mailto:supporto@aletheia4job.it" className="text-primary font-semibold hover:underline">
            Contattaci
          </a>{" "}
          per maggiori informazioni sui termini di utilizzo del servizio.
        </p>
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-primary transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Torna alla home
        </Link>
      </div>
    </div>
  );
}
