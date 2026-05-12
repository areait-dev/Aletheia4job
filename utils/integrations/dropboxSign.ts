import crypto from "crypto";
import { fetchJsonOrThrow } from "@/utils/externalApi";

const baseUrl = "https://api.hellosign.com/v3";

function getApiKey() {
  const key = process.env.DROPBOX_SIGN_API_KEY;
  if (!key) throw new Error("DROPBOX_SIGN_API_KEY non configurata");
  return key;
}

function authHeader() {
  const token = Buffer.from(`${getApiKey()}:`, "utf8").toString("base64");
  return `Basic ${token}`;
}

export function isValidDropboxSignEventHash(params: {
  eventTime: string;
  eventType: string;
  eventHash: string;
}) {
  const expected = crypto
    .createHmac("sha256", getApiKey())
    .update(`${params.eventTime}${params.eventType}`, "utf8")
    .digest("hex");

  try {
    return crypto.timingSafeEqual(Buffer.from(params.eventHash), Buffer.from(expected));
  } catch {
    return false;
  }
}

export async function sendSignatureRequest(params: {
  title: string;
  subject: string;
  message: string;
  fileUrl: string;
  signers: Array<{ email: string; name: string; order?: number }>;
  testMode?: boolean;
  clientId?: string;
}) {
  const form = new FormData();
  form.append("title", params.title);
  form.append("subject", params.subject);
  form.append("message", params.message);
  form.append("file_urls[]", params.fileUrl);
  if (params.clientId) form.append("client_id", params.clientId);
  if (params.testMode) form.append("test_mode", "1");

  params.signers.forEach((s, i) => {
    form.append(`signers[${i}][email_address]`, s.email);
    form.append(`signers[${i}][name]`, s.name);
    form.append(`signers[${i}][order]`, String(s.order ?? i));
  });

  const res = await fetchJsonOrThrow<{ signature_request: { signature_request_id: string } }>(
    `${baseUrl}/signature_request/send`,
    {
      method: "POST",
      headers: {
        Authorization: authHeader(),
      },
      body: form as any,
      timeoutMs: 20_000,
      provider: "dropbox_sign",
    } as any
  );

  return res.signature_request.signature_request_id;
}

