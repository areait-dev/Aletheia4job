export const dynamic = 'force-dynamic';

import { getUpcomingInterviewsAction, getAbsencesAction, getCronofyEventsAction } from "@/utils/actions";
import CalendarClient from "@/components/CalendarClient";
import { Calendar as CalendarIcon, Video, Phone, Users, Clock } from "lucide-react";

export default async function CalendarPage() {
  const [interviews, absences, cronofyEvents] = await Promise.all([
    getUpcomingInterviewsAction(50),
    getAbsencesAction({ from: new Date().toISOString() }),
    getCronofyEventsAction()
  ]);

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Calendario Eventi</h1>
          <p className="text-muted-foreground mt-1">Colloqui, scadenze e assenze del team in un'unica vista</p>
        </div>
        <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center">
          <CalendarIcon className="w-5 h-5 text-primary" />
        </div>
      </div>

      <CalendarClient interviews={interviews} absences={absences} cronofyEvents={cronofyEvents} />
    </div>
  );
}
