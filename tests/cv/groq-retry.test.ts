import { describe, expect, it, vi } from "vitest";
import {
  GroqTransientError,
  callWithGroqRetry,
  getRetryAfterSeconds,
  isTransientGroqError,
  jobRetryDelaySeconds,
} from "@/lib/groqRetry";

const apiError = (status: number, headers?: Record<string, string>) => Object.assign(new Error(`HTTP ${status}`), { status, headers });
const noJitter = () => 0.5; // 0.75 + 0.5*0.5 = 1.0 -> nessuna variazione

describe("isTransientGroqError", () => {
  it("429, 408, 5xx e errori di rete sono temporanei; 400/401/422 e errori di parsing no", () => {
    for (const s of [429, 408, 500, 502, 503]) expect(isTransientGroqError(apiError(s))).toBe(true);
    for (const s of [400, 401, 403, 404, 422]) expect(isTransientGroqError(apiError(s))).toBe(false);
    expect(isTransientGroqError(new Error("Connection error."))).toBe(true);
    expect(isTransientGroqError(Object.assign(new Error("x"), { code: "ECONNRESET" }))).toBe(true);
    expect(isTransientGroqError(new SyntaxError("Unexpected token in JSON"))).toBe(false);
    expect(isTransientGroqError(new GroqTransientError("x"))).toBe(true);
  });
});

describe("getRetryAfterSeconds", () => {
  it("legge Retry-After da oggetto semplice o da Headers", () => {
    expect(getRetryAfterSeconds(apiError(429, { "retry-after": "7" }))).toBe(7);
    expect(getRetryAfterSeconds({ headers: new Headers({ "Retry-After": "3" }) })).toBe(3);
    expect(getRetryAfterSeconds(apiError(429))).toBeNull();
  });
});

describe("callWithGroqRetry", () => {
  it("riesce al primo tentativo senza attese", async () => {
    const sleep = vi.fn();
    const fn = vi.fn().mockResolvedValue("ok");
    expect(await callWithGroqRetry(fn, { sleep })).toBe("ok");
    expect(sleep).not.toHaveBeenCalled();
  });

  it("su 429 riprova con attesa crescente (1 s, 2 s) e poi riesce", async () => {
    const sleep = vi.fn().mockResolvedValue(undefined);
    const fn = vi.fn().mockRejectedValueOnce(apiError(429)).mockRejectedValueOnce(apiError(429)).mockResolvedValue("ok");
    expect(await callWithGroqRetry(fn, { sleep, random: noJitter })).toBe("ok");
    expect(fn).toHaveBeenCalledTimes(3);
    expect(sleep.mock.calls.map((c) => c[0])).toEqual([1000, 2000]);
  });

  it("rispetta Retry-After quando è breve", async () => {
    const sleep = vi.fn().mockResolvedValue(undefined);
    const fn = vi.fn().mockRejectedValueOnce(apiError(429, { "retry-after": "3" })).mockResolvedValue("ok");
    await callWithGroqRetry(fn, { sleep, random: () => 0 });
    expect(sleep.mock.calls[0][0]).toBe(3000);
  });

  it("se Retry-After è lungo non aspetta dentro la funzione: passa la mano con GroqTransientError", async () => {
    const sleep = vi.fn();
    const fn = vi.fn().mockRejectedValue(apiError(429, { "retry-after": "45" }));
    const err: any = await callWithGroqRetry(fn, { sleep }).catch((e) => e as any);
    expect(err).toBeInstanceOf(GroqTransientError);
    expect(err.retryAfterSeconds).toBe(45);
    expect(fn).toHaveBeenCalledTimes(1);
    expect(sleep).not.toHaveBeenCalled();
  });

  it("finiti i tentativi ravvicinati lancia GroqTransientError (3 chiamate in tutto)", async () => {
    const sleep = vi.fn().mockResolvedValue(undefined);
    const fn = vi.fn().mockRejectedValue(apiError(429));
    const err: any = await callWithGroqRetry(fn, { sleep, random: noJitter }).catch((e) => e as any);
    expect(err).toBeInstanceOf(GroqTransientError);
    expect(err.status).toBe(429);
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it("errori non temporanei: nessun nuovo tentativo", async () => {
    const sleep = vi.fn();
    const fn = vi.fn().mockRejectedValue(apiError(401));
    await expect(callWithGroqRetry(fn, { sleep })).rejects.toMatchObject({ status: 401 });
    expect(fn).toHaveBeenCalledTimes(1);
  });
});

describe("jobRetryDelaySeconds", () => {
  it("senza Retry-After cresce a ogni tentativo (30, 60, 90 s) e si ferma a 90 s", () => {
    const mid = () => 0.5; // jitter neutro
    expect([0, 1, 2, 3, 4, 8, 50].map((a) => jobRetryDelaySeconds(a, null, mid))).toEqual([30, 60, 90, 90, 90, 90, 90]);
  });
  it("senza Retry-After e con attempt alto non supera mai 90 s, nemmeno con il jitter massimo", () => {
    for (const a of [3, 5, 10, 100]) {
      expect(jobRetryDelaySeconds(a, null, () => 0)).toBeLessThanOrEqual(90);
      expect(jobRetryDelaySeconds(a, null, () => 1)).toBe(90);
    }
  });
  it("con Retry-After breve l'attesa è Retry-After + 0-5 s, anche con attempt alto", () => {
    expect(jobRetryDelaySeconds(8, 10, () => 0)).toBe(10);
    expect(jobRetryDelaySeconds(8, 10, () => 0.5)).toBe(13); // 10 + 2,5 s -> arrotondato per eccesso
    expect(jobRetryDelaySeconds(8, 10, () => 1)).toBe(15);
    expect(jobRetryDelaySeconds(0, 10, () => 0.5)).toBe(jobRetryDelaySeconds(8, 10, () => 0.5)); // attempt non conta
  });
  it("non è mai inferiore a Retry-After (se entro il tetto) e mai oltre 90 s", () => {
    expect(jobRetryDelaySeconds(0, 45.4, () => 0)).toBe(46);
    expect(jobRetryDelaySeconds(0, 90, () => 0.5)).toBe(90);
    expect(jobRetryDelaySeconds(0, 600, () => 0)).toBe(90);
  });
  it("il jitter senza Retry-After resta nel ±20%", () => {
    expect(jobRetryDelaySeconds(1, null, () => 0)).toBe(48);
    expect(jobRetryDelaySeconds(1, null, () => 1)).toBe(72);
  });
});
