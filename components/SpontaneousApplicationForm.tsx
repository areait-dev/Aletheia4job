'use client';

import { useState } from 'react';
import { applySpontaneousApplicationAction } from '@/utils/actions';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, Upload, CheckCircle2 } from 'lucide-react';
import { uploadCV } from '@/utils/supabase';

export default function SpontaneousApplicationForm() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    city: '',
    sector: '',
    cvUrl: '',
  });

  const [errors, setErrors] = useState<{ firstName?: string; lastName?: string; email?: string; city?: string; sector?: string }>({});
  const [submitError, setSubmitError] = useState<string | null>(null);

  const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  const validateField = (field: 'firstName' | 'lastName' | 'email' | 'city' | 'sector', value: string) => {
    switch (field) {
      case 'firstName':
        return value.trim().length < 2 ? 'Inserisci il tuo nome (almeno 2 caratteri).' : undefined;
      case 'lastName':
        return value.trim().length < 2 ? 'Inserisci il tuo cognome (almeno 2 caratteri).' : undefined;
      case 'email':
        return !EMAIL_REGEX.test(value.trim()) ? 'Inserisci un indirizzo email valido.' : undefined;
      case 'city':
        return value.trim().length < 2 ? 'Inserisci la tua città.' : undefined;
      case 'sector':
        return value.trim().length < 2 ? 'Indica il settore di riferimento.' : undefined;
    }
  };

  const validateForm = () => {
    const nextErrors = {
      firstName: validateField('firstName', formData.firstName),
      lastName: validateField('lastName', formData.lastName),
      email: validateField('email', formData.email),
      city: validateField('city', formData.city),
      sector: validateField('sector', formData.sector),
    };
    setErrors(nextErrors);
    return !Object.values(nextErrors).some(Boolean);
  };

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

      setFormData(prev => ({ ...prev, cvUrl: url }));
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    if (!validateForm()) return;

    setIsSubmitting(true);
    try {
      const result = await applySpontaneousApplicationAction({
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        phone: formData.phone || undefined,
        city: formData.city,
        sector: formData.sector,
        cvUrl: formData.cvUrl || undefined,
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
        <a
          href="/"
          className="inline-flex items-center justify-center px-6 py-2 rounded-full bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 transition-colors"
        >
          Torna alle posizioni
        </a>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white/70 dark:bg-background/70 backdrop-blur-md border border-white/40 dark:border-white/10 rounded-3xl p-6 sm:p-8 space-y-6 shadow-sm">
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
        <div className="space-y-2">
          <label className="text-sm font-medium">Nome</label>
          <input
            className={`w-full bg-background/50 border rounded-xl px-4 py-2.5 text-sm outline-none transition-colors ${
              errors.firstName ? 'border-red-500/50 focus:border-red-500' : 'border-border focus:border-primary/50'
            }`}
            placeholder="Mario"
            value={formData.firstName}
            onChange={e => {
              setFormData(prev => ({ ...prev, firstName: e.target.value }));
              setErrors(prev => ({ ...prev, firstName: undefined }));
            }}
            onBlur={e => setErrors(prev => ({ ...prev, firstName: validateField('firstName', e.target.value) }))}
          />
          {errors.firstName && <p className="text-xs text-red-600">{errors.firstName}</p>}
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">Cognome</label>
          <input
            className={`w-full bg-background/50 border rounded-xl px-4 py-2.5 text-sm outline-none transition-colors ${
              errors.lastName ? 'border-red-500/50 focus:border-red-500' : 'border-border focus:border-primary/50'
            }`}
            placeholder="Rossi"
            value={formData.lastName}
            onChange={e => {
              setFormData(prev => ({ ...prev, lastName: e.target.value }));
              setErrors(prev => ({ ...prev, lastName: undefined }));
            }}
            onBlur={e => setErrors(prev => ({ ...prev, lastName: validateField('lastName', e.target.value) }))}
          />
          {errors.lastName && <p className="text-xs text-red-600">{errors.lastName}</p>}
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">Email</label>
        <input
          type="email"
          className={`w-full bg-background/50 border rounded-xl px-4 py-2.5 text-sm outline-none transition-colors ${
            errors.email ? 'border-red-500/50 focus:border-red-500' : 'border-border focus:border-primary/50'
          }`}
          placeholder="mario.rossi@esempio.it"
          value={formData.email}
          onChange={e => {
            setFormData(prev => ({ ...prev, email: e.target.value }));
            setErrors(prev => ({ ...prev, email: undefined }));
          }}
          onBlur={e => setErrors(prev => ({ ...prev, email: validateField('email', e.target.value) }))}
        />
        {errors.email && <p className="text-xs text-red-600">{errors.email}</p>}
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">Telefono (opzionale)</label>
          <input
            className="w-full bg-background/50 border border-border rounded-xl px-4 py-2.5 text-sm outline-none focus:border-primary/50 transition-colors"
            placeholder="+39 333 1234567"
            value={formData.phone}
            onChange={e => setFormData(prev => ({ ...prev, phone: e.target.value }))}
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">Città</label>
          <input
            className={`w-full bg-background/50 border rounded-xl px-4 py-2.5 text-sm outline-none transition-colors ${
              errors.city ? 'border-red-500/50 focus:border-red-500' : 'border-border focus:border-primary/50'
            }`}
            placeholder="Milano"
            value={formData.city}
            onChange={e => {
              setFormData(prev => ({ ...prev, city: e.target.value }));
              setErrors(prev => ({ ...prev, city: undefined }));
            }}
            onBlur={e => setErrors(prev => ({ ...prev, city: validateField('city', e.target.value) }))}
          />
          {errors.city && <p className="text-xs text-red-600">{errors.city}</p>}
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">Settore di interesse</label>
        <input
          className={`w-full bg-background/50 border rounded-xl px-4 py-2.5 text-sm outline-none transition-colors ${
            errors.sector ? 'border-red-500/50 focus:border-red-500' : 'border-border focus:border-primary/50'
          }`}
          placeholder="Es. Logistica, Marketing, IT…"
          value={formData.sector}
          onChange={e => {
            setFormData(prev => ({ ...prev, sector: e.target.value }));
            setErrors(prev => ({ ...prev, sector: undefined }));
          }}
          onBlur={e => setErrors(prev => ({ ...prev, sector: validateField('sector', e.target.value) }))}
        />
        {errors.sector && <p className="text-xs text-red-600">{errors.sector}</p>}
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">Carica CV (PDF, DOCX)</label>
        <div className="relative">
          <input
            type="file"
            accept=".pdf,.doc,.docx"
            onChange={handleFileUpload}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
            disabled={uploading}
          />
          <div className={`border-2 border-dashed rounded-2xl p-6 text-center transition-colors ${
            formData.cvUrl ? 'border-green-500/30 bg-green-500/5' : 'border-border hover:border-primary/30'
          }`}>
            {uploading ? (
              <div className="flex flex-col items-center gap-2">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
                <span className="text-sm text-muted-foreground">Caricamento in corso...</span>
              </div>
            ) : formData.cvUrl ? (
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
      </div>

      <button
        type="submit"
        disabled={isSubmitting || uploading || !formData.cvUrl}
        className="w-full py-4 rounded-2xl bg-primary text-primary-foreground font-bold hover:bg-primary/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-primary/20 flex items-center justify-center gap-2"
      >
        {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
        {isSubmitting ? 'Invio in corso...' : 'Invia Candidatura'}
      </button>

      {!formData.cvUrl && !uploading && (
        <p className="text-[10px] text-center text-muted-foreground">
          Carica il tuo CV per abilitare l&apos;invio della candidatura.
        </p>
      )}
    </form>
  );
}
