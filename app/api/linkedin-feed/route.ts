// app/api/linkedin-feed/route.ts
import { NextResponse } from 'next/server';
import { getLinkedInJobsForOrg } from '@/utils/get-linkedin-jobs';
import {
  mapJobToLinkedInDto,
  buildLinkedInXml,
  validateJobForLinkedIn,
  LinkedInOrgConfig,
} from '@/utils/linkedin-feed-generator';

export const dynamic = 'force-dynamic';

const REQUIRED_ENV_VARS = [
  'LINKEDIN_FEED_ORG_ID',
  'LINKEDIN_COMPANY_ID',
  'LINKEDIN_JOB_POSTER_EMAIL',
  'LINKEDIN_COMPANY_NAME',
  'LINKEDIN_ATS_NAME',
  'NEXT_PUBLIC_SITE_URL',
] as const;

export async function GET() {
  const missing = REQUIRED_ENV_VARS.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    return NextResponse.json(
      { error: `LinkedIn feed not configured. Missing env vars: ${missing.join(', ')}` },
      { status: 503 }
    );
  }

  const orgConfig: LinkedInOrgConfig = {
    organizationId: process.env.LINKEDIN_FEED_ORG_ID!,
    linkedinCompanyId: process.env.LINKEDIN_COMPANY_ID!,
    jobPosterEmail: process.env.LINKEDIN_JOB_POSTER_EMAIL!,
    companyName: process.env.LINKEDIN_COMPANY_NAME!,
  };

  const jobs = await getLinkedInJobsForOrg(orgConfig.organizationId);

  const validDtos = [];
  for (const job of jobs) {
    const errors = validateJobForLinkedIn(job, orgConfig);
    if (errors.length === 0) {
      validDtos.push(mapJobToLinkedInDto(job, orgConfig));
    }
  }

  const xml = buildLinkedInXml(validDtos, process.env.LINKEDIN_ATS_NAME!, process.env.NEXT_PUBLIC_SITE_URL!);

  return new NextResponse(xml, {
    status: 200,
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'max-age=300',
    },
  });
}