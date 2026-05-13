export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { getUpcomingInterviewsAction, getAbsencesAction, getCronofyEventsAction } from "@/utils/actions";
import CalendarClient from "@/components/CalendarClient";
import { Calendar as CalendarIcon, Video, Phone, Users, Clock } from "lucide-react";

export default async function CalendarPage() {
  return (
    <div className="p-10">
      <h1 className="text-2xl font-bold">Test di Emergenza Pagina Calendario</h1>
      <p>Se vedi questo, la pagina funziona e il problema è nel componente CalendarClient o nei dati.</p>
    </div>
  );
}
