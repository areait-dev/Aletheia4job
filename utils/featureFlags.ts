/**
 * Il flusso di signup aziendale resta spento finché non esistono Termini di Servizio
 * e Privacy Policy reali per le aziende clienti (vedi /aziende/termini e /aziende/privacy-azienda,
 * oggi pagine placeholder). Va abilitato esplicitamente con NEXT_PUBLIC_COMPANY_SIGNUP_ENABLED=true
 * quando quel contenuto è pronto. Letta sia lato server (pagina, server action) che lato client
 * (link in LoginForm), quindi deve restare NEXT_PUBLIC_.
 */
export function isCompanySignUpEnabled() {
  return process.env.NEXT_PUBLIC_COMPANY_SIGNUP_ENABLED === "true";
}

/**
 * Multiposting (feed XML per Indeed/Jooble/LinkedIn e webhook candidature in ingresso).
 * Spento di default: va abilitato esplicitamente con MULTIPOSTING_ENABLED=true (solo lato server).
 * Con il flag spento i feed e il webhook rispondono 404 e l'interfaccia non lo mostra.
 * Schema e dati del database non sono toccati, così il multiposting si può riattivare.
 */
export function isMultipostingEnabled() {
  return process.env.MULTIPOSTING_ENABLED === "true";
}

/** Endpoint pubblici del multiposting (feed in uscita e webhook in ingresso). */
export function isMultipostingPath(pathname: string) {
  return (
    pathname === "/api/webhooks/multiposting" ||
    pathname === "/api/feeds" ||
    pathname === "/api/jobs/feed" ||
    pathname === "/api/linkedin-feed"
  );
}
