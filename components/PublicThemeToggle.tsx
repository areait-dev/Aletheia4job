'use client';

import { usePathname } from 'next/navigation';
import ThemeToggle from '@/components/ThemeToggle';

// Route (segmenti di primo livello) della dashboard autenticata: ha già un
// proprio ThemeToggle in components/Navbar.tsx, quindi qui va nascosto per
// non duplicarlo. Le pagine /offerte-di-lavoro/[slug] e /registrazione hanno
// già un ThemeToggle integrato nella loro barra superiore: va nascosto anche
// lì per lo stesso motivo. Ovunque altro nel sito pubblico compare qui,
// fluttuante, così ogni pagina pubblica ha sempre un modo di cambiare tema.
const DASHBOARD_SEGMENTS = [
  'dashboard', 'jobs', 'positions', 'add-candidate', 'admin', 'attendance',
  'calendar', 'documents', 'employees', 'onboarding', 'performance', 'pipeline', 'stats',
];

const HAS_OWN_TOGGLE_PREFIXES = ['/offerte-di-lavoro', '/registrazione'];

export default function PublicThemeToggle() {
  const pathname = usePathname() || '/';
  const firstSegment = pathname.split('/')[1] || '';

  if (DASHBOARD_SEGMENTS.includes(firstSegment)) return null;
  if (HAS_OWN_TOGGLE_PREFIXES.some(p => pathname.startsWith(p))) return null;

  return (
    // In alto, non in basso: in dev il floating button di React Query Devtools
    // occupa l'angolo in basso a destra e intercetterebbe i click su un
    // eventuale toggle posizionato lì.
    <div className="fixed top-4 right-4 z-50">
      <ThemeToggle />
    </div>
  );
}
