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
