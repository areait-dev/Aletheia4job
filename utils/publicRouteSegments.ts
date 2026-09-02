// Segmenti di primo livello della dashboard autenticata: usati dai
// componenti "flottanti" globali (PublicThemeToggle, CookieConsentBanner)
// montati nel root layout per sapere se nascondersi, dato che quelle route
// hanno già la propria UI equivalente (vedi Navbar.tsx) o non sono nel
// perimetro del sito pubblico.
export const DASHBOARD_ROUTE_SEGMENTS = [
  'dashboard', 'jobs', 'positions', 'add-candidate', 'admin', 'attendance',
  'calendar', 'documents', 'employees', 'onboarding', 'performance', 'pipeline', 'stats',
];

export function isDashboardRoute(pathname: string): boolean {
  const firstSegment = (pathname || '/').split('/')[1] || '';
  return DASHBOARD_ROUTE_SEGMENTS.includes(firstSegment);
}
