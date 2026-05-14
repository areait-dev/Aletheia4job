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
 * Genera il corpo dell'annuncio LinkedIn (LINKEDIN AD BODY)
 */
const generateLinkedInAdBody = (job: JobType): string => {
  const title = `## ${job.title.toUpperCase()}`;
  const intro = job.description;
  
  const responsibilities = job.responsibilities 
    ? `**Main responsibilities:**\n${formatToList(job.responsibilities)}` 
    : '';
    
  const requirements = `**Required Requirements:**\n${formatToList(job.requirements)}`;
  
  const benefits = job.benefits 
    ? `**What we offer (Benefit & Welfare):**\n${job.benefits}` 
    : '';

  return [title, intro, responsibilities, requirements, benefits]
    .filter(Boolean)
    .join('\n\n');
};

/**
 * Mappa i metadati nativi di LinkedIn (CLASSIFICATION METADATA)
 */
const generateLinkedInMetadata = (job: JobType) => {
  // Mapping Remote Type
  let workplace = 'On-site';
  if (job.remoteType?.toLowerCase().includes('hybrid')) workplace = 'Hybrid';
  if (job.remoteType?.toLowerCase().includes('remote')) workplace = 'Remote';

  // Mapping Job Mode
  let employmentType = 'Full-time';
  if (job.mode?.toLowerCase().includes('part-time')) employmentType = 'Part-time';

  return {
    Workplace: workplace,
    'Employment Type': employmentType,
    Seniority: job.experienceLevel || 'Not Specified',
  };
};

/**
 * Estrae i tag delle competenze dai requisiti (RECOMMENDED SKILL TAGS)
 */
const extractSkills = (job: JobType): string[] => {
  if (!job.requirements) return [];
  
  // Lista di skill comuni da cercare (esempio semplificato)
  const commonSkills = [
    'React', 'Next.js', 'TypeScript', 'JavaScript', 'Node.js', 'Python', 'Java', 'SQL', 
    'PostgreSQL', 'Prisma', 'Docker', 'AWS', 'Git', 'Agile', 'Scrum', 'Project Management',
    'Figma', 'UI/UX', 'Cloud', 'Kubernetes', 'REST API', 'GraphQL'
  ];

  const requirementsLower = job.requirements.toLowerCase();
  
  const foundSkills = commonSkills.filter(skill => 
    requirementsLower.includes(skill.toLowerCase())
  );

  return foundSkills.slice(0, 10); // Massimo 10 tags
};

/**
 * Converte un testo in una lista puntata se non lo è già
 */
const formatToList = (text: string): string => {
  if (!text) return '';
  return text
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0)
    .map(line => line.startsWith('-') || line.startsWith('*') ? line : `- ${line}`)
    .join('\n');
};
