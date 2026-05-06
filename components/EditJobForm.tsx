'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { useState, useEffect } from 'react';

import {
  CandidateStatus,
  SeniorityLevel,
  EducationLevel,
  createAndEditCandidateSchema,
  CreateAndEditCandidateType,
} from '@/utils/types';

import { Button } from '@/components/ui/button';
import { Form, FormControl, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from './ui/input';
import { CustomFormField, CustomFormSelect, CustomFormTextarea } from './FormComponents';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import {
  getSingleCandidateAction,
  updateCandidateAction,
} from '@/utils/actions';
import { useToast } from '@/components/ui/use-toast';
import { useRouter } from 'next/navigation';
import { uploadCV } from '@/utils/supabase';
import { Pencil } from 'lucide-react';

function EditCandidateForm({ candidateId }: { candidateId: string }) {
  const [isUploading, setIsUploading] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const router = useRouter();

  const { data, isPending: isLoadingData } = useQuery({
    queryKey: ['candidate', candidateId],
    queryFn: () => getSingleCandidateAction(candidateId),
  });

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

  useEffect(() => {
    if (data) {
      form.reset({
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        phone: data.phone || '',
        city: data.city,
        province: data.province || '',
        role: data.role,
        seniority: data.seniority as SeniorityLevel,
        education: (data.education as EducationLevel) || EducationLevel.Diploma,
        sector: data.sector,
        expectedSalary: data.expectedSalary || 0,
        skills: data.skills || '',
        status: data.status as CandidateStatus,
        notes: data.notes || '',
        cvUrl: data.cvUrl || '',
      });
    }
  }, [data, form]);

  const { mutate, isPending } = useMutation({
    mutationFn: (values: CreateAndEditCandidateType) =>
      updateCandidateAction(candidateId, values),
    onSuccess: (data) => {
      if (!data) {
        toast({ description: 'Si è verificato un errore.' });
        return;
      }
      toast({ description: 'Candidato aggiornato.' });
      queryClient.invalidateQueries({ queryKey: ['candidates'] });
      queryClient.invalidateQueries({ queryKey: ['candidate', candidateId] });
      queryClient.invalidateQueries({ queryKey: ['sectors'] });
      queryClient.invalidateQueries({ queryKey: ['stats'] });
      router.push('/jobs'); 
    },
  });

  function onSubmit(values: CreateAndEditCandidateType) {
    mutate(values);
  }

  function onInvalid(errors: any) {
    console.error("Validation errors:", errors);
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
      toast({ description: 'Curriculum aggiornato.' });
    } else {
      toast({ description: `Errore caricamento: ${error}`, variant: 'destructive' });
    }
  };

  if (isLoadingData) return <h2 className='text-xl'>Caricamento dati...</h2>;

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit, onInvalid)}
        className='glass p-8 rounded-3xl shadow-2xl space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700'
      >
        <div className='flex items-center justify-between border-b pb-6'>
          <div>
            <h2 className='text-3xl font-bold tracking-tight text-primary'>Modifica Candidato</h2>
            <p className='text-muted-foreground mt-1'>Aggiornamento profilo di {data?.firstName} {data?.lastName}</p>
          </div>
          <div className='bg-primary/10 p-3 rounded-2xl'>
            <Pencil className='w-8 h-8 text-primary' />
          </div>
        </div>
        
        <div className='grid gap-8 md:grid-cols-2 items-start'>
          <div className='space-y-4'>
            <h3 className='text-lg font-medium text-primary border-b pb-1'>Dati Anagrafici</h3>
            <div className='grid gap-4 sm:grid-cols-2'>
              <CustomFormField name='firstName' control={form.control} labelText='Nome' />
              <CustomFormField name='lastName' control={form.control} labelText='Cognome' />
            </div>
            <CustomFormField name='email' control={form.control} labelText='Email' type='email' />
            <div className='grid gap-4 sm:grid-cols-2'>
              <CustomFormField name='phone' control={form.control} labelText='Telefono' />
              <div className='grid grid-cols-[1fr,100px] gap-2'>
                <CustomFormField name='city' control={form.control} labelText='Città' />
                <CustomFormField name='province' control={form.control} labelText='Provincia' />
              </div>
            </div>
          </div>

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
              <CustomFormField name='expectedSalary' control={form.control} labelText='RAL' type='number' />
            </div>
          </div>

          <div className='space-y-4'>
            <h3 className='text-lg font-medium text-primary border-b pb-1'>Competenze e Stato</h3>
            <CustomFormField name='skills' control={form.control} labelText='Competenze' />
            <CustomFormSelect
              name='status'
              control={form.control}
              labelText='Stato Candidato'
              items={Object.values(CandidateStatus)}
            />
          </div>

          <div className='space-y-4'>
            <h3 className='text-lg font-medium text-primary border-b pb-1'>Documentazione e Note</h3>
            
            <FormItem>
              <FormLabel>Curriculum PDF (carica uno nuovo per sostituire)</FormLabel>
              <FormControl>
                <Input 
                  type='file' 
                  accept='application/pdf' 
                  onChange={handleFileUpload}
                  disabled={isUploading}
                  className='rounded-xl border-none bg-background/50'
                />
              </FormControl>
              {form.watch('cvUrl') && (
                <p className='text-xs text-green-600 mt-1 font-medium'>Curriculum presente nel sistema</p>
              )}
              <FormMessage />
            </FormItem>

            <CustomFormTextarea name='notes' control={form.control} labelText='Note' />
          </div>

          <div className='md:col-span-2 flex justify-end gap-4 mt-4'>
            <Button
              type='button'
              variant='outline'
              onClick={() => router.back()}
              className='rounded-xl'
            >
              Annulla
            </Button>
            <Button
              type='submit'
              className='px-8 rounded-xl font-bold shadow-lg shadow-primary/20 transition-all'
              disabled={isPending || isUploading}
            >
              {isPending ? 'Salvataggio...' : 'Salva Modifiche'}
            </Button>
          </div>
        </div>
      </form>
    </Form>
  );
}

export default EditCandidateForm;
