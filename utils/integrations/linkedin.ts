import { JobType } from '../types';

/**
 * Formatta i dati di un lavoro per la pubblicazione su LinkedIn seguendo le specifiche richieste.
 */

export const formatLinkedInAd = (job: JobType) => {
  return {
    body: generateLinkedInAdBody(job),
    metadata: generateLinkedInMetadata(job),
    skills: extractSkills(job),
  };
};

/**
 * Genera il corpo dell'annuncio LinkedIn ottimizzato per il Recruiting Marketing
 */
const generateLinkedInAdBody = (job: JobType): string => {
  const title = `## ${job.title.toUpperCase()}`;
  
  // Anteprima professionale e diretta (evita linguaggi spammy)
  const catchyPreview = `${job.company} è alla ricerca di un ${job.title} a ${job.city || job.location} per potenziare la propria strategia nel settore ${job.sector || 'di riferimento'}.`;
  
  const intro = `${catchyPreview}\n\n${job.description}`;
  
  const responsibilities = job.responsibilities 
    ? `**Cosa farai (Responsabilità chiave):**\n${formatToList(job.responsibilities, 7)}` 
    : '';
    
  const requirements = `**Cosa cerchiamo (Requisiti richiesti):**\n${formatToList(job.requirements, 6)}`;
  
  const benefits = job.benefits 
    ? `**Cosa offriamo (Welfare & Benefit):**\n${formatToList(job.benefits, 4)}` 
    : '';

  return [title, intro, responsibilities, requirements, benefits]
    .filter(Boolean)
    .join('\n\n');
};

/**
 * Mappa i metadati nativi di LinkedIn
 */
const generateLinkedInMetadata = (job: JobType) => {
  let workplace = 'On-site';
  if (job.remoteType?.toLowerCase().includes('hybrid')) workplace = 'Hybrid';
  if (job.remoteType?.toLowerCase().includes('remote')) workplace = 'Remote';

  let employmentType = 'Full-time';
  if (job.mode?.toLowerCase().includes('part-time')) employmentType = 'Part-time';

  return {
    Workplace: workplace,
    'Employment Type': employmentType,
    Seniority: job.experienceLevel || 'Not Specified',
  };
};

/**
 * Estrae i tag delle competenze dai requisiti
 */
const extractSkills = (job: JobType): string[] => {
  if (!job.requirements) return [];
  
  const commonSkills = [
    'React', 'Next.js', 'TypeScript', 'JavaScript', 'Node.js', 'Python', 'Java', 'SQL', 
    'PostgreSQL', 'Prisma', 'Docker', 'AWS', 'Git', 'Agile', 'Scrum', 'Project Management',
    'Figma', 'UI/UX', 'Cloud', 'Kubernetes', 'REST API', 'GraphQL'
  ];

  const requirementsLower = job.requirements.toLowerCase();
  const foundSkills = commonSkills.filter(skill => 
    requirementsLower.includes(skill.toLowerCase())
  );

  return foundSkills.slice(0, 10);
};

/**
 * Converte un testo in una lista puntata con limite di elementi
 */
const formatToList = (text: string, limit: number = 10): string => {
  if (!text) return '';
  return text
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0)
    .slice(0, limit) // Applica il limite di punti elenco richiesto
    .map(line => line.startsWith('-') || line.startsWith('*') ? line : `- ${line}`)
    .join('\n');
};
