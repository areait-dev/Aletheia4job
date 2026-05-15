// utils/linkedin-feed-generator.ts
import { JobType, JobMode, SeniorityLevel } from './types'; // adatta il path se necessario

// --- SEZIONE A: Definizioni aggiuntive ---

export interface LinkedInOrgConfig {
  organizationId: string;
  linkedinCompanyId: string;
  jobPosterEmail: string;
  companyName: string;
}

export interface LinkedInJobDTO {
  jobId: string;
  applyUrl: string;
  title: string;
  descriptionHtml: string;
  companyName: string;
  linkedinCompanyId: string;
  jobPosterEmail: string;
  city?: string;
  state?: string;
  countryCode: string;
  locationFallback?: string;
  employmentType: string;
  jobLevel?: string;
  jobFunctions: string[];
  industries: string[];
  salary?: {
    min: number;
    max: number;
    currency: string;
    period: string;
  };
}

export function escapeXml(value: string | undefined | null): string {
  if (!value) return '';
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export function sanitizeHtmlForLinkedIn(html: string): string {
  // rimuove attributi HTML
  let sanitized = html.replace(/<([a-z][a-z0-9]*)[^>]*>/gi, '<$1>');
  const allowedTags = ['p', 'ul', 'li', 'h1', 'h2', 'h3', 'h4', 'h5', 'strong', 'em', 'br'];
  const tagRegex = /<\/?([a-zA-Z0-9]+)>/g;
  sanitized = sanitized.replace(tagRegex, (match, tagName) =>
    allowedTags.includes(tagName.toLowerCase()) ? match : ''
  );
  return sanitized;
}

// --- SEZIONE B: Mapping config ---

// Sostituire/estendere in base al dominio reale.
export const employmentTypeMap: Record<JobMode, string> = {
  [JobMode.FullTime]: 'FULL_TIME',
  [JobMode.PartTime]: 'PART_TIME',
  [JobMode.Freelance]: 'CONTRACT',
};

// Sostituire/estendere in base al dominio reale.
export const jobLevelMap: Record<string, string> = {
  [SeniorityLevel.Junior]: 'Entry level',
  [SeniorityLevel.Mid]: 'Associate',
  [SeniorityLevel.Senior]: 'Mid-Senior level',
};

// Mappa da `category` o `sector` ATS a `job-functions` LinkedIn.
// Sostituire/estendere in base al dominio reale.
export const jobFunctionMap: Record<string, string[]> = {
  'IT & Sviluppo': ['Information Technology', 'Engineering'],
  'Vendite & Commerciale': ['Sales', 'Business Development'],
  'Marketing': ['Marketing', 'Public Relations'],
  'Amministrazione & HR': ['Human Resources', 'Administrative'],
  'Finanza': ['Finance', 'Accounting/Auditing'],
};

// Mappa da `industry` ATS a `industries` LinkedIn.
// Sostituire/estendere in base al dominio reale.
export const industryMap: Record<string, string[]> = {
  'Software': ['4', '106'], // 4: Computer Software, 106: Internet
  'Fintech': ['4', '94'],
  'Retail': ['27'],
  'Automotive': ['12'],
};

// --- SEZIONE C: Logica di mapping e validazione ---

function buildDescriptionHtml(job: JobType): string {
  let html = '';
  const toParagraphs = (text: string | null | undefined) =>
    text ? `<p>${text.replace(/\n/g, '<br />')}</p>` : '';

  if (job.description) html += `<h3>Descrizione</h3>${toParagraphs(job.description)}`;
  if (job.responsibilities) html += `<h3>Responsabilità</h3>${toParagraphs(job.responsibilities)}`;
  if (job.requirements) html += `<h3>Requisiti</h3>${toParagraphs(job.requirements)}`;
  if (job.benefits) html += `<h3>Cosa Offriamo</h3>${toParagraphs(job.benefits)}`;

  return sanitizeHtmlForLinkedIn(html);
}

export function mapJobToLinkedInDto(
  job: JobType,
  orgConfig: LinkedInOrgConfig
): LinkedInJobDTO {
  // validazione a monte deve garantire country, qui eventualmente puoi mettere fallback
  const countryCode = job.country!;

  // usa category se presente, altrimenti sector
  const functionKey = job.category || job.sector;

  const dto: LinkedInJobDTO = {
    jobId: job.id,
    applyUrl: job.applicationUrl || `https://YOUR-ATS.com/careers/${job.id}`,
    title: job.title,
    descriptionHtml: buildDescriptionHtml(job),
    companyName: orgConfig.companyName,
    linkedinCompanyId: orgConfig.linkedinCompanyId,
    jobPosterEmail: orgConfig.jobPosterEmail,
    countryCode,
    employmentType: employmentTypeMap[job.mode] || 'OTHER',
    jobLevel: job.experienceLevel ? jobLevelMap[job.experienceLevel] : undefined,
    jobFunctions: functionKey ? jobFunctionMap[functionKey] || [] : [],
    industries: job.industry ? industryMap[job.industry] || [] : [],
    city: job.city || undefined,
    state: job.province || undefined,
    locationFallback: job.city ? undefined : (job.locationFormatted || job.location || undefined),
  };

  if (job.salaryMin && job.salaryMax && job.salaryCurrency) {
    dto.salary = {
      min: job.salaryMin,
      max: job.salaryMax,
      currency: job.salaryCurrency,
      period: job.salaryInterval === 'monthly' ? 'monthly' : 'yearly',
    };
  }

  return dto;
}

export function validateJobForLinkedIn(
  job: JobType,
  orgConfig: LinkedInOrgConfig
): string[] {
  const errors: string[] = [];
  const nonGenericDomainRegex =
    /^[a-zA-Z0-9._%+-]+@(?!gmail\.com|yahoo\.com|outlook\.com)[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

  if (!job.id) errors.push('job.id è mancante.');
  if (!job.title) errors.push('job.title è mancante.');
  if (!job.company) errors.push('job.company è mancante.');
  if (!job.applicationUrl && !job.id) {
    errors.push('job.applicationUrl (o un job.id per URL di fallback) è necessario.');
  }
  if (!job.country || job.country.length !== 2) {
    errors.push('job.country deve essere un codice ISO 3166-1 alpha-2 di 2 caratteri.');
  }

  if (!orgConfig.linkedinCompanyId) errors.push('Configurazione: linkedinCompanyId mancante.');
  if (!orgConfig.jobPosterEmail) errors.push('Configurazione: jobPosterEmail mancante.');
  else if (!nonGenericDomainRegex.test(orgConfig.jobPosterEmail)) {
    errors.push('Configurazione: jobPosterEmail deve usare un dominio aziendale.');
  }

  const combinedDescriptionLength =
    (job.description?.length || 0) +
    (job.requirements?.length || 0) +
    (job.responsibilities?.length || 0) +
    (job.benefits?.length || 0);
  if (combinedDescriptionLength < 100) {
    errors.push(
      `Descrizione combinata troppo corta (${combinedDescriptionLength} caratteri), minimo 100.`
    );
  }

  if (job.applicationUrl && !job.applicationUrl.startsWith('https://')) {
    errors.push('job.applicationUrl deve essere un URL HTTPS.');
  }

  return errors;
}

// --- SEZIONE D: Serializzazione XML ---

export function buildLinkedInXml(
  jobs: LinkedInJobDTO[],
  publisherName: string,
  publisherUrl: string
): string {
  const jobsXml = jobs
    .map(job => {
      return `
  <job>
    <job-id>${escapeXml(job.jobId)}</job-id>
    <apply-url><![CDATA[${job.applyUrl}]]></apply-url>
    <title><![CDATA[${job.title}]]></title>
    <description><![CDATA[${job.descriptionHtml}]]></description>
    <company-name><![CDATA[${job.companyName}]]></company-name>
    <linkedin-company-id>${escapeXml(job.linkedinCompanyId)}</linkedin-company-id>
    <job-poster-email>${escapeXml(job.jobPosterEmail)}</job-poster-email>
    ${job.city ? `<city><![CDATA[${job.city}]]></city>` : ''}
    ${job.state ? `<state><![CDATA[${job.state}]]></state>` : ''}
    <country-code>${escapeXml(job.countryCode)}</country-code>
    ${job.locationFallback ? `<location><![CDATA[${job.locationFallback}]]></location>` : ''}
    <employment-type>${escapeXml(job.employmentType)}</employment-type>
    ${job.jobLevel ? `<job-level>${escapeXml(job.jobLevel)}</job-level>` : ''}
    ${
      job.jobFunctions.length > 0
        ? `<job-functions>${job.jobFunctions
            .map(fn => `<job-function><code>${escapeXml(fn)}</code></job-function>`)
            .join('')}</job-functions>`
        : ''
    }
    ${
      job.industries.length > 0
        ? `<industries>${job.industries
            .map(ind => `<industry><code>${escapeXml(ind)}</code></industry>`)
            .join('')}</industries>`
        : ''
    }
    ${
      job.salary
        ? `
    <salaries>
      <salary>
        <min>${job.salary.min}</min>
        <max>${job.salary.max}</max>
        <currency>${escapeXml(job.salary.currency)}</currency>
        <period>${escapeXml(job.salary.period)}</period>
      </salary>
    </salaries>`
        : ''
    }
  </job>`;
    })
    .join('');

  return `<?xml version="1.0" encoding="UTF-8"?>
<source>
  <last-modified>${new Date().toISOString()}</last-modified>
  <publisher>${escapeXml(publisherName)}</publisher>
  <publisher-url><![CDATA[${publisherUrl}]]></publisher-url>${jobsXml}
</source>`;
}