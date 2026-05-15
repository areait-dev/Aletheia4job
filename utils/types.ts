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
  organizationId: string;
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
  source: string | null;
  matchingScore: number | null;
  matchedKeywords: string[] | null;
  missingKeywords: string[] | null;
  recommendation: string | null;
  applications?: ApplicationType[];
};

export type ApplicationType = {
  id: string;
  candidateId: string;
  jobId: string;
  status: string;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
  job?: JobType;
  candidate?: CandidateType;
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
  organizationId: string;
  title: string;
  company: string;
  location: string;
  locationFormatted?: string | null;
  city?: string | null;
  province?: string | null;
  country?: string | null;
  description: string;
  requirements: string;
  responsibilities?: string | null;
  benefits?: string | null;
  sector: string;
  industry?: string | null;
  salary: number | null;
  salaryMin?: number | null;
  salaryMax?: number | null;
  salaryCurrency?: string | null;
  salaryInterval?: string | null;
  salaryText?: string | null;
  experienceLevel?: string | null;
  educationLevel?: string | null;
  remoteType?: string | null;
  applicationUrl?: string | null;
  externalSource?: string | null;
  utmSource?: string | null;
  utmMedium?: string | null;
  utmCampaign?: string | null;
  category?: string | null;
  postedAt?: Date | null;
  status: JobStatus;
  mode: JobMode;
  isActive: boolean;
  postToLinkedIn: boolean;
  postToIndeed: boolean;
  postToJooble: boolean;
};

export const createAndEditJobSchema = z.object({
  // ... (existing fields)
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
  salaryMin: z.coerce.number().optional().nullable(),
  salaryMax: z.coerce.number().optional().nullable(),
  salaryCurrency: z.string().optional().nullable(),
  salaryInterval: z.string().optional().nullable(),
  salaryText: z.string().optional().nullable(),
  locationFormatted: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  province: z.string().optional().nullable(),
  country: z.string().optional().nullable(),
  postalCode: z.string().optional().nullable(),
  responsibilities: z.string().optional().nullable(),
  benefits: z.string().optional().nullable(),
  industry: z.string().optional().nullable(),
  experienceLevel: z.string().optional().nullable(),
  educationLevel: z.string().optional().nullable(),
  remoteType: z.string().optional().nullable(),
  applicationUrl: z.string().url().optional().nullable(),
  externalSource: z.string().optional().nullable(),
  utmSource: z.string().optional().nullable(),
  utmMedium: z.string().optional().nullable(),
  utmCampaign: z.string().optional().nullable(),
  category: z.string().optional().nullable(),
  status: z.nativeEnum(JobStatus),
  mode: z.nativeEnum(JobMode),
  sector: z.string().min(2, {
    message: 'Il settore deve essere di almeno 2 caratteri.',
  }),
  postToLinkedIn: z.boolean().default(false),
  postToIndeed: z.boolean().default(false),
  postToJooble: z.boolean().default(false),
});

export type CreateAndEditJobType = z.infer<typeof createAndEditJobSchema>;
