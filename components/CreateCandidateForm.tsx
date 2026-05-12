'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { useState, useEffect } from 'react';

import { 
  CandidateStatus, 
  SeniorityLevel, 
  EducationLevel,
  createAndEditCandidateSchema, 
  CreateAndEditCandidateType 
} from '@/utils/types';
import { UserPlus } from 'lucide-react';

import { Form, FormControl, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { CustomFormField, CustomFormSelect, CustomFormTextarea } from './FormComponents';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createCandidateAction, checkEmailExistsAction } from '@/utils/actions';
import { useToast } from '@/components/ui/use-toast';
import { useRouter } from 'next/navigation';
import { uploadCV } from '@/utils/supabase';
import { Sparkles, Loader2 } from 'lucide-react';

function CreateCandidateForm() {
  const [isUploading, setIsUploading] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const [emailExists, setEmailExists] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const router = useRouter();

  const form = useForm<CreateAndEditCandidateType>({
    resolver: zodResolver(createAndEditCandidateSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      city: '',
      province: '',
      role: '',
      seniority: SeniorityLevel.Junior,
      education: EducationLevel.Diploma,
      sector: '',
      expectedSalary: 0,
      skills: '',
      status: CandidateStatus.InCerca,
      notes: '',
      cvUrl: '',
    },
  });

  const emailValue = form.watch('email');

  useEffect(() => {
    const checkEmail = async () => {
      if (emailValue && emailValue.includes('@')) {
        const exists = await checkEmailExistsAction(emailValue);
        setEmailExists(exists);
      } else {
        setEmailExists(false);
      }
    };

    const debounceTimer = setTimeout(() => {
      checkEmail();
    }, 500);

    return () => clearTimeout(debounceTimer);
  }, [emailValue]);

  const { mutate, isPending } = useMutation({
    mutationFn: (values: CreateAndEditCandidateType) => createCandidateAction(values),
    onSuccess: (data) => {
      if (!data) {
        toast({ description: 'Si è verificato un errore durante il salvataggio.' });
        return;
      }
      toast({ description: 'Candidato salvato con successo.' });
      queryClient.invalidateQueries({ queryKey: ['candidates'] });
      queryClient.invalidateQueries({ queryKey: ['sectors'] });
      queryClient.invalidateQueries({ queryKey: ['stats'] });
      router.push('/jobs'); // Redirect to candidate list
    },
  });

  async function onSubmit(values: CreateAndEditCandidateType) {
    mutate(values);
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
      toast({ description: 'Per favore carica un file PDF.' });
      return;
    }

    setIsUploading(true);
    const { url, error } = await uploadCV(file);
    setIsUploading(false);

    if (url) {
      form.setValue('cvUrl', url);
      toast({ description: 'Curriculum caricato correttamente.' });
      
      // Avvia estrazione AI
      handleAIExtraction(file);
    } else {
      toast({ description: `Errore caricamento: ${error}`, variant: 'destructive' });
    }
  };

  const handleAIExtraction = async (file: File) => {
    setIsExtracting(true);
    toast({ description: 'Analisi AI in corso... estrazione dati dal CV.' });

    try {
      // Estrazione testo lato client per evitare problemi di bundling sul server
      const arrayBuffer = await file.arrayBuffer();
      
      // Caricamento dinamico di pdfjs-dist
      const pdfjs = await import('pdfjs-dist');
      pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;
      
      const loadingTask = pdfjs.getDocument({ data: arrayBuffer });
      const pdf = await loadingTask.promise;
      
      let fullText = '';
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items
          .map((item: any) => item.str)
          .join(' ');
        fullText += pageText + ' ';
      }

      if (fullText.trim().length < 50) {
        throw new Error('Il PDF sembra vuoto o non leggibile.');
      }

      const response = await fetch('/api/extract-cv', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: fullText }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Errore durante l\'estrazione AI');
      }

      const data = await response.json();
      console.log('Dati ricevuti dall\'AI:', data);
      
      // Funzione di pulizia per email e telefono
      const cleanEmail = (email: string) => {
        return email ? email.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim() : '';
      };
      
      const cleanPhone = (phone: string) => {
        return phone ? phone.replace(/\(|\)/g, '').trim() : '';
      };

      // Popola i campi del form con i dati estratti
      if (data.firstName) form.setValue('firstName', data.firstName);
      if (data.lastName) form.setValue('lastName', data.lastName);
      if (data.email) form.setValue('email', cleanEmail(data.email));
      if (data.phone) form.setValue('phone', cleanPhone(data.phone));
      if (data.city) form.setValue('city', data.city);
      if (data.province) form.setValue('province', data.province);
      
      // Mappatura robusta per Seniority e Education
      if (data.seniority) {
        const value = Object.values(SeniorityLevel).find(v => 
          v.toLowerCase().includes(data.seniority.toLowerCase()) || 
          data.seniority.toLowerCase().includes(v.toLowerCase())
        );
        console.log('Mappatura Seniority:', data.seniority, '->', value);
        if (value) form.setValue('seniority', value);
      }
      
      if (data.education) {
        const value = Object.values(EducationLevel).find(v => 
          v.toLowerCase().includes(data.education.toLowerCase()) || 
          data.education.toLowerCase().includes(v.toLowerCase())
        );
        console.log('Mappatura Education:', data.education, '->', value);
        if (value) form.setValue('education', value);
      }

      if (data.expectedSalary) form.setValue('expectedSalary', data.expectedSalary);
      if (data.skills) form.setValue('skills', data.skills);
      if (data.notes) form.setValue('notes', data.notes);

      toast({ description: 'Dati estratti con successo dall\'AI!' });
    } catch (error: any) {
      console.error('AI Extraction Error:', error);
      toast({ 
        description: `L'AI non è riuscita ad estrarre i dati: ${error.message}. Puoi comunque inserirli manualmente.`, 
        variant: 'destructive' 
      });
    } finally {
      setIsExtracting(false);
    }
  };

  return (
    <Form {...form}>
      <form
        className='glass p-8 rounded-3xl shadow-2xl space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700'
        onSubmit={form.handleSubmit(onSubmit)}
      >
        <div className='flex items-center justify-between border-b pb-6'>
          <div>
            <h2 className='text-3xl font-bold tracking-tight text-primary'>Job Aletheia</h2>
            <p className='text-muted-foreground mt-1'>Creazione nuovo profilo candidato</p>
          </div>
          <div className='bg-primary/10 p-3 rounded-2xl'>
            <UserPlus className='w-8 h-8 text-primary' />
          </div>
        </div>
        
        <div className='grid gap-8 md:grid-cols-2 items-start'>
          {/* Dati Anagrafici */}
          <div className='space-y-4'>
            <h3 className='text-lg font-medium text-primary border-b pb-1'>Dati Anagrafici</h3>
            <div className='grid gap-4 sm:grid-cols-2'>
              <CustomFormField name='firstName' control={form.control} labelText='Nome' />
              <CustomFormField name='lastName' control={form.control} labelText='Cognome' />
            </div>
            <div className='relative'>
              <CustomFormField name='email' control={form.control} labelText='Email' type='email' />
              {emailExists && (
                <p className='text-xs text-destructive absolute -bottom-4 left-0'>
                  Attenzione: questa email è già presente nel database.
                </p>
              )}
            </div>
            <div className='grid gap-4 sm:grid-cols-2'>
              <CustomFormField name='phone' control={form.control} labelText='Telefono' />
              <div className='grid grid-cols-[1fr,100px] gap-2'>
                <CustomFormField name='city' control={form.control} labelText='Città' />
                <CustomFormField name='province' control={form.control} labelText='Provincia' />
              </div>
            </div>
          </div>

          {/* Profilo Professionale */}
          <div className='space-y-4'>
            <h3 className='text-lg font-medium text-primary border-b pb-1'>Profilo Professionale</h3>
            <CustomFormField name='role' control={form.control} labelText='Mansione/Ruolo' />
            <div className='grid gap-4 sm:grid-cols-2'>
              <CustomFormSelect
                name='seniority'
                control={form.control}
                labelText='Livello Seniority'
                items={Object.values(SeniorityLevel)}
              />
              <CustomFormSelect
                name='education'
                control={form.control}
                labelText='Titolo di Studio'
                items={Object.values(EducationLevel)}
              />
            </div>
            <div className='grid gap-4 sm:grid-cols-2'>
              <CustomFormField name='sector' control={form.control} labelText='Settore' />
              <CustomFormField name='expectedSalary' control={form.control} labelText='Aspettativa Economica (RAL)' type='number' />
            </div>
          </div>

          {/* Competenze e Stato */}
          <div className='space-y-4'>
            <h3 className='text-lg font-medium text-primary border-b pb-1'>Competenze e Stato</h3>
            <CustomFormField name='skills' control={form.control} labelText='Competenze Chiave (Hard Skills)' />
            <CustomFormSelect
              name='status'
              control={form.control}
              labelText='Stato Candidato'
              items={Object.values(CandidateStatus)}
            />
          </div>

          {/* Documentazione e Note */}
          <div className='space-y-4'>
            <h3 className='text-lg font-medium text-primary border-b pb-1'>Documentazione e Note</h3>
            
            <FormItem>
              <FormLabel>Carica Curriculum (PDF)</FormLabel>
              <FormControl>
                <div className='relative'>
                  <Input 
                    type='file' 
                    accept='application/pdf' 
                    onChange={handleFileUpload}
                    disabled={isUploading || isExtracting}
                    className='rounded-xl border-none bg-background/50 pr-10'
                  />
                  {(isUploading || isExtracting) && (
                    <div className='absolute right-3 top-1/2 -translate-y-1/2'>
                      <Loader2 className='w-4 h-4 animate-spin text-primary' />
                    </div>
                  )}
                </div>
              </FormControl>
              {isExtracting && (
                <p className='text-xs text-primary animate-pulse mt-1 flex items-center gap-1 font-medium'>
                  <Sparkles className='w-3 h-3' /> L&apos;intelligenza artificiale sta leggendo il CV...
                </p>
              )}
              {form.watch('cvUrl') && !isExtracting && (
                <p className='text-xs text-green-600 mt-1 font-medium'>File pronto per il salvataggio</p>
              )}
              <FormMessage />
            </FormItem>

            <CustomFormTextarea name='notes' control={form.control} labelText='Note Recruiter/Valutazione' />
          </div>

          <div className='md:col-span-2 flex justify-end mt-4'>
            <Button
              type='submit'
              className='px-8 py-6 text-lg rounded-2xl font-bold shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all'
              disabled={isPending || isUploading || emailExists}
            >
              {isPending ? 'Salvataggio...' : 'Salva Candidato'}
            </Button>
          </div>
        </div>
      </form>
    </Form>
  );
}

export default CreateCandidateForm;
