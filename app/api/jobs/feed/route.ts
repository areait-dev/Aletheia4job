import { NextResponse } from 'next/server';
import prisma from '@/utils/db';
import { buildIndeedXmlFeed } from '@/utils/aggregator';
import { JobStatus, JobMode } from '@/utils/types';

const AUTH_TOKEN = process.env.AGGREGATOR_FEED_TOKEN;
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://example.com';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const token = url.searchParams.get('token');

  if (!AUTH_TOKEN || token !== AUTH_TOKEN) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const jobs = await prisma.job.findMany({
      where: {
        isActive: true,
        OR: [
          { postToLinkedIn: true },
          { postToIndeed: true },
          { postToJooble: true },
        ],
      },
      orderBy: { postedAt: 'desc' },
    });

    const transformedJobs = jobs.map(job => ({
      ...job,
      status: job.status as JobStatus,
      mode: job.mode as JobMode,
    }));

    const xml = buildIndeedXmlFeed(transformedJobs, SITE_URL);

    return new NextResponse(xml, {
      headers: {
        'Content-Type': 'application/xml; charset=utf-8',
        'Cache-Control': 's-maxage=3600, stale-while-revalidate',
      },
    });
  } catch (error) {
    console.error('Error generating job feed:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
