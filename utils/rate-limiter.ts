import { headers } from 'next/headers';

// Rate limiter in-memory per Server Action pubbliche non autenticate
// (candidatura spontanea, candidatura ad annuncio, ecc.).
//
// TODO(scale-out): questa implementazione mantiene lo stato in un Map dentro
// il processo Node: funziona correttamente su un singolo nodo, ma su un
// deploy multi-istanza (es. più container/lambda dietro un load balancer)
// ogni istanza avrebbe il proprio contatore, indebolendo il limite reale.
// Se l'app viene scalata su più nodi, sostituire questo modulo con uno
// store condiviso (es. Upstash Redis + @upstash/ratelimit, o Redis con
// INCR/EXPIRE) mantenendo la stessa interfaccia `checkRateLimit`.

type Bucket = {
  count: number;
  resetAt: number;
};

const buckets = new Map<string, Bucket>();

// Pulizia periodica dei bucket scaduti per evitare una crescita illimitata
// della Map in processi long-running.
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000;
let lastCleanup = Date.now();

function cleanupExpired(now: number) {
  if (now - lastCleanup < CLEANUP_INTERVAL_MS) return;
  lastCleanup = now;
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
}

export type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  resetAt: number;
};

/**
 * Verifica ed incrementa il contatore di richieste per `key` (tipicamente
 * `"<scope>:<ip>"`) entro una finestra temporale fissa.
 *
 * @param key identificatore univoco del soggetto limitato (es. `spontaneous-application:1.2.3.4`)
 * @param limit numero massimo di richieste consentite nella finestra
 * @param windowMs durata della finestra in millisecondi
 */
export function checkRateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now();
  cleanupExpired(now);

  const existing = buckets.get(key);

  if (!existing || existing.resetAt <= now) {
    const resetAt = now + windowMs;
    buckets.set(key, { count: 1, resetAt });
    return { allowed: true, remaining: limit - 1, resetAt };
  }

  if (existing.count >= limit) {
    return { allowed: false, remaining: 0, resetAt: existing.resetAt };
  }

  existing.count += 1;
  return { allowed: true, remaining: limit - existing.count, resetAt: existing.resetAt };
}

/**
 * Estrae l'IP del client da una richiesta Server Action (App Router) usando
 * gli header standard impostati da proxy/CDN. Ritorna "unknown" se assente
 * (ambienti locali/serverless senza proxy): in quel caso il rate limiting
 * degrada a un singolo bucket condiviso, meglio di nessun limite.
 */
export function getClientIp(): string {
  const headerList = headers();

  const forwardedFor = headerList.get('x-forwarded-for');
  if (forwardedFor) {
    return forwardedFor.split(',')[0].trim();
  }

  const realIp = headerList.get('x-real-ip');
  if (realIp) return realIp.trim();

  return 'unknown';
}
