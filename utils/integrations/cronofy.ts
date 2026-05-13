import prisma from "@/utils/db";
import { decryptString, encryptString } from "@/utils/crypto";
import { fetchJsonOrThrow, fetchWithTimeout } from "@/utils/externalApi";

const baseUrl = process.env.CRONOFY_BASE_URL || "https://api.cronofy.com";
const clientId = process.env.CRONOFY_CLIENT_ID || "";
const clientSecret = process.env.CRONOFY_CLIENT_SECRET || "";
const redirectUri = process.env.CRONOFY_REDIRECT_URI || "";
const tzidDefault = process.env.CRONOFY_TZID || "Europe/Rome";

function assertCronofyEnv() {
  if (!clientId) throw new Error("CRONOFY_CLIENT_ID non configurata");
  if (!clientSecret) throw new Error("CRONOFY_CLIENT_SECRET non configurata");
  if (!redirectUri) throw new Error("CRONOFY_REDIRECT_URI non configurata");
}

export function buildCronofyAuthorizeUrl(state: string) {
  assertCronofyEnv();
  // Authorization must happen on app.cronofy.com, while API calls use api.cronofy.com
  const authBase = baseUrl.replace("api.", "app.");
  const url = new URL(`${authBase}/oauth/authorize`);
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set(
    "scope",
    [
      "read_events",
      "create_event",
      "delete_event",
      "list_calendars",
    ].join(" ")


  );
  url.searchParams.set("state", state);
  return url.toString();
}

export async function exchangeCronofyCode(code: string) {
  assertCronofyEnv();
  const body = new URLSearchParams();
  body.set("grant_type", "authorization_code");
  body.set("code", code);
  body.set("client_id", clientId);
  body.set("client_secret", clientSecret);
  body.set("redirect_uri", redirectUri);

  return fetchJsonOrThrow<{
    access_token: string;
    refresh_token: string;
    expires_in?: number;
    token_type: string;
    scope: string;
  }>(`${baseUrl}/oauth/token`, {
    method: "POST",
    body,
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    timeoutMs: 15_000,
    provider: "cronofy",
  });
}

export async function refreshCronofyToken(refreshToken: string) {
  assertCronofyEnv();
  const body = new URLSearchParams();
  body.set("grant_type", "refresh_token");
  body.set("refresh_token", refreshToken);
  body.set("client_id", clientId);
  body.set("client_secret", clientSecret);

  return fetchJsonOrThrow<{
    access_token: string;
    refresh_token: string;
    expires_in?: number;
    token_type: string;
    scope: string;
  }>(`${baseUrl}/oauth/token`, {
    method: "POST",
    body,
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    timeoutMs: 15_000,
    provider: "cronofy",
  });
}

export async function cronofyUserInfo(accessToken: string) {
  return fetchJsonOrThrow<any>(`${baseUrl}/v1/userinfo`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    timeoutMs: 10_000,
    provider: "cronofy",
  });
}

export async function cronofyListCalendars(accessToken: string) {
  return fetchJsonOrThrow<{
    sub: string;
    calendars: Array<{
      provider_name: string;
      profile_id: string;
      profile_name: string;
      calendar_id: string;
      calendar_name: string;
      calendar_readonly: boolean;
      calendar_deleted: boolean;
      calendar_primary: boolean;
    }>;
  }>(`${baseUrl}/v1/calendars`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    timeoutMs: 10_000,
    provider: "cronofy",
  });
}

export async function cronofyCreateChannel(accessToken: string, callbackUrl: string, calendarIds: string[]) {
  return fetchJsonOrThrow<{
    channel: { channel_id: string };
  }>(`${baseUrl}/v1/channels`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      callback_url: callbackUrl,
      filters: {
        calendar_ids: calendarIds,
        only_managed: true,
      },
    }),
    timeoutMs: 10_000,
    provider: "cronofy",
  });
}

