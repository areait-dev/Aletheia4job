import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import dayjs from "dayjs";
import "dayjs/locale/it";
import isBetween from "dayjs/plugin/isBetween";
import { 
  Video, 
  Phone, 
  MapPin, 
  User, 
  Calendar as CalendarIcon, 
  Clock, 
  ChevronRight, 
  Plane,
  Plus,
  Calendar,
  ChevronLeft,
  LayoutGrid,
  List
} from "lucide-react";
import { cn } from "@/lib/utils";
import { createCronofyEventAction } from "@/utils/actions";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

dayjs.extend(isBetween);
dayjs.locale("it");

type CalendarClientProps = {
  interviews: any[];
  absences: any[];
  cronofyEvents?: any[];
};

export default function CalendarClient({ interviews, absences, cronofyEvents = [] }: CalendarClientProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [view, setView] = useState<"list" | "month">("month");
  const [currentMonth, setCurrentMonth] = useState(dayjs());
  
  // Modal state
  const [isAddingEvent, setIsAddingEvent] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Form state
  const [summary, setSummary] = useState("");
  const [description, setDescription] = useState("");
  const [startDate, setStartDate] = useState(dayjs().format("YYYY-MM-DDTHH:mm"));
  const [endDate, setEndDate] = useState(dayjs().add(1, 'hour').format("YYYY-MM-DDTHH:mm"));

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      await createCronofyEventAction({
        summary,
        description,
        start: dayjs(startDate).toISOString(),
        end: dayjs(endDate).toISOString(),
      });
      
      toast({
        title: "Evento creato!",
        description: "L'impegno è stato aggiunto al tuo calendario Cronofy.",
      });
      
      setIsAddingEvent(false);
      setSummary("");
      setDescription("");
      router.refresh();
    } catch (error) {
      toast({
        title: "Errore",
        description: "Impossibile creare l'evento. Riprova più tardi.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Processiamo gli eventi
  const allEvents = useMemo(() => {
    return [
      ...interviews.map(i => ({
        id: i.id,
        type: "INTERVIEW",
        title: `Colloquio: ${i.candidate?.firstName || ''} ${i.candidate?.lastName || ''}`,
        date: dayjs(i.scheduledAt),
        category: i.type,
        recruiter: i.recruiterName,
        location: i.location,
      })),
      ...absences.filter(a => a.status === "APPROVED").map(a => ({
        id: a.id,
        type: "ABSENCE",
        title: `Assenza: ${a.employee?.firstName || ''} ${a.employee?.lastName || ''}`,
        date: dayjs(a.startDate),
        endDate: dayjs(a.endDate),
        category: a.type,
        recruiter: null,
        location: null,
      })),
      ...cronofyEvents.filter(e => !e.deleted).map(e => ({
        id: e.id,
        type: "CRONOFY",
        title: e.title,
        date: dayjs(e.start),
        endDate: e.end ? dayjs(e.end) : null,
        category: "CALENDAR",
        recruiter: null,
        location: null,
      }))
    ].sort((a, b) => a.date.unix() - b.date.unix());
  }, [interviews, absences, cronofyEvents]);

  // Griglia del mese
  const monthDays = useMemo(() => {
    const startOfMonth = currentMonth.startOf("month");
    const endOfMonth = currentMonth.endOf("month");
    const startDate = startOfMonth.startOf("week");
    const endDate = endOfMonth.endOf("week");

    const days = [];
    let day = startDate;

    while (day.isBefore(endDate) || day.isSame(endDate, "day")) {
      days.push(day);
      day = day.add(1, "day");
    }
    return days;
  }, [currentMonth]);

  // Raggruppiamo per giorno
  const groupedEvents = useMemo(() => {
    const grouped: Record<string, any[]> = {};
    allEvents.forEach(event => {
      const dayKey = event.date.format("YYYY-MM-DD");
      if (!grouped[dayKey]) grouped[dayKey] = [];
      grouped[dayKey].push(event);
    });
    return grouped;
  }, [allEvents]);

  const listDays = Object.keys(groupedEvents).sort();

  return (
    <div className="space-y-6">
      {/* Header con Switcher di Vista */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 glass p-4 rounded-3xl">
        <div className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => setCurrentMonth(prev => prev.subtract(1, 'month'))}
          >
            <ChevronLeft className="w-5 h-5" />
          </Button>
          <h2 className="text-xl font-bold min-w-[150px] text-center capitalize">
            {currentMonth.format("MMMM YYYY")}
          </h2>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => setCurrentMonth(prev => prev.add(1, 'month'))}
          >
            <ChevronRight className="w-5 h-5" />
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => setCurrentMonth(dayjs())}
            className="hidden sm:flex"
          >
            Oggi
          </Button>
        </div>

        <div className="flex items-center bg-background/50 p-1 rounded-xl border border-primary/10">
          <button 
            onClick={() => setView("month")}
            className={cn(
              "px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-medium transition-all",
              view === "month" ? "bg-primary text-primary-foreground shadow-lg" : "hover:bg-background"
            )}
          >
            <LayoutGrid className="w-4 h-4" />
            Mese
          </button>
          <button 
            onClick={() => setView("list")}
            className={cn(
              "px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-medium transition-all",
              view === "list" ? "bg-primary text-primary-foreground shadow-lg" : "hover:bg-background"
            )}
          >
            <List className="w-4 h-4" />
            Agenda
          </button>
        </div>
      </div>

      <div className="grid lg:grid-cols-4 gap-8">
        {/* Sidebar */}
        <div className="lg:col-span-1 space-y-6">
          <Button 
            onClick={() => setIsAddingEvent(true)}
            className="w-full h-14 rounded-2xl shadow-lg shadow-primary/20 flex items-center gap-2 text-lg font-bold"
          >
            <Plus className="w-5 h-5" />
            Nuovo Impegno
          </Button>

          <div className="glass rounded-3xl p-6">
            <h3 className="font-bold text-sm uppercase tracking-widest text-muted-foreground mb-4">Riepilogo</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Interviste</span>
                <span className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-600 flex items-center justify-center font-bold text-xs">{interviews.length}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Assenze</span>
                <span className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-600 flex items-center justify-center font-bold text-xs">{absences.length}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Extra (Cronofy)</span>
                <span className="w-8 h-8 rounded-lg bg-purple-500/10 text-purple-600 flex items-center justify-center font-bold text-xs">{cronofyEvents?.length || 0}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Main Calendar Content */}
        <div className="lg:col-span-3">
          {isAddingEvent && (
            <div className="glass rounded-3xl p-8 border-primary/30 mb-8 animate-in zoom-in-95 duration-200">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold">Nuovo Evento su Calendario</h3>
                <Button variant="ghost" size="sm" onClick={() => setIsAddingEvent(false)}>Annulla</Button>
              </div>
              
              <form onSubmit={handleCreateEvent} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="summary">Titolo</Label>
                  <Input id="summary" value={summary} onChange={(e) => setSummary(e.target.value)} required placeholder="Riunione..." />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="start">Inizio</Label>
                    <Input id="start" type="datetime-local" value={startDate} onChange={(e) => setStartDate(e.target.value)} required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="end">Fine</Label>
                    <Input id="end" type="datetime-local" value={endDate} onChange={(e) => setEndDate(e.target.value)} required />
                  </div>
                </div>
                <Button type="submit" className="w-full" disabled={isSubmitting}>
                  {isSubmitting ? "Creazione..." : "Salva Evento"}
                </Button>
              </form>
            </div>
          )}

          {view === "month" ? (
            <div className="glass rounded-[2rem] overflow-hidden border-primary/10 shadow-2xl">
              <div className="grid grid-cols-7 bg-muted/30 border-b border-primary/10">
                {["Lun", "Mar", "Mer", "Gio", "Ven", "Sab", "Dom"].map(day => (
                  <div key={day} className="p-4 text-center text-xs font-bold uppercase tracking-widest text-muted-foreground">
                    {day}
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-7 auto-rows-[120px]">
                {monthDays.map((day, idx) => {
                  const dayKey = day.format("YYYY-MM-DD");
                  const dayEvents = groupedEvents[dayKey] || [];
                  const isCurrentMonth = day.isSame(currentMonth, "month");
                  const isToday = day.isSame(dayjs(), "day");

                  return (
                    <div 
                      key={dayKey} 
                      className={cn(
                        "border-r border-b border-primary/5 p-2 transition-colors overflow-y-auto custom-scrollbar",
                        !isCurrentMonth && "bg-muted/10 opacity-30",
                        isToday && "bg-primary/5"
                      )}
                    >
                      <div className="flex justify-between items-start mb-1">
                        <span className={cn(
                          "text-sm font-medium w-7 h-7 flex items-center justify-center rounded-full",
                          isToday && "bg-primary text-primary-foreground font-bold"
                        )}>
                          {day.format("D")}
                        </span>
                      </div>
                      <div className="space-y-1">
                        {dayEvents.slice(0, 4).map((event, eIdx) => (
                          <div 
                            key={eIdx}
                            className={cn(
                              "text-[10px] p-1 rounded-md truncate font-medium border",
                              event.type === "INTERVIEW" ? "bg-blue-500/10 text-blue-700 border-blue-500/20" :
                              event.type === "ABSENCE" ? "bg-amber-500/10 text-amber-700 border-amber-500/20" :
                              "bg-purple-500/10 text-purple-700 border-purple-500/20"
                            )}
                          >
                            {event.title}
                          </div>
                        ))}
                        {dayEvents.length > 4 && (
                          <div className="text-[9px] text-muted-foreground text-center font-bold">
                            + {dayEvents.length - 4} altri
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="space-y-10">
              {listDays.length === 0 ? (
                <div className="glass rounded-3xl p-20 text-center space-y-4">
                  <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mx-auto text-muted-foreground">
                    <CalendarIcon className="w-8 h-8" />
                  </div>
                  <h3 className="font-bold text-lg">Nessun evento in programma</h3>
                </div>
              ) : (
                listDays.map(dayKey => (
                  <div key={dayKey} className="relative pl-8 border-l border-primary/20 space-y-4">
                    <div className="absolute -left-1.5 top-0 w-3 h-3 rounded-full bg-primary ring-4 ring-background" />
                    <h2 className="text-xl font-bold capitalize">{dayjs(dayKey).format("dddd D MMMM")}</h2>
                    <div className="grid gap-3">
                      {groupedEvents[dayKey].map((event, idx) => (
                        <div key={`${event.id}-${idx}`} className="glass rounded-2xl p-5 hover:translate-x-1 transition-transform group">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                              <div className={cn(
                                "w-12 h-12 rounded-2xl flex items-center justify-center",
                                event.type === "INTERVIEW" ? "bg-blue-500/10 text-blue-600" : 
                                event.type === "ABSENCE" ? "bg-amber-500/10 text-amber-600" :
                                "bg-purple-500/10 text-purple-600"
                              )}>
                                {event.type === "INTERVIEW" ? <Video className="w-6 h-6" /> : <Calendar className="w-6 h-6" />}
                              </div>
                              <div>
                                <h4 className="font-bold text-base">{event.title}</h4>
                                <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                                  <Clock className="w-3.5 h-3.5" />
                                  {event.date.format("HH:mm")}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
