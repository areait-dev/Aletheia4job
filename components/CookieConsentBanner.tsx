'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { Cookie } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { isDashboardRoute } from '@/utils/publicRouteSegments';

const STORAGE_KEY = 'aletheia4job:cookie-consent';

type StoredConsent = {
  choice: 'accepted';
  storedAt: string;
};

function readStoredConsent(): StoredConsent | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as StoredConsent;
  } catch {
    // localStorage non disponibile (privacy mode, quota) o valore corrotto:
    // trattiamo come "nessun consenso salvato" e ri-mostriamo il banner.
    return null;
  }
}

// Banner minimale di consenso cookie. Il portale usa oggi SOLO cookie
// tecnici necessari alla sessione di autenticazione (vedi app/cookie-policy),
// che secondo la normativa non richiedono consenso e non c'è nulla da
// "bloccare" finché l'utente non sceglie: per questo il banner è puramente
// informativo con un solo pulsante di conferma, non un vero opt-in/opt-out.
// Se in futuro vengono introdotti cookie non essenziali (analytics, ecc.),
// questo componente va esteso con scelte granulari e il caricamento dei
// relativi script va condizionato alla scelta salvata qui.
export default function CookieConsentBanner() {
  const pathname = usePathname() || '/';
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (isDashboardRoute(pathname)) return;
    if (readStoredConsent()) return;
    setVisible(true);
  }, [pathname]);

  if (isDashboardRoute(pathname) || !visible) return null;

  function accept() {
    try {
      const consent: StoredConsent = { choice: 'accepted', storedAt: new Date().toISOString() };
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(consent));
    } catch {
      // Se il salvataggio fallisce (privacy mode, quota piena) il banner
      // ricomparirà alla prossima visita: non blocchiamo comunque l'utente.
    }
    setVisible(false);
  }

  return (
    <div className="fixed inset-x-0 bottom-0 z-[60] p-3 sm:p-4">
      <div className="max-w-2xl mx-auto flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4 rounded-2xl border border-white/40 dark:border-white/10 bg-white/90 dark:bg-background/90 backdrop-blur-md shadow-lg shadow-black/10 p-4 sm:p-5">
        <Cookie className="w-5 h-5 text-primary shrink-0 mt-0.5 sm:mt-0" />
        <p className="flex-1 text-xs sm:text-sm text-muted-foreground leading-relaxed">
          Questo sito utilizza esclusivamente cookie tecnici necessari al funzionamento del servizio
          (es. sessione di autenticazione). Non usiamo cookie di profilazione o di terze parti a fini
          pubblicitari.{' '}
          <Link href="/cookie-policy" className="text-primary font-medium hover:underline">
            Maggiori informazioni
          </Link>
          .
        </p>
        <Button
          onClick={accept}
          size="sm"
          className="w-full sm:w-auto shrink-0 rounded-xl"
        >
          Ho capito
        </Button>
      </div>
    </div>
  );
}
