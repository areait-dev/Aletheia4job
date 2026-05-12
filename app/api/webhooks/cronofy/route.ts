import { NextRequest, NextResponse } from "next/server";
import prisma from "@/utils/db";
import {
  cronofyReadManagedEvents,
  getCronofyAccessTokenForUser,
  verifyCronofyHmac,
} from "@/utils/integrations/cronofy";

function toDate(value: string) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const hmacHeader = req.headers.get("Cronofy-HMAC-SHA256");
  if (!verifyCronofyHmac(rawBody, hmacHeader)) {
    return new NextResponse("invalid", { status: 401 });
  }

  let payload: any;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return new NextResponse("invalid", { status: 400 });
  }

  const channelId = payload?.channel?.channel_id;
  const notification = payload?.notification;

  if (!channelId || !notification?.type) {
    return new NextResponse("ok", { status: 200 });
  }

  if (notification.type === "verification") {
    return new NextResponse("ok", { status: 200 });
  }

  const acct = await prisma.cronofyAccount.findFirst({ where: { channelId } });
  if (!acct) return new NextResponse("ok", { status: 200 });

  if (notification.type !== "change") return new NextResponse("ok", { status: 200 });
  const changesSince = notification.changes_since;
  const access = await getCronofyAccessTokenForUser({ organizationId: acct.organizationId, userId: acct.userId });
  if (!access || !access.account.calendarId) return new NextResponse("ok", { status: 200 });

  const events = await cronofyReadManagedEvents({
    accessToken: access.accessToken,
    lastModified: changesSince || undefined,
    tzid: access.tzid,
  });

  for (const ev of events.events || []) {
    const id = ev.event_id;
    if (!id) continue;

    const interview = await prisma.interview.findFirst({ where: { id, organizationId: acct.organizationId } });
    if (interview) {
      if (ev.deleted) {
        await prisma.interview.deleteMany({ where: { id, organizationId: acct.organizationId } });
        continue;
      }
      const start = toDate(ev.start);
      const end = toDate(ev.end);
      const duration = start && end ? Math.max(1, Math.round((end.getTime() - start.getTime()) / 60000)) : null;
      await prisma.interview.updateMany({
        where: { id, organizationId: acct.organizationId },
        data: {
          cronofyCalendarId: ev.calendar_id,
          ...(start ? { scheduledAt: start } : {}),
          ...(duration ? { duration } : {}),
        },
      });
      continue;
    }

    const absence = await prisma.absence.findFirst({ where: { id, organizationId: acct.organizationId } });
    if (absence) {
      if (ev.deleted) {
        await prisma.absence.deleteMany({ where: { id, organizationId: acct.organizationId } });
        continue;
      }
      const start = toDate(ev.start);
      const end = toDate(ev.end);
      if (!start || !end) continue;
      await prisma.absence.updateMany({
        where: { id, organizationId: acct.organizationId },
        data: {
          cronofyCalendarId: ev.calendar_id,
          startDate: start,
          endDate: end,
        },
      });
    }
  }

  return new NextResponse("ok", { status: 200 });
}

