export class ExternalApiError extends Error {
  status?: number;
  provider?: string;
  details?: unknown;

  constructor(message: string, opts?: { status?: number; provider?: string; details?: unknown }) {
    super(message);
    this.name = "ExternalApiError";
    this.status = opts?.status;
    this.provider = opts?.provider;
    this.details = opts?.details;
  }
}

export async function fetchWithTimeout(
  input: RequestInfo | URL,
  init?: RequestInit & { timeoutMs?: number; provider?: string }
) {
  const timeoutMs = init?.timeoutMs ?? 10_000;
  const provider = init?.provider;
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(input, { ...init, signal: controller.signal });
    return res;
  } catch (err: any) {
    if (err?.name === "AbortError") {
      throw new ExternalApiError("Timeout chiamata esterna", { provider });
    }
    throw new ExternalApiError("Errore chiamata esterna", { provider, details: err });
  } finally {
    clearTimeout(id);
  }
}

export async function fetchJsonOrThrow<T>(
  input: RequestInfo | URL,
  init?: RequestInit & { timeoutMs?: number; provider?: string }
): Promise<T> {
  const res = await fetchWithTimeout(input, init);
  const text = await res.text();
  if (!res.ok) {
    throw new ExternalApiError("Chiamata esterna fallita", {
      provider: init?.provider,
      status: res.status,
      details: text,
    });
  }
  return text ? (JSON.parse(text) as T) : ({} as T);
}

