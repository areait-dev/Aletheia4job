"use server";

import dayjs from "dayjs";
import { authenticateAndRedirect } from "./shared";
import prisma from "@/utils/db";
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
          description: data.description || "",
          startDate: new Date(data.start),
          endDate: new Date(data.end),
          cronofyEventId: eventId,
        }
      });
    } catch (dbError: any) {
      console.error("ERRORE DB LOCALE:", dbError);
      throw new Error(`Errore Database Locale: ${dbError.message}`);
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
    console.error("ERRORE SALVATAGGIO:", error);
    return { success: false, message: `DETTAGLIO: ${error.message || "Errore sconosciuto"}` };
  }
}

export async function deleteCronofyEventAction(eventId: string) {
  const { userId, organizationId } = await authenticateAndRedirect();
  
  try {
    // 1. Cerca l'evento nel DB locale
    const event = await prisma.calendarEvent.findUnique({
      where: { id: eventId }
    });

    if (!event) {
      // Potrebbe essere un ID di Cronofy direttamente? Proviamo a cercare per cronofyEventId
      const eventByCronofyId = await prisma.calendarEvent.findUnique({
        where: { cronofyEventId: eventId }
      });
      if (!eventByCronofyId) return { success: false, message: "Evento non trovato." };
    }

    const targetEvent = event || await prisma.calendarEvent.findUnique({ where: { cronofyEventId: eventId } });
    if (!targetEvent) return { success: false, message: "Evento non trovato." };

    // 2. Tenta l'eliminazione su Cronofy se abbiamo il token e l'ID
    const cronofyData = await getCronofyAccessTokenForUser({ organizationId, userId });
    if (cronofyData && cronofyData.account.calendarId && targetEvent.cronofyEventId) {
      try {
        const { cronofyDeleteEvent } = await import("../integrations/cronofy");
        await cronofyDeleteEvent({
          accessToken: cronofyData.accessToken,
          calendarId: cronofyData.account.calendarId,
          eventId: targetEvent.cronofyEventId,
        });
      } catch (cronofyError) {
        console.error("Errore eliminazione Cronofy (procedo comunque localmente):", cronofyError);
      }
    }

    // 3. Elimina dal DB locale
    await prisma.calendarEvent.delete({
      where: { id: targetEvent.id }
    });

    return { success: true, message: "Evento eliminato con successo." };
  } catch (error: any) {
    console.error("ERRORE ELIMINAZIONE:", error);
    return { success: false, message: error.message || "Errore durante l'eliminazione." };
  }
}

export async function updateCronofyEventAction(eventId: string, data: {
  summary: string;
  description?: string;
  start: string;
  end: string;
}) {
  const { userId, organizationId } = await authenticateAndRedirect();
  
  try {
    // 1. Aggiorna DB locale
    const localEvent = await prisma.calendarEvent.update({
      where: { id: eventId },
      data: {
        title: data.summary,
        description: data.description || "",
        startDate: new Date(data.start),
        endDate: new Date(data.end),
      }
    });

    // 2. Tenta l'aggiornamento su Cronofy
    const cronofyData = await getCronofyAccessTokenForUser({ organizationId, userId });
    if (cronofyData && cronofyData.account.calendarId && localEvent.cronofyEventId) {
      try {
        const { cronofyUpsertEvent } = await import("../integrations/cronofy");
        await cronofyUpsertEvent({
          accessToken: cronofyData.accessToken,
          calendarId: cronofyData.account.calendarId,
          eventId: localEvent.cronofyEventId,
          summary: data.summary,
          description: data.description,
          start: dayjs(data.start).format("YYYY-MM-DDTHH:mm:ssZ"),
          end: dayjs(data.end).format("YYYY-MM-DDTHH:mm:ssZ"),
          tzid: cronofyData.tzid,
        });
      } catch (cronofyError: any) {
        console.error("Errore aggiornamento Cronofy:", cronofyError);
        return { 
          success: true, 
          message: "Aggiornato localmente, ma sincronizzazione Cronofy fallita." 
        };
      }
    }

    return { success: true, message: "Evento aggiornato con successo." };
  } catch (error: any) {
    console.error("ERRORE AGGIORNAMENTO:", error);
    return { success: false, message: error.message || "Errore durante l'aggiornamento." };
  }
}
