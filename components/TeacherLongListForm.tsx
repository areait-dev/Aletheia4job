'use client';

import { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { Loader2, Upload, CheckCircle2 } from 'lucide-react';
import { applyTeacherLongListAction } from '@/utils/actions/teachers';
import { useToast } from '@/components/ui/use-toast';
import { uploadCV } from '@/utils/supabase';
import {
  TEACHER_AREAS,
  TEACHER_DELIVERY_MODES,
  TEACHER_PROFILES,
  teacherLongListSchema,
  type TeacherLongListInput,
} from '@/utils/teacherLongList';

import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const ACCEPTED_EXT = ['pdf', 'doc', 'docx'];

const optionClass = (checked: boolean) =>
  cn(
    'flex items-start gap-2.5 rounded-xl border px-3.5 py-3 text-sm cursor-pointer transition-colors',
    checked ? 'border-primary/50 bg-primary/5' : 'border-border hover:border-primary/30',
  );

export default function TeacherLongListForm() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const { toast } = useToast();

  const form = useForm<TeacherLongListInput>({
    resolver: zodResolver(teacherLongListSchema),
    defaultValues: {
      fullName: '',
      email: '',
      phone: '',
      city: '',
      profile: undefined,
      areas: [],
      areasOther: '',
      deliveryModes: [],
      deliveryOtherLocation: '',
      experience: '',
      cvUrl: '',
      privacyAccepted: undefined as unknown as true,
      marketingAccepted: false,
    },
  });

  const areas = form.watch('areas') ?? [];
  const deliveryModes = form.watch('deliveryModes') ?? [];
  const cvUrl = form.watch('cvUrl');

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
    if (!ACCEPTED_EXT.includes(ext)) {
      toast({ title: 'Formato non supportato', description: 'Carica un file PDF o DOC/DOCX.', variant: 'destructive' });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: 'File troppo grande', description: 'Il CV non deve superare i 5 MB.', variant: 'destructive' });
      return;
    }

    setUploading(true);
    try {
      const { url, error } = await uploadCV(file, { bucket: 'candidates' });
      if (error || !url) {
        toast({
          title: 'Errore caricamento',
          description: error || 'Non è stato possibile caricare il CV. Riprova.',
          variant: 'destructive',
        });
        return;
      }
      form.setValue('cvUrl', url, { shouldValidate: true });
      setFileName(file.name);
    } catch (error) {
      toast({
        title: 'Errore caricamento',
        description: error instanceof Error ? error.message : 'Errore sconosciuto',
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
    }
  };

  const onSubmit = async (values: TeacherLongListInput) => {
    setSubmitError(null);
    setIsSubmitting(true);
    try {
      const result = await applyTeacherLongListAction(values);
      if (result.ok) {
        setIsSuccess(true);
        window.scrollTo({ top: document.getElementById('candidatura')?.offsetTop ?? 0, behavior: 'smooth' });
      } else {
        setSubmitError(result.error);
        toast({ title: 'Errore', description: result.error, variant: 'destructive' });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Errore imprevisto';
      setSubmitError(`Errore di rete o di sistema: ${message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="glass rounded-3xl p-8 sm:p-10 text-center space-y-4">
        <div className="w-16 h-16 bg-green-500/20 text-green-500 rounded-full flex items-center justify-center mx-auto">
          <CheckCircle2 className="w-10 h-10" />
        </div>
        <h3 className="text-xl font-bold">Candidatura inviata, grazie!</h3>
        <p className="text-muted-foreground text-sm max-w-md mx-auto">
          Il tuo profilo è entrato nella Long List dei formatori Alètheia. Ti contatteremo quando si aprirà
          un&apos;opportunità in linea con le tue competenze.
        </p>
      </div>
    );
  }

  const toggleIn = <T extends string>(list: T[], value: T) =>
    list.includes(value) ? list.filter((v) => v !== value) : [...list, value];

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        noValidate
        className="glass rounded-3xl p-6 sm:p-8 space-y-8"
      >
        <div className="space-y-2">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">Entra nella nostra long list</h2>
          <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
            Condividi il tuo percorso professionale e aiutaci a conoscerti. I dati che inserisci ci permettono di
            valutare le tue competenze in modo preciso e di contattarti per le opportunità più adatte a te.
          </p>
        </div>

        {submitError && (
          <div className="rounded-xl border border-red-500/30 bg-red-500/5 px-4 py-3 text-sm text-red-600">
            {submitError}
          </div>
        )}

        {/* Dati anagrafici */}
        <fieldset className="space-y-4">
          <FormField
            control={form.control}
            name="fullName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nome e cognome *</FormLabel>
                <FormControl>
                  <Input autoComplete="name" placeholder="Mario Rossi" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <div className="grid sm:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email *</FormLabel>
                  <FormControl>
                    <Input type="email" autoComplete="email" placeholder="mario.rossi@esempio.it" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Telefono *</FormLabel>
                  <FormControl>
                    <Input type="tel" autoComplete="tel" placeholder="+39 333 1234567" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          <FormField
            control={form.control}
            name="city"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Città *</FormLabel>
                <FormControl>
                  <Input autoComplete="address-level2" placeholder="Vittoria" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </fieldset>

        {/* Profilo professionale */}
        <FormField
          control={form.control}
          name="profile"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Profilo professionale *</FormLabel>
              <div className="grid sm:grid-cols-2 gap-2.5" role="radiogroup">
                {TEACHER_PROFILES.map((p) => (
                  <label key={p} className={optionClass(field.value === p)}>
                    <input
                      type="radio"
                      name="profile"
                      value={p}
                      checked={field.value === p}
                      onChange={() => field.onChange(p)}
                      className="mt-0.5 w-4 h-4 shrink-0 accent-primary"
                    />
                    <span className="font-medium">{p}</span>
                  </label>
                ))}
              </div>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Aree di competenza */}
        <FormField
          control={form.control}
          name="areas"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Aree di competenza *</FormLabel>
              <p className="text-xs text-muted-foreground">Seleziona una o più aree.</p>
              <div className="grid sm:grid-cols-2 gap-2.5">
                {TEACHER_AREAS.map((a) => {
                  const checked = areas.includes(a);
                  return (
                    <label key={a} className={optionClass(checked)}>
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => field.onChange(toggleIn(areas, a))}
                        className="mt-0.5 w-4 h-4 shrink-0 rounded accent-primary"
                      />
                      <span>{a === 'Altro' ? 'Altro (specificare)' : a}</span>
                    </label>
                  );
                })}
              </div>
              <FormMessage />
            </FormItem>
          )}
        />
        {areas.includes('Altro') && (
          <FormField
            control={form.control}
            name="areasOther"
            render={({ field }) => (
              <FormItem className="-mt-4">
                <FormControl>
                  <Input placeholder="Specifica l'area di competenza" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        {/* Modalità di erogazione */}
        <FormField
          control={form.control}
          name="deliveryModes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Modalità di erogazione disponibile *</FormLabel>
              <div className="grid sm:grid-cols-2 gap-2.5">
                {TEACHER_DELIVERY_MODES.map((m) => {
                  const checked = deliveryModes.includes(m);
                  return (
                    <label key={m} className={optionClass(checked)}>
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => field.onChange(toggleIn(deliveryModes, m))}
                        className="mt-0.5 w-4 h-4 shrink-0 rounded accent-primary"
                      />
                      <span>{m === 'In presenza — altra sede' ? 'In presenza — altra sede (specificare)' : m}</span>
                    </label>
                  );
                })}
              </div>
              <FormMessage />
            </FormItem>
          )}
        />
        {deliveryModes.includes('In presenza — altra sede') && (
          <FormField
            control={form.control}
            name="deliveryOtherLocation"
            render={({ field }) => (
              <FormItem className="-mt-4">
                <FormControl>
                  <Input placeholder="Specifica la sede (es. Catania, Siracusa…)" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        {/* Esperienza */}
        <FormField
          control={form.control}
          name="experience"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Esperienza, qualifiche e altre specializzazioni *</FormLabel>
              <p className="text-xs text-muted-foreground">
                Descrivi brevemente il tuo percorso professionale, le eventuali abilitazioni o certificazioni e le
                materie su cui hai maturato esperienza formativa.
              </p>
              <FormControl>
                <Textarea rows={6} maxLength={3000} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* CV */}
        <FormField
          control={form.control}
          name="cvUrl"
          render={() => (
            <FormItem>
              <FormLabel>Curriculum vitae * <span className="font-normal text-muted-foreground">(PDF o DOC, max 5 MB)</span></FormLabel>
              <FormControl>
                <div className="relative">
                  <input
                    type="file"
                    accept=".pdf,.doc,.docx"
                    onChange={handleFileUpload}
                    aria-label="Carica il curriculum vitae"
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                    disabled={uploading}
                  />
                  <div
                    className={cn(
                      'border-2 border-dashed rounded-2xl p-6 text-center transition-colors',
                      cvUrl ? 'border-green-500/30 bg-green-500/5' : 'border-border hover:border-primary/30',
                    )}
                  >
                    {uploading ? (
                      <div className="flex flex-col items-center gap-2">
                        <Loader2 className="w-6 h-6 animate-spin text-primary" />
                        <span className="text-sm text-muted-foreground">Caricamento in corso...</span>
                      </div>
                    ) : cvUrl ? (
                      <div className="flex flex-col items-center gap-1">
                        <CheckCircle2 className="w-6 h-6 text-green-500" />
                        <span className="text-sm font-medium text-green-600 break-all">{fileName ?? 'CV caricato'}</span>
                        <span className="text-xs text-muted-foreground">Clicca per cambiare file</span>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-2">
                        <Upload className="w-6 h-6 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">Trascina qui il file o clicca per sfogliare</span>
                      </div>
                    )}
                  </div>
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Consensi */}
        <div className="space-y-3">
          <FormField
            control={form.control}
            name="privacyAccepted"
            render={({ field }) => (
              <FormItem className="flex items-start gap-2.5 space-y-0">
                <FormControl>
                  <input
                    type="checkbox"
                    checked={field.value === true}
                    onChange={(e) => field.onChange(e.target.checked ? true : undefined)}
                    className="mt-0.5 w-4 h-4 shrink-0 rounded accent-primary"
                  />
                </FormControl>
                <div className="space-y-1">
                  <FormLabel className="font-normal text-xs text-muted-foreground leading-relaxed">
                    Autorizzo il trattamento dei dati personali ai sensi del D.Lgs. 196/2003 e del Regolamento UE
                    2016/679 (GDPR), come descritto nella{' '}
                    <a
                      href="/privacy-policy"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary font-medium hover:underline"
                      onClick={(e) => e.stopPropagation()}
                    >
                      Privacy Policy
                    </a>
                    . *
                  </FormLabel>
                  <FormMessage />
                </div>
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="marketingAccepted"
            render={({ field }) => (
              <FormItem className="flex items-start gap-2.5 space-y-0">
                <FormControl>
                  <input
                    type="checkbox"
                    checked={field.value === true}
                    onChange={(e) => field.onChange(e.target.checked)}
                    className="mt-0.5 w-4 h-4 shrink-0 rounded accent-primary"
                  />
                </FormControl>
                <FormLabel className="font-normal text-xs text-muted-foreground leading-relaxed">
                  Acconsento a ricevere comunicazioni da Alètheia S.r.l. relative a opportunità formative.
                </FormLabel>
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
          {isSubmitting ? 'Invio in corso...' : 'Invia candidatura'}
        </Button>
        <p className="text-[11px] text-center text-muted-foreground">I campi contrassegnati con * sono obbligatori.</p>
      </form>
    </Form>
  );
}
