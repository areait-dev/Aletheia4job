"use server";

import dayjs from "dayjs";
import { authenticateAndRedirect } from "./shared";
import { cronofyReadManagedEvents, getCronofyAccessTokenForUser } from "../integrations/cronofy";

export async function getCronofyEventsAction() {
  const { userId, organizationId } = await authenticateAndRedirect();
  
  const cronofyData = await getCronofyAccessTokenForUser({ organizationId, userId });
  if (!cronofyData) {
    return [];
  }

  try {
    const response = await cronofyReadManagedEvents({
      accessToken: cronofyData.accessToken,
      tzid: cronofyData.tzid,
      from: dayjs().subtract(1, "month").startOf("day").toISOString(),
      to: dayjs().add(3, "month").endOf("day").toISOString(),
    });

    return response.events.map(event => ({
      id: event.event_id || `cronofy-${Date.now()}`,
      type: "CRONOFY",
      title: event.summary,
      start: event.start,
      end: event.end,
      deleted: event.deleted,
      calendarId: event.calendar_id,
    }));
  } catch (error) {
    console.error("Errore nel recupero eventi Cronofy:", error);
    return [];
  }
}

export async function createCronofyEventAction(data: {
  summary: string;
  description?: string;
  start: string;
  end: string;
}) {
  const { userId, organizationId } = await authenticateAndRedirect();
  
  const cronofyData = await getCronofyAccessTokenForUser({ organizationId, userId });
  if (!cronofyData || !cronofyData.account.calendarId) {
    throw new Error("Account Cronofy non connesso o calendario non selezionato.");
  }

  try {
    const { cronofyUpsertEvent } = await import("../integrations/cronofy");
    
    await cronofyUpsertEvent({
      accessToken: cronofyData.accessToken,
      calendarId: cronofyData.account.calendarId,
      eventId: `app-event-${Date.now()}`,
      summary: data.summary,
      description: data.description,
      start: data.start,
      end: data.end,
      tzid: cronofyData.tzid,
    });

    return { success: true };
  } catch (error) {
    console.error("Errore nella creazione dell'evento Cronofy:", error);
    throw new Error("Impossibile creare l'evento su Cronofy.");
  }
}
