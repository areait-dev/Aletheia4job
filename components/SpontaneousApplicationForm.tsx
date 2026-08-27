'use client';

import { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { applySpontaneousApplicationAction } from '@/utils/actions';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, Upload, CheckCircle2 } from 'lucide-react';
import { uploadCV } from '@/utils/supabase';
import { spontaneousApplicationSchema, SpontaneousApplicationType } from '@/utils/types';

import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

export default function SpontaneousApplicationForm() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const { toast } = useToast();

  const form = useForm<SpontaneousApplicationType>({
    resolver: zodResolver(spontaneousApplicationSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      city: '',
      sector: '',
      cvUrl: '',
      privacyAccepted: undefined as unknown as true,
    },
  });

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: 'File troppo grande',
        description: 'Il CV non deve superare i 5MB.',
        variant: 'destructive',
      });
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
      toast({
        title: 'CV caricato',
        description: 'Il tuo curriculum è stato caricato correttamente.',
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Errore sconosciuto';
      toast({
        title: 'Errore caricamento',
        description: message,
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
    }
  };

  const onSubmit = async (values: SpontaneousApplicationType) => {
    setSubmitError(null);
    setIsSubmitting(true);
    try {
      const result = await applySpontaneousApplicationAction({
        firstName: values.firstName,
        lastName: values.lastName,
        email: values.email,
        phone: values.phone || undefined,
        city: values.city,
        sector: values.sector,
        cvUrl: values.cvUrl || undefined,
      });

      if (result.ok) {
        setIsSuccess(true);
        toast({
          title: 'Candidatura inviata!',
          description: 'Il tuo profilo è stato inserito nel nostro database.',
        });
      } else {
        const message = result.error || "Si è verificato un errore durante l'invio.";
        setSubmitError(message);
        toast({ title: 'Errore', description: message, variant: 'destructive' });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Errore imprevisto';
      setSubmitError(`Errore di rete o di sistema: ${message}`);
      toast({ title: 'Errore', description: message, variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const cvUrl = form.watch('cvUrl');

  if (isSuccess) {
    return (
      <div className="bg-white/70 dark:bg-background/70 backdrop-blur-md border border-white/40 dark:border-white/10 rounded-3xl p-8 text-center space-y-4 shadow-sm">
        <div className="w-16 h-16 bg-green-500/20 text-green-500 rounded-full flex items-center justify-center mx-auto">
          <CheckCircle2 className="w-10 h-10" />
        </div>
        <h3 className="text-xl font-bold">Candidatura inviata!</h3>
        <p className="text-muted-foreground text-sm">
          Grazie per l&apos;interesse. Verrai inserito nel nostro Database: ti contatteremo qualora una posizione aperta fosse in linea con la tua figura professionale.
        </p>
        <Button asChild>
          <a href="/">Torna alle posizioni</a>
        </Button>
      </div>
    );
  }

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        noValidate
        className="bg-white/70 dark:bg-background/70 backdrop-blur-md border border-white/40 dark:border-white/10 rounded-3xl p-6 sm:p-8 space-y-6 shadow-sm"
      >
        <div className="space-y-2">
          <h1 className="text-2xl font-bold">Candidatura spontanea</h1>
          <p className="text-sm text-muted-foreground">
            Non trovi la posizione che fa per te? Compila il form: verrai inserito nel nostro Database e ti contatteremo qualora una posizione aperta fosse in linea con la tua figura professionale.
          </p>
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

        <FormField
          control={form.control}
          name="sector"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Settore di interesse</FormLabel>
              <FormControl>
                <Input placeholder="Es. Logistica, Marketing, IT…" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

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
                    cvUrl ? 'border-green-500/30 bg-green-500/5' : 'border-border hover:border-primary/30'
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

        <FormField
          control={form.control}
          name="privacyAccepted"
          render={({ field }) => (
            <FormItem className="flex items-start gap-2.5 space-y-0">
              <FormControl>
                <input
                  type="checkbox"
                  checked={field.value === true}
                  onChange={e => field.onChange(e.target.checked)}
                  className="mt-0.5 w-4 h-4 shrink-0 rounded border accent-primary outline-none transition-colors"
                />
              </FormControl>
              <div className="space-y-1">
                <FormLabel className="font-normal text-xs text-muted-foreground leading-relaxed">
                  Accetto il trattamento dei dati personali ai sensi della{' '}
                  <a
                    href="/privacy-policy"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary font-medium hover:underline"
                    onClick={e => e.stopPropagation()}
                  >
                    Privacy Policy
                  </a>
                  .
                </FormLabel>
                <FormMessage />
              </div>
            </FormItem>
          )}
        />

        <Button
          type="submit"
          disabled={isSubmitting || uploading}
          className="w-full py-4 rounded-2xl h-auto text-base flex items-center justify-center gap-2"
        >
          {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
          {isSubmitting ? 'Invio in corso...' : 'Invia Candidatura'}
        </Button>

        {!cvUrl && !uploading && (
          <p className="text-[10px] text-center text-muted-foreground">
            Carica il tuo CV per abilitare l&apos;invio della candidatura.
          </p>
        )}
      </form>
    </Form>
  );
}
