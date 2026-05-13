export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { getUpcomingInterviewsAction, getAbsencesAction, getCronofyEventsAction } from "@/utils/actions";
import CalendarClient from "@/components/CalendarClient";

export default async function CalendarPage() {
  let interviews: any[] = [];
  let absences: any[] = [];
  let cronofyEvents: any[] = [];

  try {
    const results = await Promise.allSettled([
      getUpcomingInterviewsAction(),
      getAbsencesAction(),
      getCronofyEventsAction()
    ]);
    
    if (results[0].status === 'fulfilled') interviews = results[0].value;
    if (results[1].status === 'fulfilled') absences = results[1].value;
    if (results[2].status === 'fulfilled') cronofyEvents = results[2].value;
  } catch (error) {
    console.error("Errore nel caricamento dati:", error);
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Calendario</h1>
      </div>
      <CalendarClient interviews={interviews} absences={absences} cronofyEvents={cronofyEvents} />
    </div>
  );
}
