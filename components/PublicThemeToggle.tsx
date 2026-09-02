'use client';

import { usePathname } from 'next/navigation';
import ThemeToggle from '@/components/ThemeToggle';
import { isDashboardRoute } from '@/utils/publicRouteSegments';

// Route della dashboard autenticata: ha già un proprio ThemeToggle in
// components/Navbar.tsx, quindi qui va nascosto per non duplicarlo. Le
// pagine /offerte-di-lavoro/[slug] e /registrazione hanno già un
// ThemeToggle integrato nella loro barra superiore: va nascosto anche lì
// per lo stesso motivo. Ovunque altro nel sito pubblico compare qui,
// fluttuante, così ogni pagina pubblica ha sempre un modo di cambiare tema.
const HAS_OWN_TOGGLE_PREFIXES = ['/offerte-di-lavoro', '/registrazione'];

export default function PublicThemeToggle() {
  const pathname = usePathname() || '/';

  if (isDashboardRoute(pathname)) return null;
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
