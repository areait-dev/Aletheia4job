import { JobType } from '@/utils/types';

const externalCategoryMap: Record<string, string> = {
  'ICT': 'Information Technology',
  'Information Technology': 'Information Technology',
  'Software': 'Information Technology',
  'Finanza': 'Accounting / Finance',
  'Finance': 'Accounting / Finance',
  'Marketing': 'Advertising / Marketing',
  'Vendite': 'Sales',
  'Sales': 'Sales',
  'Risorse Umane': 'Human Resources',
  'Human Resources': 'Human Resources',
  'Sanità': 'Healthcare',
  'Healthcare': 'Healthcare',
  'Manifatturiero': 'Manufacturing',
  'Manufacturing': 'Manufacturing',
  'Logistica': 'Logistics / Supply Chain',
  'Supply Chain': 'Logistics / Supply Chain',
  'Amministrazione': 'Admin / Clerical',
  'Education': 'Education',
  'Hospitality': 'Hospitality',
};

const indeedExperienceMap: Record<string, string> = {
  'Junior': 'Entry Level',
  'Entry Level': 'Entry Level',
  'Mid': 'Mid Level',
  'Mid Level': 'Mid Level',
  'Senior': 'Senior Level',
  'Senior Level': 'Senior Level',
  'Director': 'Director / Executive',
  'Director / Executive': 'Director / Executive',
};

export function mapSectorToExternalCategory(sector: string) {
  const normalized = sector.trim();
  return externalCategoryMap[normalized] ?? 'Other';
}

export function mapExperienceLevelToExternal(experience: string | null | undefined) {
  if (!experience) return 'Not Specified';
  const normalized = experience.trim();
  return indeedExperienceMap[normalized] ?? experience;
}

export function buildApplicationUrl(job: JobType, source: 'indeed' | 'jooble') {
  const baseUrl = job.applicationUrl?.trim();
  const url = baseUrl || `https://example.com/jobs/${job.id}`;

  const params = new URLSearchParams();
  params.set('utm_source', source);
  params.set('utm_medium', 'job_feed');
  params.set('utm_campaign', 'aggregator');
  if (job.utmCampaign) params.set('utm_campaign', job.utmCampaign);

  return `${url}${url.includes('?') ? '&' : '?'}${params.toString()}`;
}

function escapeXml(value: string | number | null | undefined) {
  if (value === null || value === undefined) return '';
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/'/g, '&apos;')
    .replace(/"/g, '&quot;');
}

export function buildIndeedJobXml(job: JobType, hostUrl: string) {
  const locationParts = [job.location, job.city, job.province, job.country]
    .filter(Boolean)
    .join(', ');

  return `  <job>
    <title>${escapeXml(job.title)}</title>
    <date>${escapeXml(job.postedAt?.toISOString().split('T')[0] ?? new Date().toISOString().split('T')[0])}</date>
    <referencenumber>${escapeXml(job.id)}</referencenumber>
    <url>${escapeXml(buildApplicationUrl(job, 'indeed'))}</url>
    <company>${escapeXml(job.company)}</company>
    <city>${escapeXml(job.city ?? job.location)}</city>
    <state>${escapeXml(job.province ?? '')}</state>
    <country>${escapeXml(job.country ?? 'IT')}</country>
    <description>${escapeXml(job.description)}</description>
    <requirements>${escapeXml(job.requirements)}</requirements>
    <salary>${escapeXml(job.salaryText ?? (job.salaryMin && job.salaryMax ? `€${job.salaryMin.toLocaleString('it-IT')} - €${job.salaryMax.toLocaleString('it-IT')}` : job.salary ? `€${job.salary.toLocaleString('it-IT')}` : 'Non specificato'))}</salary>
    <jobtype>${escapeXml(job.mode)}</jobtype>
    <experiencelevel>${escapeXml(mapExperienceLevelToExternal(job.experienceLevel))}</experiencelevel>
    <category>${escapeXml(job.category ?? mapSectorToExternalCategory(job.sector))}</category>
    <location_formatted>${escapeXml(job.locationFormatted ?? locationParts)}</location_formatted>
    <remote>${escapeXml(job.remoteType ?? 'Not Specified')}</remote>
  </job>`;
}

export function buildIndeedXmlFeed(jobs: JobType[], hostUrl: string) {
  const jobsXml = jobs.map((job) => buildIndeedJobXml(job, hostUrl)).join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<source>\n  <publisher>${escapeXml('Your Company Name')}</publisher>\n  <publisherurl>${escapeXml(hostUrl)}</publisherurl>\n  <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>\n${jobsXml}\n</source>`;
}

function buildJoobleJobXml(job: JobType, hostUrl: string) {
  const locationParts = [job.location, job.city, job.province, job.country]
    .filter(Boolean)
    .join(', ');

  return `  <job>
    <id>${escapeXml(job.id)}</id>
    <title>${escapeXml(job.title)}</title>
    <url>${escapeXml(buildApplicationUrl(job, 'jooble'))}</url>
    <company>${escapeXml(job.company)}</company>
    <category>${escapeXml(job.category ?? mapSectorToExternalCategory(job.sector))}</category>
    <location>${escapeXml(locationParts)}</location>
    <description>${escapeXml(job.description)}</description>
    <experience>${escapeXml(mapExperienceLevelToExternal(job.experienceLevel))}</experience>
    <salary>${escapeXml(job.salaryText ?? (job.salaryMin && job.salaryMax ? `€${job.salaryMin.toLocaleString('it-IT')} - €${job.salaryMax.toLocaleString('it-IT')}` : job.salary ? `€${job.salary.toLocaleString('it-IT')}` : 'Non specificato'))}</salary>
    <remote>${escapeXml(job.remoteType ?? 'Not Specified')}</remote>
    <type>${escapeXml(job.mode)}</type>
    <posted>${escapeXml(job.postedAt?.toISOString().split('T')[0] ?? new Date().toISOString().split('T')[0])}</posted>
  </job>`;
}

export type AggregatorProvider = 'indeed' | 'jooble';

export function buildJoobleXmlFeed(jobs: JobType[], hostUrl: string) {
  const jobsXml = jobs.map((job) => buildJoobleJobXml(job, hostUrl)).join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<jobs>\n${jobsXml}\n</jobs>`;
}

export function buildAggregatorXmlFeed(provider: AggregatorProvider, jobs: JobType[], hostUrl: string) {
  switch (provider) {
    case 'jooble':
      return buildJoobleXmlFeed(jobs, hostUrl);
    case 'indeed':
    default:
      return buildIndeedXmlFeed(jobs, hostUrl);
  }
}
