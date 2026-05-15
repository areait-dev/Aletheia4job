"use client";

import { useState, useEffect } from "react";
import { applyToJobAction } from "@/utils/actions";
import { useToast } from "@/components/ui/use-toast";
import { Loader2, Upload, CheckCircle2 } from "lucide-react";
import { createClient } from "@/utils/supabase/client";

interface JobApplicationFormProps {
  jobId: string;
  jobTitle: string;
}

export default function JobApplicationForm({ jobId, jobTitle }: JobApplicationFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    city: "",
    cvUrl: "",
    source: "Career Page",
  });

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const utmSource = params.get('utm_source');
    const sourceParam = params.get('source');
    if (utmSource || sourceParam) {
      setFormData(prev => ({ ...prev, source: utmSource || sourceParam || "Career Page" }));
    }
  }, []);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Basic size check (5MB)
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
      const supabase = createClient();
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(2)}-${Date.now()}.${fileExt}`;
      const filePath = `cvs/${fileName}`;

      const { data, error: uploadError } = await supabase.storage
        .from('candidates')
        .upload(filePath, file);

      if (uploadError) throw uploadError;
      if (!data?.path) throw new Error('Upload fallito: nessun percorso restituito');

      const { data: { publicUrl } } = supabase.storage
        .from('candidates')
        .getPublicUrl(data.path);

      if (!publicUrl) throw new Error('URL pubblico non disponibile');

      setFormData(prev => ({ ...prev, cvUrl: publicUrl }));
      toast({
        title: "CV caricato",
        description: "Il tuo curriculum è stato caricato correttamente.",
      });
    } catch (error) {
      console.error('Error uploading CV:', error);
      toast({
        title: "Errore caricamento",
        description: "Non è stato possibile caricare il CV. Riprova.",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      console.log('Invio candidatura con CV:', formData.cvUrl);
      const result = await applyToJobAction({
        jobId,
        ...formData
      });

      if (result.ok) {
        setIsSuccess(true);
        toast({
          title: "Candidatura inviata!",
          description: "Abbiamo ricevuto la tua candidatura. Ti ricontatteremo presto.",
        });
      } else {
        toast({
          title: "Errore",
          description: result.error || "Si è verificato un errore.",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Errore",
        description: "Si è verificato un errore imprevisto.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

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
        <button 
          onClick={() => window.location.href = '/careers'}
          className="px-6 py-2 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 transition-colors"
        >
          Torna alle posizioni
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="glass rounded-3xl p-6 sm:p-8 space-y-6">
      <div className="space-y-2">
        <h3 className="text-xl font-bold">Candidati per questa posizione</h3>
        <p className="text-sm text-muted-foreground">Completa i campi sottostanti per inviare il tuo profilo.</p>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">Nome</label>
          <input
            required
            className="w-full bg-background/50 border border-border rounded-xl px-4 py-2.5 text-sm outline-none focus:border-primary/50 transition-colors"
            placeholder="Mario"
            value={formData.firstName}
            onChange={e => setFormData(prev => ({ ...prev, firstName: e.target.value }))}
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">Cognome</label>
          <input
            required
            className="w-full bg-background/50 border border-border rounded-xl px-4 py-2.5 text-sm outline-none focus:border-primary/50 transition-colors"
            placeholder="Rossi"
            value={formData.lastName}
            onChange={e => setFormData(prev => ({ ...prev, lastName: e.target.value }))}
          />
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">Email</label>
        <input
          required
          type="email"
          className="w-full bg-background/50 border border-border rounded-xl px-4 py-2.5 text-sm outline-none focus:border-primary/50 transition-colors"
          placeholder="mario.rossi@esempio.it"
          value={formData.email}
          onChange={e => setFormData(prev => ({ ...prev, email: e.target.value }))}
        />
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
            required
            className="w-full bg-background/50 border border-border rounded-xl px-4 py-2.5 text-sm outline-none focus:border-primary/50 transition-colors"
            placeholder="Milano"
            value={formData.city}
            onChange={e => setFormData(prev => ({ ...prev, city: e.target.value }))}
          />
        </div>
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
        {isSubmitting ? "Invio in corso..." : "Invia Candidatura"}
      </button>
      
      {!formData.cvUrl && !uploading && (
        <p className="text-[10px] text-center text-muted-foreground">
          Carica il tuo CV per abilitare l&apos;invio della candidatura.
        </p>
      )}
    </form>
  );
}
