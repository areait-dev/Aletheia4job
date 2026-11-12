/**
 * Gestione degli errori temporanei di Groq (429 "troppe richieste", timeout, 5xx).
 *
 * Due livelli:
 *  1. dentro la stessa chiamata: pochi tentativi ravvicinati con attesa crescente (esponenziale, con
 *     jitter) o quella indicata da Groq nell'intestazione Retry-After, ma solo se l'attesa è breve;
 *  2. se l'attesa sarebbe lunga (o i tentativi finiscono) si lancia GroqTransientError: chi lo riceve
 *     (il job Inngest) riprogramma il passo più tardi, invece di tenere occupata una funzione serverless.
 * Gli errori non temporanei (richiesta non valida, chiave errata, risposta non interpretabile) non si ritentano.
 */

export class GroqTransientError extends Error {
  readonly status?: number;
  /** Attesa suggerita da Groq (Retry-After), se presente. */
  readonly retryAfterSeconds: number | null;
  constructor(message: string, options: { status?: number; retryAfterSeconds?: number | null; cause?: unknown } = {}) {
    super(message);
    this.name = "GroqTransientError";
    this.status = options.status;
    this.retryAfterSeconds = options.retryAfterSeconds ?? null;
    (this as { cause?: unknown }).cause = options.cause;
  }
}

type ErrorLike = { status?: number; headers?: unknown; message?: string; name?: string; code?: string };

function readHeader(headers: unknown, name: string): string | null {
  if (!headers) return null;
  const h = headers as { get?: (n: string) => string | null } & Record<string, unknown>;
  if (typeof h.get === "function") return h.get(name) ?? null;
  const v = h[name] ?? h[name.toLowerCase()];
  return typeof v === "string" ? v : typeof v === "number" ? String(v) : null;
}

/** Secondi indicati da Groq in Retry-After (numero di secondi o data HTTP), oppure null. */
export function getRetryAfterSeconds(e: unknown): number | null {
  const raw = readHeader((e as ErrorLike)?.headers, "retry-after");
  if (!raw) return null;
  const n = Number(raw);
  if (Number.isFinite(n) && n >= 0) return n;
  const t = Date.parse(raw);
  return Number.isNaN(t) ? null : Math.max(0, Math.ceil((t - Date.now()) / 1000));
}

export function isTransientGroqError(e: unknown): boolean {
  if (e instanceof GroqTransientError) return true;
  const err = e as ErrorLike;
  if (typeof err?.status === "number") return err.status === 429 || err.status === 408 || err.status === 409 || err.status >= 500;
  const name = `${err?.name ?? ""} ${err?.message ?? ""} ${err?.code ?? ""}`;
  return /connection|timeout|timed out|ECONNRESET|ETIMEDOUT|ENOTFOUND|EAI_AGAIN|fetch failed/i.test(name);
}

export type GroqRetryOptions = {
  /** Tentativi ravvicinati dopo il primo (default 2). */
  quickRetries?: number;
  /** Base dell'attesa esponenziale in ms (default 1000: 1 s, 2 s, ...). */
  baseDelayMs?: number;
  /** Se l'attesa richiesta supera questo valore non si aspetta qui: si passa al livello superiore (default 8000). */
  maxQuickWaitMs?: number;
  sleep?: (ms: number) => Promise<void>;
  random?: () => number;
};

export async function callWithGroqRetry<T>(fn: () => Promise<T>, options: GroqRetryOptions = {}): Promise<T> {
  const quickRetries = options.quickRetries ?? 2;
  const base = options.baseDelayMs ?? 1000;
  const maxWait = options.maxQuickWaitMs ?? 8000;
  const sleep = options.sleep ?? ((ms: number) => new Promise<void>((r) => setTimeout(r, ms)));
  const random = options.random ?? Math.random;

  for (let attempt = 0; ; attempt++) {
    try {
      return await fn();
    } catch (e) {
      if (!isTransientGroqError(e)) throw e;
      const status = (e as ErrorLike).status;
      const hinted = getRetryAfterSeconds(e);
      // attesa crescente con jitter (±25%) per non far ripartire tutti insieme
      const backoffMs = base * 2 ** attempt * (0.75 + random() * 0.5);
      const waitMs = hinted != null ? hinted * 1000 + random() * 250 : backoffMs;
      if (attempt >= quickRetries || waitMs > maxWait) {
        throw new GroqTransientError(
          status === 429 ? "Groq: troppe richieste (429)" : `Groq: errore temporaneo${status ? ` (${status})` : ""}`,
          { status, retryAfterSeconds: hinted, cause: e },
        );
      }
      await sleep(waitMs);
    }
  }
}

/** Tetto dell'attesa fra due tentativi di un passo del job: oltre, un CV resterebbe fermo troppo a lungo in coda. */
export const MAX_JOB_RETRY_WAIT_SECONDS = 90;

/**
 * Attesa (in secondi) da usare per riprogrammare un passo del job dopo un errore temporaneo, mai oltre 90 s:
 *  - con Retry-After di Groq: Retry-After + jitter di 0-5 s, indipendente da `attempt` (Groq dice già quando riprovare;
 *    `attempt` conta l'intera esecuzione e non si azzera fra i passi, quindi farlo crescere allungava la coda senza motivo);
 *  - senza Retry-After: backoff crescente a ogni tentativo (30 s, 60 s, 90 s, ...) con jitter ±20%.
 */
export function jobRetryDelaySeconds(attempt: number, retryAfterSeconds: number | null, random: () => number = Math.random): number {
  if (retryAfterSeconds != null) {
    return Math.min(MAX_JOB_RETRY_WAIT_SECONDS, Math.ceil(retryAfterSeconds + random() * 5));
  }
  const growing = 30 * 2 ** Math.max(0, attempt);
  return Math.min(MAX_JOB_RETRY_WAIT_SECONDS, Math.round(growing * (0.8 + random() * 0.4)));
}
