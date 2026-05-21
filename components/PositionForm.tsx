/**
 * CreateJobForm Component
 *
 * This component provides a form for creating new job applications.
 * It uses React Hook Form for form management and Zod for validation.
 *
 * Key Features:
 * - Form validation with Zod schema
 * - Optimistic UI updates with React Query
 * - Toast notifications for user feedback
 * - Automatic navigation after successful creation
 * - Query cache invalidation to refresh data
 * - AI-powered job description generation via Groq
 */
'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { useState } from 'react'; // 🔥 NUOVO

import {
  JobStatus,
  JobMode,
  createAndEditJobSchema,
  CreateAndEditJobType,
} from '@/utils/types';

import { Form } from '@/components/ui/form';
import { Button } from './ui/button';
import { CustomFormField, CustomFormSelect, CustomFormTextarea } from './FormComponents';

import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
// 🔥 MODIFICA: aggiunta generateJobDescriptionAction
import { createJobAction, getSingleJobAction, updateJobAction, generateJobDescriptionAction } from '@/utils/actions';
import { useToast } from '@/components/ui/use-toast';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Sparkles, Loader2 } from 'lucide-react'; // 🔥 NUOVO: icone per UI

function PositionForm({ jobId }: { jobId?: string }) {
  const experienceLevels = ['Entry Level', 'Mid Level', 'Senior Level', 'Director / Executive'];
  const remoteOptions = ['Onsite', 'Remote', 'Hybrid'];
  const salaryCurrencyOptions = ['EUR', 'USD', 'GBP'];
  const salaryIntervalOptions = ['Yearly', 'Monthly', 'Hourly'];
  const sectorOptions = ['Information Technology', 'Commerciale', 'Finance', 'Healthcare', 'Marketing', 'Sales', 'Engineering', 'Human Resources', 'Legal', 'Education', 'Manufacturing', 'Retail', 'Other'];

  // 🔥 NUOVO: stato per il caricamento AI
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);

  const { data: jobData, isPending: isLoadingJob } = useQuery({
    queryKey: ['job', jobId],
    queryFn: () => getSingleJobAction(jobId!),
    enabled: !!jobId,
  });

  const form = useForm<CreateAndEditJobType>({
    resolver: zodResolver(createAndEditJobSchema),
    defaultValues: {
      title: '',
      company: '',
      location: '',
      locationFormatted: '',
      city: '',
      province: '',
      country: 'IT',
      postalCode: '',
      description: '',
      requirements: '',
      responsibilities: '',
      benefits: '',
      industry: '',
      category: '',
      salary: undefined,
      salaryMin: undefined,
      salaryMax: undefined,
      salaryText: '',
      salaryCurrency: 'EUR',
      salaryInterval: 'Yearly',
      experienceLevel: 'Mid Level',
      remoteType: 'Onsite',
      applicationUrl: undefined,
      status: JobStatus.Aperto,
      mode: JobMode.FullTime,
      sector: 'Information Technology',
      postToCareerPage: true,
    },
  });

  useEffect(() => {
    if (jobData) {
      form.reset({
        title: jobData.title,
        company: jobData.company,
        location: jobData.location,
        locationFormatted: jobData.locationFormatted || '',
        city: jobData.city || '',
        province: jobData.province || '',
        country: jobData.country || 'IT',
        postalCode: jobData.postalCode || '',
        description: jobData.description,
        requirements: jobData.requirements,
        responsibilities: jobData.responsibilities || '',
        benefits: jobData.benefits || '',
        industry: jobData.industry || '',
        category: jobData.category || '',
        salary: jobData.salary || undefined,
        salaryMin: jobData.salaryMin || undefined,
        salaryMax: jobData.salaryMax || undefined,
        salaryText: jobData.salaryText || '',
        salaryCurrency: jobData.salaryCurrency || 'EUR',
        salaryInterval: jobData.salaryInterval || 'Yearly',
        experienceLevel: (jobData.experienceLevel as any) || 'Mid Level',
        remoteType: (jobData.remoteType as any) || 'Onsite',
        applicationUrl: jobData.applicationUrl || undefined,
        status: jobData.status as JobStatus,
        mode: jobData.mode as JobMode,
        sector: jobData.sector,
        postToCareerPage: jobData.postToCareerPage ?? true,
        postToLinkedIn: jobData.postToLinkedIn || false,
        postToIndeed: jobData.postToIndeed || false,
        postToJooble: jobData.postToJooble || false,
      });
    }
  }, [jobData, form]);

  const queryClient = useQueryClient();
  const { toast } = useToast();
  const router = useRouter();

  // 🔥 NUOVO: Funzione per generare con AI (Groq)
  const handleGenerateAI = async () => {
  const title = form.watch('title');
  const company = form.watch('company');
  const location = form.watch('location');
  const experienceLevel = form.watch('experienceLevel');
  const remoteType = form.watch('remoteType');

  if (!title || !company || !location) {
    toast({ description: 'Compila prima Titolo, Azienda e Location.', variant: 'destructive' });
    return;
  }

  setIsGeneratingAI(true);
  try {
    const result = await generateJobDescriptionAction({
      title,
      company,
      location,
      experienceLevel: experienceLevel || 'Mid Level',
      remoteType: remoteType || 'Onsite',
    });

    // 📝 Popolamento completo del form
    form.setValue('description', result.description);
    form.setValue('requirements', result.requirements);
    form.setValue('responsibilities', result.responsibilities);
    form.setValue('benefits', result.benefits);
    
    //  Salary (gestione sicura se l'AI restituisce stringhe invece di numeri)
    const minSal = typeof result.salaryMin === 'number' ? result.salaryMin : parseInt(String(result.salaryMin).replace(/\D/g, '')) || undefined;
    const maxSal = typeof result.salaryMax === 'number' ? result.salaryMax : parseInt(String(result.salaryMax).replace(/\D/g, '')) || undefined;
    
    form.setValue('salaryMin', minSal);
    form.setValue('salaryMax', maxSal);
    form.setValue('salaryText', result.salaryText);
    
    // 🏷️ Classificazione automatica
    form.setValue('category', result.category);
    form.setValue('industry', result.industry);
    if (result.sector) form.setValue('sector', result.sector);
    
    // 📍 Location parsing automatico
    form.setValue('city', result.city);
    form.setValue('province', result.province);
    form.setValue('postalCode', result.postalCode);
    form.setValue('country', result.country || 'IT');
    form.setValue('locationFormatted', result.locationFormatted);

    toast({ description: 'Form compilato automaticamente con successo! ✨' });
  } catch (error) {
    console.error(error);
    toast({ description: 'Errore durante la generazione AI.', variant: 'destructive' });
  } finally {
    setIsGeneratingAI(false);
  }
};
  const { mutate, isPending } = useMutation({
    mutationFn: (values: CreateAndEditJobType) => 
      jobId ? updateJobAction(jobId, values) : createJobAction(values),
    onSuccess: (data) => {
      if (!data) {
        toast({ description: 'Si è verificato un errore.' });
        return;
      }
      toast({ description: jobId ? 'Posizione aggiornata' : 'Posizione creata' });
      
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
      queryClient.invalidateQueries({ queryKey: ['job', jobId] });
      queryClient.invalidateQueries({ queryKey: ['stats'] });
      queryClient.invalidateQueries({ queryKey: ['charts'] });

      router.push('/positions');
    },
  });

  function onSubmit(values: CreateAndEditJobType) {
    mutate(values);
  }

  if (jobId && isLoadingJob) {
    return <div className="h-40 flex items-center justify-center animate-pulse text-muted-foreground font-medium">Caricamento dati...</div>;
  }

  return (
    <Form {...form}>
      <form
        className='bg-muted p-8 rounded'
        onSubmit={form.handleSubmit(onSubmit)}
      >
        {/* 🔥 MODIFICA: Header con bottone AI */}
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6">
          <h2 className='capitalize font-semibold text-4xl'>{jobId ? 'modifica posizione' : 'nuova posizione'}</h2>
          
          <Button
            type="button"
            variant="outline"
            onClick={handleGenerateAI}
            disabled={isGeneratingAI}
            className="border-primary text-primary hover:bg-primary/10 w-full sm:w-auto"
          >
            {isGeneratingAI ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Generazione...
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-4 w-4" /> Genera con AI
              </>
            )}
          </Button>
        </div>

        <div className='grid gap-4 md:grid-cols-2 lg:grid-cols-3 items-start'>
          {/* title */}
          <CustomFormField name='title' control={form.control} labelText='titolo annuncio' />
          <CustomFormField name='company' control={form.control} labelText='azienda' />
          <CustomFormField name='location' control={form.control} labelText='località' />
          <CustomFormTextarea name='description' control={form.control} labelText='descrizione' />
          <CustomFormTextarea name='requirements' control={form.control} labelText='requisiti' />
          <CustomFormSelect
            name='sector'
            control={form.control}
            labelText='settore'
            items={sectorOptions}
          />
          <CustomFormField name='salaryMin' control={form.control} labelText='stipendio min' type='number' />
          <CustomFormField name='salaryMax' control={form.control} labelText='stipendio max' type='number' />
          <CustomFormSelect
            name='salaryCurrency'
            control={form.control}
            labelText='valuta'
            items={salaryCurrencyOptions}
          />
          <CustomFormSelect
            name='experienceLevel'
            control={form.control}
            labelText='esperienza'
            items={experienceLevels}
          />
          <CustomFormSelect
            name='remoteType'
            control={form.control}
            labelText='modalità remoto'
            items={remoteOptions}
          />
          <CustomFormSelect
            name='salaryInterval'
            control={form.control}
            labelText='intervallo stipendio'
            items={salaryIntervalOptions}
          />
          <CustomFormField name='category' control={form.control} labelText='categoria' />
          <CustomFormField name='industry' control={form.control} labelText='industria' />
          <CustomFormField name='locationFormatted' control={form.control} labelText='località formattata' />
          <CustomFormField name='city' control={form.control} labelText='città' />
          <CustomFormField name='province' control={form.control} labelText='provincia' />
          <CustomFormField name='country' control={form.control} labelText='paese' />
          <CustomFormField name='postalCode' control={form.control} labelText='CAP' />
          <CustomFormTextarea name='responsibilities' control={form.control} labelText='responsabilità' />
          <CustomFormTextarea name='benefits' control={form.control} labelText='benefit' />
          <CustomFormField name='salaryText' control={form.control} labelText='testo stipendio' />
          <CustomFormSelect
            name='status'
            control={form.control}
            labelText='stato'
            items={Object.values(JobStatus)}
          />
          <CustomFormSelect
            name='mode'
            control={form.control}
            labelText='tipologia'
            items={Object.values(JobMode)}
          />
          <CustomFormField name='applicationUrl' control={form.control} labelText='URL candidatura' type='url' />

          <div className='col-span-full border-t border-border pt-6 mt-2'>
            <h3 className='text-sm font-bold uppercase tracking-wider text-primary mb-4'>Canali di pubblicazione</h3>
            <div className='flex flex-wrap gap-6'>
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="postToCareerPage"
                  className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary"
                  {...form.register("postToCareerPage")}
                />
                <label htmlFor="postToCareerPage" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                  Career Page
                </label>
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="postToLinkedIn"
                  className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary"
                  {...form.register("postToLinkedIn")}
                />
                <label htmlFor="postToLinkedIn" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                  LinkedIn Jobs
                </label>
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="postToIndeed"
                  className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary"
                  {...form.register("postToIndeed")}
                />
                <label htmlFor="postToIndeed" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                  Indeed
                </label>
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="postToJooble"
                  className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary"
                  {...form.register("postToJooble")}
                />
                <label htmlFor="postToJooble" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                  Jooble
                </label>
              </div>
            </div>
            <p className='text-[10px] text-muted-foreground mt-3'>
              Le posizioni selezionate verranno incluse nel feed XML per gli aggregatori.
            </p>
          </div>

          <Button
            type='submit'
            className='self-end capitalize'
            disabled={isPending}
          >
            {isPending ? 'caricamento...' : jobId ? 'aggiorna posizione' : 'pubblica posizione'}
          </Button>
        </div>
      </form>
    </Form>
  );
}
export default PositionForm;