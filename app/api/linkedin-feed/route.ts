// app/api/linkedin-feed/route.ts
import { NextResponse } from 'next/server';
import { getLinkedInJobsForOrg } from '@/utils/get-linkedin-jobs';
import {
  mapJobToLinkedInDto,
  buildLinkedInXml,
  validateJobForLinkedIn,
  LinkedInOrgConfig,
} from '@/utils/linkedin-feed-generator';

export async function GET() {
  // Prendi l'organizationId da env o da config reale
  const organizationId = process.env.LINKEDIN_FEED_ORG_ID ?? 'org_prod_123';

  const orgConfig: LinkedInOrgConfig = {
    organizationId,
    linkedinCompanyId: process.env.LINKEDIN_COMPANY_ID ?? '12345678',
    jobPosterEmail: process.env.LINKEDIN_JOB_POSTER_EMAIL ?? 'recruiting@yourcompany.com',
    companyName: process.env.LINKEDIN_COMPANY_NAME ?? 'Your Company S.p.A.',
  };

  // 1. Recupera i job dal DB
  const jobs = await getLinkedInJobsForOrg(orgConfig.organizationId);
  console.log('[LinkedInFeed] Jobs dopo query Prisma:', jobs.length);

  // 2. Valida e mappa
  const validDtos = [];
  for (const job of jobs) {
    const errors = validateJobForLinkedIn(job, orgConfig);
    if (errors.length === 0) {
      validDtos.push(mapJobToLinkedInDto(job, orgConfig));
    } else {
      console.warn('[LinkedInFeed] Job escluso', job.id, errors);
    }
  }
  console.log('[LinkedInFeed] Jobs validi per XML:', validDtos.length);

  // 3. Genera XML
  const xml = buildLinkedInXml(validDtos, 'NomeDelTuoATS', 'https://getjob-delta.vercel.app/');

  return new NextResponse(xml, {
    status: 200,
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'max-age=300',
    },
  });
}