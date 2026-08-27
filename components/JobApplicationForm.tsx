"use client";

import { useEffect, useMemo, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { applyToJobAction } from "@/utils/actions";
import { useToast } from "@/components/ui/use-toast";
import { Loader2, Upload, CheckCircle2, MapPinned } from "lucide-react";
import { uploadCV } from "@/utils/supabase";
import { buildJobApplicationSchema, JobApplicationType } from "@/utils/types";

import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface JobApplicationFormProps {
  jobId: string;
  jobTitle: string;
  locationInputType?: string | null;
  locationOptions?: string[];
}

export default function JobApplicationForm({ jobId, jobTitle, locationInputType, locationOptions }: JobApplicationFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const { toast } = useToast();

  const requiresAppliedLocation = locationInputType === "select" || locationInputType === "free_text";
  const schema = useMemo(() => buildJobApplicationSchema(requiresAppliedLocation), [requiresAppliedLocation]);

  const form = useForm<JobApplicationType>({
    resolver: zodResolver(schema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      city: "",
      cvUrl: "",
      source: "Career Page",
      appliedLocation: "",
      liability: undefined as unknown as true,
      confidentiality: undefined as unknown as true,
      privacy: undefined as unknown as true,
    },
  });

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const utmSource = params.get("utm_source");
    const sourceParam = params.get("source");
    if (utmSource || sourceParam) {
      form.setValue("source", utmSource || sourceParam || "Career Page");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "File troppo grande",
        description: "Il CV non deve superare i 5MB.",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);
    try {
      const { url, error } = await uploadCV(file, { bucket: "cvs", jobId });

      if (error || !url) {
        console.error("[JobApplicationForm] Supabase Upload Error:", error);
        toast({
          title: "Errore caricamento",
          description: error || "Non è stato possibile caricare il CV. Riprova.",
          variant: "destructive",
        });
        return;
      }

      form.setValue("cvUrl", url, { shouldValidate: true });
      toast({
        title: "CV caricato",
        description: "Il tuo curriculum è stato caricato correttamente.",
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Errore sconosciuto";
      console.error("[JobApplicationForm] Error uploading CV:", { message, error });
      toast({
        title: "Errore caricamento",
        description: message || "Non è stato possibile caricare il CV. Riprova.",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const onSubmit = async (values: JobApplicationType) => {
    setSubmitError(null);
    setIsSubmitting(true);

    try {
      const result = await applyToJobAction({
        jobId,
        firstName: values.firstName,
        lastName: values.lastName,
        email: values.email,
        phone: values.phone || undefined,
        city: values.city,
        cvUrl: values.cvUrl,
        source: values.source,
        appliedLocation: values.appliedLocation || undefined,
      });

      if (result.ok) {
        setIsSuccess(true);
        toast({
          title: "Candidatura inviata!",
          description: "Abbiamo ricevuto la tua candidatura. Ti ricontatteremo presto.",
        });
      } else {
        const message = result.error || "Si è verificato un errore durante l'invio.";
        setSubmitError(message);
        toast({
          title: "Errore",
          description: message,
          variant: "destructive",
        });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Errore imprevisto";
      setSubmitError(`Errore di rete o di sistema: ${message}`);
      toast({
        title: "Errore",
        description: `Errore di rete o di sistema: ${message}`,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const cvUrl = form.watch("cvUrl");

  if (isSuccess) {
    return (
      <div className="glass rounded-3xl p-8 text-center space-y-4 animate-in fade-in zoom-in duration-500">
        <div className="w-16 h-16 bg-green-500/20 text-green-500 rounded-full flex items-center justify-center mx-auto">
          <CheckCircle2 className="w-10 h-10" />
        </div>
        <h3 className="text-xl font-bold">Candidatura inviata!</h3>
        <p className="text-muted-foreground">
          Grazie per l&apos;interesse. Il nostro team valuterà il tuo profilo e ti contatterà al più presto per la posizione di <strong>{jobTitle}</strong>.
        </p>
        <Button onClick={() => (window.location.href = "/")}>
          Torna alle posizioni
        </Button>
      </div>
    );
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} noValidate className="glass rounded-3xl p-6 sm:p-8 space-y-6">
        <div className="space-y-2">
          <h3 className="text-xl font-bold">Candidati per: <span className="text-primary">{jobTitle}</span></h3>
          <p className="text-sm text-muted-foreground">Completa i campi sottostanti per inviare il tuo profilo.</p>
        </div>

        {submitError && (
          <div className="rounded-xl border border-red-500/30 bg-red-500/5 px-4 py-3 text-sm text-red-600">
            {submitError}
          </div>
        )}

        <div className="grid sm:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="firstName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nome</FormLabel>
                <FormControl>
                  <Input placeholder="Mario" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="lastName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Cognome</FormLabel>
                <FormControl>
                  <Input placeholder="Rossi" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input type="email" placeholder="mario.rossi@esempio.it" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid sm:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="phone"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Telefono (opzionale)</FormLabel>
                <FormControl>
                  <Input placeholder="+39 333 1234567" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="city"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Città</FormLabel>
                <FormControl>
                  <Input placeholder="Milano" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {locationInputType === "select" && locationOptions && locationOptions.length > 0 && (
          <div className="p-4 rounded-2xl border-2 border-primary/30 bg-primary/5">
            <FormField
              control={form.control}
              name="appliedLocation"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-primary font-bold flex items-center gap-1.5">
                    <MapPinned className="w-4 h-4" /> Per quale sede ti candidi?
                  </FormLabel>
                  <Select onValueChange={field.onChange} value={field.value || undefined}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleziona una sede…" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {locationOptions.map(opt => (
                        <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        )}

        {locationInputType === "free_text" && (
          <div className="p-4 rounded-2xl border-2 border-primary/30 bg-primary/5">
            <FormField
              control={form.control}
              name="appliedLocation"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-primary font-bold flex items-center gap-1.5">
                    <MapPinned className="w-4 h-4" /> Per quale sede ti candidi?
                  </FormLabel>
                  <FormControl>
                    <Input placeholder="Indica per quale sede tra quelle elencate nell'annuncio ti candidi" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        )}

        <FormField
          control={form.control}
          name="cvUrl"
          render={() => (
            <FormItem>
              <FormLabel>Carica CV (PDF, DOCX)</FormLabel>
              <FormControl>
                <div className="relative">
                  <input
                    type="file"
                    accept=".pdf,.doc,.docx"
                    onChange={handleFileUpload}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                    disabled={uploading}
                  />
                  <div className={`border-2 border-dashed rounded-2xl p-6 text-center transition-colors ${
                    cvUrl ? "border-green-500/30 bg-green-500/5" : "border-border hover:border-primary/30"
                  }`}>
                    {uploading ? (
                      <div className="flex flex-col items-center gap-2">
                        <Loader2 className="w-6 h-6 animate-spin text-primary" />
                        <span className="text-sm text-muted-foreground">Caricamento in corso...</span>
                      </div>
                    ) : cvUrl ? (
                      <div className="flex flex-col items-center gap-1">
                        <CheckCircle2 className="w-6 h-6 text-green-500" />
                        <span className="text-sm font-medium text-green-600">CV caricato correttamente</span>
                        <span className="text-xs text-muted-foreground">Clicca per cambiare file</span>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-2">
                        <Upload className="w-6 h-6 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">Trascina qui il file o clicca per sfogliare</span>
                        <span className="text-xs text-muted-foreground/60">Massimo 5MB</span>
                      </div>
                    )}
                  </div>
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Consensi legali obbligatori */}
        <div className="flex flex-col gap-4">
          <FormField
            control={form.control}
            name="liability"
            render={({ field }) => (
              <FormItem className="flex items-start gap-3 space-y-0">
                <FormControl>
                  <input
                    type="checkbox"
                    checked={field.value === true}
                    onChange={e => field.onChange(e.target.checked)}
                    className="mt-0.5 w-5 h-5 accent-primary shrink-0 cursor-pointer"
                  />
                </FormControl>
                <div className="space-y-1">
                  <FormLabel className="font-normal leading-relaxed text-sm text-muted-foreground">
                    <span className="text-red-500">*</span> Di essere consapevole che l&apos;Agenzia non si assume alcuna responsabilità circa la selezione, l&apos;andamento del rapporto di lavoro instauratosi tra impresa e candidato e di qualsiasi rapporto contrattuale ne scaturisca.
                  </FormLabel>
                  <FormMessage />
                </div>
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="confidentiality"
            render={({ field }) => (
              <FormItem className="flex items-start gap-3 space-y-0">
                <FormControl>
                  <input
                    type="checkbox"
                    checked={field.value === true}
                    onChange={e => field.onChange(e.target.checked)}
                    className="mt-0.5 w-5 h-5 accent-primary shrink-0 cursor-pointer"
                  />
                </FormControl>
                <div className="space-y-1">
                  <FormLabel className="font-normal leading-relaxed text-sm text-muted-foreground">
                    <span className="text-red-500">*</span> Di osservare rigorosamente le indicazioni fornite a proposito di fatti, informazioni, documenti o altro di cui avrà comunicazione o prenderà conoscenza nello svolgimento delle funzionalità dell&apos;Agenzia e che tali informazioni non potranno in nessun modo essere cedute a terzi o utilizzate direttamente nel rispetto della vigente normativa in materia.
                  </FormLabel>
                  <FormMessage />
                </div>
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="privacy"
            render={({ field }) => (
              <FormItem className="flex items-start gap-3 space-y-0">
                <FormControl>
                  <input
                    type="checkbox"
                    checked={field.value === true}
                    onChange={e => field.onChange(e.target.checked)}
                    className="mt-0.5 w-5 h-5 accent-primary shrink-0 cursor-pointer"
                  />
                </FormControl>
                <div className="space-y-1">
                  <FormLabel className="font-normal leading-relaxed text-sm text-muted-foreground">
                    <span className="text-red-500">*</span> Autorizzazione trattamento dei dati personali ai sensi del D.L.gs. 196/2003 e del regolamento G.D.P.R. N 679/2016. Informativa sulla privacy Alètheia srl
                  </FormLabel>
                  <FormMessage />
                </div>
              </FormItem>
            )}
          />
        </div>

        <Button
          type="submit"
          disabled={isSubmitting || uploading}
          className="w-full py-4 rounded-2xl h-auto text-base flex items-center justify-center gap-2"
        >
          {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
          {isSubmitting ? "Invio in corso..." : "Invia Candidatura"}
        </Button>

        {!cvUrl && !uploading && (
          <p className="text-[10px] text-center text-muted-foreground">
            Carica il tuo CV per abilitare l&apos;invio della candidatura.
          </p>
        )}

        {/* Dicitura parità di genere */}
        <p className="text-xs text-muted-foreground leading-relaxed text-justify pt-4 border-t border-border/50">
          Ogni candidato e candidata sarà valutato/a esclusivamente in base alle competenze, alle esperienze e alle
          capacità professionali, senza alcuna forma di discriminazione basata su età, genere, nazionalità,
          orientamento sessuale, situazione familiare, appartenenza etnica, nazionale o razziale, attività sindacale
          o associativa, convinzioni religiose, aspetto fisico, condizioni di salute o disabilità. Tali
          caratteristiche non influiranno in alcun modo sui processi di selezione, valutazione e sviluppo
          professionale all&rsquo;interno dell&rsquo;azienda, assicurando pari opportunità a tutti i/le candidati/e
        </p>
      </form>
    </Form>
  );
}
