'use client';

import { useState } from "react";
import { useRouter } from "next/navigation";
import dayjs from "dayjs";
import "dayjs/locale/it";
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
  Calendar
} from "lucide-react";
import { cn } from "@/lib/utils";
import { createCronofyEventAction } from "@/utils/actions";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

dayjs.locale("it");

type CalendarClientProps = {
  interviews: any[];
  absences: any[];
  cronofyEvents?: any[];
};

export default function CalendarClient({ interviews, absences, cronofyEvents = [] }: CalendarClientProps) {
  const router = useRouter();
  const { toast } = useToast();
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

  // Uniamo gli eventi e ordiniamoli per data
  const events = [
    ...interviews.map(i => ({
      id: i.id,
      type: "INTERVIEW",
      title: `Colloquio: ${i.candidate.firstName} ${i.candidate.lastName}`,
      date: dayjs(i.scheduledAt),
      category: i.type,
      recruiter: i.recruiterName,
      location: i.location,
    })),
    ...absences.filter(a => a.status === "APPROVED").map(a => ({
      id: a.id,
      type: "ABSENCE",
      title: `Assenza: ${a.employee.firstName} ${a.employee.lastName}`,
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

  // Raggruppiamo per giorno
  const groupedEvents: Record<string, any[]> = {};
  events.forEach(event => {
    const dayKey = event.date.format("YYYY-MM-DD");
    if (!groupedEvents[dayKey]) groupedEvents[dayKey] = [];
    groupedEvents[dayKey].push(event);
  });

  const days = Object.keys(groupedEvents).sort();

  return (
    <div className="grid lg:grid-cols-4 gap-8">
      {/* Sidebar - Filtri e Mini Stats */}
      <div className="lg:col-span-1 space-y-6">
        <Button 
          onClick={() => setIsAddingEvent(true)}
          className="w-full h-14 rounded-2xl shadow-lg shadow-primary/20 flex items-center gap-2 text-lg font-bold"
        >
          <Plus className="w-5 h-5" />
          Nuovo Impegno
        </Button>

        <div className="glass rounded-3xl p-6">
          <h3 className="font-bold text-sm uppercase tracking-widest text-muted-foreground mb-4">Prossimi 30 Giorni</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Colloqui</span>
              <span className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-600 flex items-center justify-center font-bold text-xs">{interviews.length}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Assenze Team</span>
              <span className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-600 flex items-center justify-center font-bold text-xs">{absences.length}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Calendario Cronofy</span>
              <span className="w-8 h-8 rounded-lg bg-purple-500/10 text-purple-600 flex items-center justify-center font-bold text-xs">{cronofyEvents?.filter(e => !e.deleted).length || 0}</span>
            </div>
          </div>
        </div>

        <div className="glass rounded-3xl p-6 border-primary/20">
          <p className="text-xs text-muted-foreground leading-relaxed italic">
            "Il calendario è sincronizzato in tempo reale con Cronofy per garantire che non ci siano sovrapposizioni tra i tuoi impegni."
          </p>
        </div>
      </div>

      {/* Main Feed */}
      <div className="lg:col-span-3 space-y-10">
        {isAddingEvent && (
          <div className="glass rounded-3xl p-8 border-primary/30 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold">Aggiungi Evento a Cronofy</h3>
              <Button variant="ghost" size="sm" onClick={() => setIsAddingEvent(false)}>Annulla</Button>
            </div>
            
            <form onSubmit={handleCreateEvent} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="summary">Titolo Evento</Label>
                <Input 
                  id="summary" 
                  value={summary} 
                  onChange={(e) => setSummary(e.target.value)} 
                  placeholder="Es: Riunione Strategica" 
                  required 
                  className="bg-background/50"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="start">Inizio</Label>
                  <Input 
                    id="start" 
                    type="datetime-local" 
                    value={startDate} 
                    onChange={(e) => setStartDate(e.target.value)} 
                    required 
                    className="bg-background/50"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="end">Fine</Label>
                  <Input 
                    id="end" 
                    type="datetime-local" 
                    value={endDate} 
                    onChange={(e) => setEndDate(e.target.value)} 
                    required 
                    className="bg-background/50"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="description">Descrizione (Opzionale)</Label>
                <Textarea 
                  id="description" 
                  value={description} 
                  onChange={(e) => setDescription(e.target.value)} 
                  placeholder="Dettagli dell'evento..."
                  className="bg-background/50"
                />
              </div>
              
              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? "Creazione in corso..." : "Salva su Calendario"}
              </Button>
            </form>
          </div>
        )}

        {days.length === 0 ? (
          <div className="glass rounded-3xl p-20 text-center space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mx-auto text-muted-foreground">
              <CalendarIcon className="w-8 h-8" />
            </div>
            <h3 className="font-bold text-lg">Nessun evento in programma</h3>
            <p className="text-muted-foreground max-w-xs mx-auto">Tutto calmo! Non ci sono colloqui o assenze registrate per il prossimo periodo.</p>
          </div>
        ) : (
          days.map(dayKey => (
            <div key={dayKey} className="relative pl-8 border-l border-primary/20 space-y-4">
              {/* Day Marker */}
              <div className="absolute -left-1.5 top-0 w-3 h-3 rounded-full bg-primary ring-4 ring-background" />
              
              <div className="flex items-center gap-3">
                <h2 className="text-xl font-bold capitalize">{dayjs(dayKey).format("dddd D MMMM")}</h2>
                {dayjs(dayKey).isSame(dayjs(), 'day') && (
                  <span className="px-2 py-0.5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold uppercase tracking-wider">Oggi</span>
                )}
              </div>

              <div className="grid gap-3">
                {groupedEvents[dayKey].map((event, idx) => (
                  <div key={`${event.id}-${idx}`} className="glass rounded-2xl p-5 hover:translate-x-1 transition-transform duration-200 group">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className={cn(
                          "w-12 h-12 rounded-2xl flex items-center justify-center",
                          event.type === "INTERVIEW" ? "bg-blue-500/10 text-blue-600" : 
                          event.type === "ABSENCE" ? "bg-amber-500/10 text-amber-600" :
                          "bg-purple-500/10 text-purple-600"
                        )}>
                          {event.type === "INTERVIEW" ? (
                            event.category === "VIDEO" ? <Video className="w-6 h-6" /> : <Phone className="w-6 h-6" />
                          ) : event.type === "ABSENCE" ? (
                            <Plane className="w-6 h-6" />
                          ) : (
                            <Calendar className="w-6 h-6" />
                          )}
                        </div>
                        
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-bold text-base">{event.title}</h4>
                            <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 bg-background border rounded-md opacity-70">
                              {event.category}
                            </span>
                          </div>
                          
                          <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <Clock className="w-3.5 h-3.5" />
                              {event.type === "INTERVIEW" || event.type === "CRONOFY" ? event.date.format("HH:mm") : "Tutto il giorno"}
                            </div>
                            {event.location && (
                              <div className="flex items-center gap-1">
                                <MapPin className="w-3.5 h-3.5" />
                                <span className="truncate max-w-[150px]">{event.location}</span>
                              </div>
                            )}
                            {event.recruiter && (
                              <div className="flex items-center gap-1">
                                <User className="w-3.5 h-3.5" />
                                {event.recruiter}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      <button className="p-2 rounded-xl bg-background border opacity-0 group-hover:opacity-100 transition-opacity">
                        <ChevronRight className="w-5 h-5 text-muted-foreground" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
