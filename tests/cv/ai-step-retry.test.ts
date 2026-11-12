import { describe, expect, it, vi } from "vitest";
import {
  AI_RATE_LIMIT_MAX_ATTEMPTS,
  rateLimitFailureMessage,
  rateLimitWaitSeconds,
  runAiStepWithRateLimitWait,
} from "@/lib/aiStepRetry";
import { GroqTransientError } from "@/lib/groqRetry";

const rateLimited = (retryAfterSeconds: number | null = 30) => new GroqTransientError("Groq: troppe richieste (429)", { status: 429, retryAfterSeconds });

/** Simula step.run / step.sleep di Inngest: registra gli ID e le durate. */
function fakeSteps() {
  const runIds: string[] = [];
  const sleeps: { id: string; duration: string }[] = [];
  return {
    runIds,
    sleeps,
    runStep: vi.fn(async (id: string, fn: () => Promise<unknown>) => {
      runIds.push(id);
      return JSON.parse(JSON.stringify((await fn()) ?? null));
    }),
    sleep: vi.fn(async (id: string, duration: string) => {
      sleeps.push({ id, duration });
    }),
  };
}

describe("rateLimitWaitSeconds", () => {
  it("con Retry-After: Retry-After + jitter fra 5 s e max(5, Retry-After/2) s", () => {
    expect(rateLimitWaitSeconds(0, 30, () => 0)).toBe(35); // 30 + 5
    expect(rateLimitWaitSeconds(0, 30, () => 1)).toBe(45); // 30 + 15
    expect(rateLimitWaitSeconds(0, 4, () => 1)).toBe(9); // max(5, 2) = 5 -> jitter fisso a 5
  });
  it("con Retry-After il tentativo non conta", () => {
    expect(rateLimitWaitSeconds(0, 20, () => 0.5)).toBe(rateLimitWaitSeconds(7, 20, () => 0.5));
  });
  it("tetto di 90 s anche con Retry-After lungo", () => {
    expect(rateLimitWaitSeconds(0, 85, () => 1)).toBe(90);
    expect(rateLimitWaitSeconds(0, 600, () => 0)).toBe(90);
  });
  it("senza Retry-After: backoff 30, 60, 90 s con lo stesso tetto", () => {
    const mid = () => 0.5;
    expect([0, 1, 2, 5, 20].map((i) => rateLimitWaitSeconds(i, null, mid))).toEqual([30, 60, 90, 90, 90]);
  });
});

describe("runAiStepWithRateLimitWait", () => {
  it("successo al primo colpo: nessuna attesa", async () => {
    const s = fakeSteps();
    const call = vi.fn().mockResolvedValue({ name: "Mario" });
    const res = await runAiStepWithRateLimitWait({ name: "ai-parse-cv", runStep: s.runStep, sleep: s.sleep, call });
    expect(res).toEqual({ ok: true, value: { name: "Mario" } });
    expect(call).toHaveBeenCalledTimes(1);
    expect(s.runIds).toEqual(["ai-parse-cv-0"]);
    expect(s.sleeps).toEqual([]);
  });

  it("due 429 e poi successo: attese corrette e ID dei passi unici", async () => {
    const s = fakeSteps();
    const call = vi.fn().mockRejectedValueOnce(rateLimited(30)).mockRejectedValueOnce(rateLimited(20)).mockResolvedValue("ok");
    const res = await runAiStepWithRateLimitWait({ name: "ai-parse-cv", runStep: s.runStep, sleep: s.sleep, call, random: () => 0 });
    expect(res).toEqual({ ok: true, value: "ok" });
    expect(call).toHaveBeenCalledTimes(3);
    expect(s.runIds).toEqual(["ai-parse-cv-0", "ai-parse-cv-1", "ai-parse-cv-2"]);
    expect(s.sleeps).toEqual([
      { id: "wait-ai-parse-cv-0", duration: "35s" }, // 30 + 5
      { id: "wait-ai-parse-cv-1", duration: "25s" }, // 20 + 5
    ]);
    const all = [...s.runIds, ...s.sleeps.map((x) => x.id)];
    expect(new Set(all).size).toBe(all.length);
  });

  it("senza Retry-After usa il backoff crescente", async () => {
    const s = fakeSteps();
    const call = vi.fn().mockRejectedValueOnce(rateLimited(null)).mockRejectedValueOnce(rateLimited(null)).mockResolvedValue(1);
    await runAiStepWithRateLimitWait({ name: "x", runStep: s.runStep, sleep: s.sleep, call, random: () => 0.5 });
    expect(s.sleeps.map((x) => x.duration)).toEqual(["30s", "60s"]);
  });

  it("8 tentativi esauriti: esito di fallimento, senza attesa dopo l'ultimo", async () => {
    const s = fakeSteps();
    const call = vi.fn().mockRejectedValue(rateLimited(10));
    const res = await runAiStepWithRateLimitWait({ name: "ai-match-score", runStep: s.runStep, sleep: s.sleep, call });
    expect(AI_RATE_LIMIT_MAX_ATTEMPTS).toBe(8);
    expect(res).toEqual({ ok: false, reason: "rate-limited", attempts: 8 });
    expect(call).toHaveBeenCalledTimes(8);
    expect(s.runIds).toHaveLength(8);
    expect(s.sleeps).toHaveLength(7);
    expect(s.sleeps[6].id).toBe("wait-ai-match-score-6");
  });

  it("errore non temporaneo: rilanciato (valgono i retries di Inngest), senza attese", async () => {
    const s = fakeSteps();
    const boom = new Error("risposta AI non valida");
    const call = vi.fn().mockRejectedValue(boom);
    await expect(runAiStepWithRateLimitWait({ name: "ai-parse-cv", runStep: s.runStep, sleep: s.sleep, call })).rejects.toBe(boom);
    expect(call).toHaveBeenCalledTimes(1);
    expect(s.sleeps).toEqual([]);
  });

  it("un errore non temporaneo dopo un 429 viene comunque rilanciato", async () => {
    const s = fakeSteps();
    const boom = new Error("chiave non valida");
    const call = vi.fn().mockRejectedValueOnce(rateLimited(5)).mockRejectedValueOnce(boom);
    await expect(runAiStepWithRateLimitWait({ name: "n", runStep: s.runStep, sleep: s.sleep, call })).rejects.toBe(boom);
    expect(s.sleeps).toHaveLength(1);
  });
});

describe("rateLimitFailureMessage", () => {
  it("messaggio chiaro per parsingError", () => {
    expect(rateLimitFailureMessage("lettura del CV", 8)).toBe("lettura del CV: limite di richieste AI ancora superato dopo 8 tentativi");
  });
});
