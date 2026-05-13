import { NextRequest, NextResponse } from "next/server";
import prisma from "@/utils/db";
import { encryptString } from "@/utils/crypto";
import { verifyState } from "@/utils/signedState";
import {
  cronofyListCalendars,
  cronofyUserInfo,
  exchangeCronofyCode,
} from "@/utils/integrations/cronofy";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const error = url.searchParams.get("error");

  if (error) {
    return NextResponse.redirect(new URL(`/admin?cronofy=error`, req.url));
  }
  if (!code || !state) {
    return NextResponse.redirect(new URL(`/admin?cronofy=missing`, req.url));
  }

  const payload = verifyState<{ userId: string; organizationId: string; ts: number }>(state);
  if (!payload?.userId || !payload?.organizationId) {
    return NextResponse.redirect(new URL(`/admin?cronofy=invalid_state`, req.url));
  }

    try {
    const token = await exchangeCronofyCode(code);
    const expiresAt =
      token.expires_in != null ? new Date(Date.now() + token.expires_in * 1000) : null;

    const userInfo = await cronofyUserInfo(token.access_token);
    const calendars = await cronofyListCalendars(token.access_token);
    
    const calendarList = calendars?.calendars || [];
    const writable = calendarList
      .filter((c) => !c.calendar_deleted && !c.calendar_readonly)
      .sort((a, b) => Number(b.calendar_primary) - Number(a.calendar_primary))[0];

    // ▲ CONFIGURAZIONE WEBHOOK: Generiamo il canale di notifica in tempo reale
    const webhookBase = process.env.NEXT_PUBLIC_SITE_URL || "vercel.app";
    const callbackUrl = `${webhookBase.replace(/\/$/, "")}/api/webhooks/cronofy`;

    const channel = writable?.calendar_id
      ? await cronofyCreateChannel(token.access_token, callbackUrl, [writable.calendar_id])
      : null;

    const channelId = channel?.channel?.channel_id || null;

    await prisma.cronofyAccount.upsert({
      where: {
        organizationId_userId: {
          organizationId: payload.organizationId,
          userId: payload.userId,
        },
      },
      update: {
        cronofySub: userInfo?.sub || calendars?.sub || "unknown",
        profileId: writable?.profile_id || null,
        calendarId: writable?.calendar_id || null,
        accessTokenEnc: encryptString(token.access_token),
        refreshTokenEnc: encryptString(token.refresh_token),
        expiresAt,
        channelId, // Salva l'ID del canale per mappare le notifiche push in entrata
      },
      create: {
        organizationId: payload.organizationId,
        userId: payload.userId,
        cronofySub: userInfo?.sub || calendars?.sub || "unknown",
        profileId: writable?.profile_id || null,
        calendarId: writable?.calendar_id || null,
        accessTokenEnc: encryptString(token.access_token),
        refreshTokenEnc: encryptString(token.refresh_token),
        expiresAt,
        channelId,
      },
    });

    return NextResponse.redirect(new URL(`/admin?cronofy=connected`, req.url));
  } catch (err) {
    console.error("Errore durante il callback di Cronofy:", err);
    return NextResponse.redirect(new URL(`/admin?cronofy=server_error`, req.url));
  }
