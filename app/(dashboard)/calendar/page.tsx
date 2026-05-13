export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { getUpcomingInterviewsAction } from "@/utils/actions/interviews";
import { getAbsencesAction } from "@/utils/actions/attendance";
import { getCronofyEventsAction } from "@/utils/actions/cronofy";
import CalendarClient from "@/components/CalendarClient";

export default async function CalendarPage() {
  let interviews: any[] = [];
  let absences: any[] = [];
  let cronofyEvents: any[] = [];

  // Caricamento ultra-protetto singolarmente
  try {
    interviews = await getUpcomingInterviewsAction().catch(() => []);
  } catch (e) {}

  try {
    absences = await getAbsencesAction().catch(() => []);
  } catch (e) {}

  try {
    cronofyEvents = await getCronofyEventsAction().catch(() => []);
  } catch (e) {}

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
            Calendario
          </h1>
          <p className="text-muted-foreground mt-1">
            Gestisci i tuoi appuntamenti, colloqui e disponibilità in un unico posto.
          </p>
        </div>
      </div>

      <CalendarClient interviews={interviews} absences={absences} cronofyEvents={cronofyEvents} />
    </div>
  );
}