export async function getCronofyAccessTokenForUser(params: { organizationId: string; userId: string }) {
  const acct = await prisma.cronofyAccount.findFirst({
    where: { organizationId: params.organizationId, userId: params.userId },
  });
  if (!acct) return null;

  const refreshToken = decryptString(acct.refreshTokenEnc);
  let accessToken = decryptString(acct.accessTokenEnc);

  const needsRefresh = acct.expiresAt ? acct.expiresAt.getTime() - Date.now() < 60_000 : false;
  if (needsRefresh) {
    const refreshed = await refreshCronofyToken(refreshToken);
    accessToken = refreshed.access_token;
    const newRefresh = refreshed.refresh_token || refreshToken;
    const expiresAt =
      refreshed.expires_in != null ? new Date(Date.now() + refreshed.expires_in * 1000) : null;

    await prisma.cronofyAccount.update({
      where: { id: acct.id },
      data: {
        accessTokenEnc: encryptString(accessToken),
        refreshTokenEnc: encryptString(newRefresh),
        expiresAt,
      },
    });
  }

  return {
    account: acct,
    accessToken,
    tzid: acct.tzid || tzidDefault,
  };
}

export async function cronofyUpsertEvent(params: {
  accessToken: string;
  calendarId: string;
  eventId: string;
  summary: string;
  description?: string | null;
  start: string;
  end: string;
  tzid?: string;
  location?: string | null;
}) {
  const body: any = {
    event_id: params.eventId,
    summary: params.summary,
    start: params.start,
    end: params.end,
    tzid: params.tzid || tzidDefault,
  };
  if (params.description !== undefined) body.description = params.description ?? "";
  if (params.location) body.location = { description: params.location };

  const res = await fetchWithTimeout(`${baseUrl}/v1/calendars/${params.calendarId}/events`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${params.accessToken}`,
      "Content-Type": "application/json; charset=utf-8",
    },
    body: JSON.stringify(body),
    timeoutMs: 10_000,
    provider: "cronofy",
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`Cronofy upsert fallita: ${res.status} ${t}`);
  }
}

export async function cronofyDeleteEvent(params: { accessToken: string; calendarId: string; eventId: string }) {
  const res = await fetchWithTimeout(`${baseUrl}/v1/calendars/${params.calendarId}/events`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${params.accessToken}`,
      "Content-Type": "application/json; charset=utf-8",
    },
    body: JSON.stringify({ event_id: params.eventId }),
    timeoutMs: 10_000,
    provider: "cronofy",
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`Cronofy delete fallita: ${res.status} ${t}`);
  }
}

export async function cronofyReadManagedEvents(params: {
  accessToken: string;
  tzid?: string;
  lastModified?: string;
}) {
  const url = new URL(`${baseUrl}/v1/events`);
  url.searchParams.set("tzid", params.tzid || tzidDefault);
  url.searchParams.set("only_managed", "true");
  url.searchParams.set("include_deleted", "true");
  if (params.lastModified) url.searchParams.set("last_modified", params.lastModified);

  return fetchJsonOrThrow<{
    events: Array<{
      event_id?: string;
      summary: string;
      start: string;
      end: string;
      deleted: boolean;
      calendar_id: string;
    }>;
  }>(url.toString(), {
    headers: { Authorization: `Bearer ${params.accessToken}` },
    timeoutMs: 15_000,
    provider: "cronofy",
  });
}

export function verifyCronofyHmac(rawBody: string, headerValue: string | null) {
  if (!headerValue) return true;
  assertCronofyEnv();
  const crypto = require("crypto");
  const expected = crypto.createHmac("sha256", clientSecret).update(rawBody, "utf8").digest("base64");
  const received = headerValue.split(",").map((s: string) => s.trim());
  return received.some((h) => {
    try {
      return crypto.timingSafeEqual(Buffer.from(h), Buffer.from(expected));
    } catch {
      return false;
    }
  });
}
