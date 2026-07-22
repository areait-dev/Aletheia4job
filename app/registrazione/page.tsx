import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import SpontaneousApplicationForm from '@/components/SpontaneousApplicationForm';

export const metadata = {
  title: 'Candidatura Spontanea | Alètheia4Job',
  description: 'Non trovi la posizione che fa per te? Iscriviti nel nostro Database: ti contatteremo qualora una posizione aperta fosse in linea con la tua figura professionale.',
  alternates: { canonical: '/registrazione' },
};

export default function RegistrazionePage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="relative overflow-hidden bg-gradient-to-br from-primary/15 via-muted/40 to-background border-b border-border/50">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/4 w-96 h-96 rounded-full bg-primary/10 blur-3xl" />
          <div className="absolute bottom-0 right-1/4 w-64 h-64 rounded-full bg-primary/10 blur-2xl" />
        </div>
        <div className="relative max-w-2xl mx-auto px-4 py-10">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-primary transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Torna alle posizioni
          </Link>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-10">
        <SpontaneousApplicationForm />
      </div>
    </div>
  );
}
