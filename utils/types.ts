import * as z from 'zod';

export type GetAllCandidatesActionTypes = {
  search?: string;
  candidateStatus?: string;
  province?: string;
  sector?: string;
  page?: number;
  limit?: number;
};

export type CandidateType = {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  userId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  city: string;
  province: string | null;
  role: string;
  seniority: string;
  education: string | null;
  sector: string;
  expectedSalary: number | null;
  skills: string | null;
  status: string;
  cvUrl: string | null;
  notes: string | null;
};

export enum CandidateStatus {
  InCerca = 'In cerca',
  Colloquiato = 'Colloquiato',
  Inserito = 'Inserito',
  NonIdoneo = 'Non idoneo',
}

export enum SeniorityLevel {
  Junior = 'Junior 0-2 anni',
  Mid = 'Mid 3-5 anni',
  Senior = 'Senior 5+ anni',
}

export enum EducationLevel {
  Media = 'Licenza Media',
  Diploma = 'Diploma di Maturità',
  LaureaTriennale = 'Laurea Triennale',
  LaureaMagistrale = 'Laurea Magistrale',
  MasterDottorato = 'Master / Dottorato',
}

export const createAndEditCandidateSchema = z.object({
  firstName: z.string().min(2, {
    message: 'Il nome deve essere di almeno 2 caratteri.',
  }),
  lastName: z.string().min(2, {
    message: 'Il cognome deve essere di almeno 2 caratteri.',
  }),
  email: z.string().email({
    message: 'Inserisci un indirizzo email valido.',
  }),
  phone: z.string().optional().nullable(),
  city: z.string().min(2, {
    message: 'La città deve essere di almeno 2 caratteri.',
  }),
  province: z.string().max(2, { message: 'La provincia deve essere di 2 lettere (es. MI).' }).optional().nullable(),
  role: z.string().min(2, {
    message: 'Il ruolo deve essere di almeno 2 caratteri.',
  }),
  seniority: z.nativeEnum(SeniorityLevel),
  education: z.nativeEnum(EducationLevel).optional().nullable(),
  sector: z.string().min(2, {
    message: 'Il settore deve essere di almeno 2 caratteri.',
  }),
  expectedSalary: z.coerce.number().optional().nullable(),
  skills: z.string().optional().nullable(),
  status: z.nativeEnum(CandidateStatus),
  cvUrl: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

export type CreateAndEditCandidateType = z.infer<typeof createAndEditCandidateSchema>;

export enum JobStatus {
  Aperto = 'Aperto',
  Chiuso = 'Chiuso',
  InCorso = 'In corso',
  Pending = 'Pending',
}

export enum JobMode {
  FullTime = 'Full-time',
  PartTime = 'Part-time',
  Freelance = 'Freelance',
}

export type JobType = {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  userId: string;
  title: string;
  company: string;
  location: string;
  description: string;
  requirements: string;
  salary: number | null;
  status: JobStatus;
  mode: JobMode;
  sector: string;
};

export const createAndEditJobSchema = z.object({
  title: z.string().min(2, {
    message: 'Il titolo deve essere di almeno 2 caratteri.',
  }),
  company: z.string().min(2, {
    message: 'Il nome dell\'azienda deve essere di almeno 2 caratteri.',
  }),
  location: z.string().min(2, {
    message: 'La località deve essere di almeno 2 caratteri.',
  }),
  description: z.string().min(10, {
    message: 'La descrizione deve essere di almeno 10 caratteri.',
  }),
  requirements: z.string().min(10, {
    message: 'I requisiti devono essere di almeno 10 caratteri.',
  }),
  salary: z.coerce.number().optional().nullable(),
  status: z.nativeEnum(JobStatus),
  mode: z.nativeEnum(JobMode),
  sector: z.string().min(2, {
    message: 'Il settore deve essere di almeno 2 caratteri.',
  }),
});

export type CreateAndEditJobType = z.infer<typeof createAndEditJobSchema>;
