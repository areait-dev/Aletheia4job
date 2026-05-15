// utils/get-linkedin-jobs.ts
import { prisma } from '@/lib/prisma';
import { JobStatus } from '@/utils/types';
import type { JobType } from '@/utils/types';

export async function getLinkedInJobsForOrg(organizationId: string): Promise<JobType[]> {
  const jobs = await prisma.job.findMany({
    where: {
      organizationId,
      isActive: true,
      postToLinkedIn: true,
      status: JobStatus.Aperto,
    },
    orderBy: { createdAt: 'desc' },
  });

  console.log('[LinkedInFeed] Jobs trovati nel DB per org', organizationId, ':', jobs.length);

  return jobs as unknown as JobType[];
}