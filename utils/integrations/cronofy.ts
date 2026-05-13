"use server";

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
