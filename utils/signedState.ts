import crypto from "crypto";

function base64url(buf: Buffer) {
  return buf
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function fromBase64url(str: string) {
  const pad = 4 - (str.length % 4 || 4);
  const b64 = str.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat(pad === 4 ? 0 : pad);
  return Buffer.from(b64, "base64");
}

function getSecret() {
  const s = process.env.SIGNED_STATE_SECRET || process.env.APP_ENCRYPTION_KEY;
  if (!s) throw new Error("SIGNED_STATE_SECRET non configurata");
  return s;
}

export function signState(payload: unknown) {
  const json = Buffer.from(JSON.stringify(payload), "utf8");
  const encoded = base64url(json);
  const sig = crypto.createHmac("sha256", getSecret()).update(encoded, "utf8").digest("hex");
  return `${encoded}.${sig}`;
}

export function verifyState<T>(state: string): T | null {
  const [encoded, sig] = state.split(".", 2);
  if (!encoded || !sig) return null;
  const expected = crypto.createHmac("sha256", getSecret()).update(encoded, "utf8").digest("hex");
  try {
    if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
  } catch {
    return null;
  }
  try {
    return JSON.parse(fromBase64url(encoded).toString("utf8")) as T;
  } catch {
    return null;
  }
}

