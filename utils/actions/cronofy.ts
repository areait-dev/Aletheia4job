"use server";

import dayjs from "dayjs";
import { authenticateAndRedirect } from "./shared";
import { prisma } from "@/lib/prisma";
import { cronofyReadManagedEvents, getCronofyAccessTokenForUser } from "../integrations/cronofy";

export async function getCronofyEventsAction() {
  const { userId, organizationId } = await authenticateAndRedirect();
  
  const cronofyData = await getCronofyAccessTokenForUser({ organizationId, userId });
  if (!cronofyData) {
    return [];
  }

  try {
    // 1. Recupera eventi da Cronofy
    let cronofyEventsList: any[] = [];
    try {
      const response = await cronofyReadManagedEvents({
        accessToken: cronofyData.accessToken,
        tzid: cronofyData.tzid,
        from: dayjs().subtract(1, "month").startOf("day").toISOString(),
        to: dayjs().add(3, "month").endOf("day").toISOString(),
      });
      cronofyEventsList = response.events.map(event => ({
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
    }

    // 2. Recupera eventi locali (protetto da errori se la tabella manca ancora)
    let localMapped: any[] = [];
    try {
      const localEvents = await prisma.calendarEvent.findMany({
        where: { organizationId, userId },
      });

      localMapped = localEvents.map(event => ({
        id: event.cronofyEventId || event.id,
        type: "CRONOFY",
        title: event.title,
        start: event.startDate.toISOString(),
        end: event.endDate.toISOString(),
        deleted: false,
        calendarId: null,
      }));
    } catch (e) {
      console.warn("Database locale non ancora pronto:", e);
    }

    // 3. Unione senza duplicati
    const merged = [...cronofyEventsList];
    localMapped.forEach(le => {
      if (!merged.find(me => me.id === le.id)) {
        merged.push(le);
      }
    });

    return merged;
  } catch (error) {
    console.error("Errore globale in getCronofyEventsAction:", error);
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
    const eventId = `app-event-${Date.now()}`;
    
    // 1. Tenta prima il salvataggio locale (così abbiamo una traccia subito)
    let localEvent;
    try {
      localEvent = await prisma.calendarEvent.create({
        data: {
          organizationId,
          userId,
          title: data.summary,
          description: data.description,
          startDate: new Date(data.start),
          endDate: new Date(data.end),
          cronofyEventId: eventId,
        }
      });
    } catch (dbError: any) {
      console.error("ERRORE DB LOCALE:", dbError);
      throw new Error(`Errore Database: ${dbError.message || "Impossibile salvare localmente"}`);
    }

    // 2. Tenta il salvataggio su Cronofy
    try {
      await cronofyUpsertEvent({
        accessToken: cronofyData.accessToken,
        calendarId: cronofyData.account.calendarId,
        eventId,
        summary: data.summary,
        description: data.description,
        start: dayjs(data.start).format("YYYY-MM-DDTHH:mm:ssZ"),
        end: dayjs(data.end).format("YYYY-MM-DDTHH:mm:ssZ"),
        tzid: cronofyData.tzid,
      });
    } catch (cronofyError: any) {
      console.error("ERRORE CRONOFY:", cronofyError);
      // Se Cronofy fallisce ma il DB ha salvato, segnaliamolo ma non resettiamo tutto
      return { 
        success: true, 
        message: `Salvato localmente, ma errore Cronofy: ${cronofyError.message || "Connessione fallita"}` 
      };
    }

    return { 
      success: true, 
      message: `Evento salvato con successo! (ID Locale: ${localEvent.id.substring(0,8)})` 
    };
  } catch (error: any) {
    console.error("ERRORE CRITICO:", error);
    // Esponiamo l'errore grezzo per capire cosa succede (solo in debug)
    throw new Error(`Dettaglio: ${error.message || "Errore sconosciuto"}`);
  }
}
