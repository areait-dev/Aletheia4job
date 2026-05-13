export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { getUpcomingInterviewsAction, getAbsencesAction, getCronofyEventsAction } from "@/utils/actions";
import CalendarClient from "@/components/CalendarClient";
import { Calendar as CalendarIcon } from "lucide-react";

export default async function CalendarPage() {
  let interviews: any[] = [];
  const absences: any[] = [];
  const cronofyEvents: any[] = [];

  try {
    interviews = await getUpcomingInterviewsAction();
  } catch (error) {
    console.error("Errore interviste:", error);
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Calendario</h1>
      </div>
      <CalendarClient interviews={interviews} absences={absences} cronofyEvents={cronofyEvents} />
    </div>
  );
}
