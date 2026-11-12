import { GroqTransientError, MAX_JOB_RETRY_WAIT_SECONDS, jobRetryDelaySeconds } from "@/lib/groqRetry";

/**
 * Attesa del rate limit di Groq dentro un job Inngest, senza usare i ritentativi di Inngest.
 *
 * Perché: quando un passo lancia un errore, l'esecutore di Inngest lo riprende con un proprio ritardo che cresce con il
 * numero del tentativo e può essere molto maggiore di quello richiesto da RetryAfterError (misurato: 17 s chiesti, 144 s
 * reali al tentativo 4; 35 s chiesti, 318 s reali all'ultimo). Qui il passo NON fallisce: su errore temporaneo restituisce
 * { retry: true } e l'attesa è uno step.sleep di durata esatta, in un ciclo con contatore proprio.
 * Gli errori non temporanei vengono rilanciati e restano soggetti ai `retries` di Inngest.
 */

export const AI_RATE_LIMIT_MAX_ATTEMPTS = 8;

/**
 * Attesa in secondi prima del tentativo successivo, mai oltre 90 s:
 *  - con Retry-After di Groq: Retry-After + jitter casuale fra 5 s e max(5, Retry-After/2) s;
 *  - senza Retry-After: backoff crescente (30 s, 60 s, 90 s, ...) con jitter ±20%.
 */
export function rateLimitWaitSeconds(index: number, retryAfterSeconds: number | null, random: () => number = Math.random): number {
  if (retryAfterSeconds == null) return jobRetryDelaySeconds(index, null, random);
  const maxJitter = Math.max(5, retryAfterSeconds / 2);
  const jitter = 5 + random() * (maxJitter - 5);
  return Math.min(MAX_JOB_RETRY_WAIT_SECONDS, Math.ceil(retryAfterSeconds + jitter));
}

/** Esito di una singola esecuzione del passo (viene salvato da Inngest, quindi deve essere serializzabile). */
export type AiStepOutcome<T> = { retry: false; value: T } | { retry: true; retryAfterSeconds: number | null };

export type AiStepResult<T> = { ok: true; value: T } | { ok: false; reason: "rate-limited"; attempts: number };

type RunAiStepOptions<T> = {
  /** Nome base dei passi: i passi sono `${name}-${i}` (chiamata) e `wait-${name}-${i}` (attesa), unici per iterazione. */
  name: string;
  /** step.run (con il tenant context già applicato dal chiamante). */
  runStep: (id: string, fn: () => Promise<AiStepOutcome<T>>) => Promise<unknown>;
  /** step.sleep. */
  sleep: (id: string, duration: string) => Promise<unknown>;
  /** La chiamata AI (e quanto la accompagna): lancia GroqTransientError se Groq limita o è temporaneamente non disponibile. */
  call: () => Promise<T>;
  maxAttempts?: number;
  random?: () => number;
};

export async function runAiStepWithRateLimitWait<T>(options: RunAiStepOptions<T>): Promise<AiStepResult<T>> {
  const { name, runStep, sleep, call } = options;
  const maxAttempts = options.maxAttempts ?? AI_RATE_LIMIT_MAX_ATTEMPTS;

  for (let i = 0; i < maxAttempts; i++) {
    const outcome = (await runStep(`${name}-${i}`, async (): Promise<AiStepOutcome<T>> => {
      try {
        return { retry: false, value: await call() };
      } catch (e) {
        if (e instanceof GroqTransientError) return { retry: true, retryAfterSeconds: e.retryAfterSeconds };
        throw e;
      }
    })) as AiStepOutcome<T>;

    if (!outcome.retry) return { ok: true, value: outcome.value };

    // dopo l'ultimo tentativo non si aspetta più
    if (i < maxAttempts - 1) {
      await sleep(`wait-${name}-${i}`, `${rateLimitWaitSeconds(i, outcome.retryAfterSeconds, options.random)}s`);
    }
  }
  return { ok: false, reason: "rate-limited", attempts: maxAttempts };
}

export function rateLimitFailureMessage(step: string, attempts: number): string {
  return `${step}: limite di richieste AI ancora superato dopo ${attempts} tentativi`;
}
