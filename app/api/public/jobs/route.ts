import { NextResponse } from 'next/server';
import prisma from '@/utils/db';
import { getPublicJobSlugMapAction } from '@/utils/actions/jobs';

export const dynamic = 'force-dynamic';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://aletheia4job.it';
const DEFAULT_LIMIT = 6;
const MAX_LIMIT = 50;
const CACHE_CONTROL = 'public, s-maxage=300, stale-while-revalidate=600';

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders() });
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const limitParam = Number(url.searchParams.get('limit'));
    const limit = Number.isFinite(limitParam) && limitParam > 0
      ? Math.min(Math.trunc(limitParam), MAX_LIMIT)
      : DEFAULT_LIMIT;

    const jobs = await prisma.job.findMany({
      where: {
        isActive: true,
        status: 'Aperto',
        postToCareerPage: { not: false },
        OR: [
          { expiresAt: null },
          { expiresAt: { gt: new Date() } },
        ],
      },
      orderBy: { postedAt: 'desc' },
      take: limit,
      select: {
        id: true,
        title: true,
        company: true,
        location: true,
        mode: true,
        postedAt: true,
      },
    });

    const slugMap = await getPublicJobSlugMapAction();
    const slugById = new Map(slugMap.map(e => [e.id, e.slug]));

    const data = jobs.map(job => ({
      id: job.id,
      title: job.title,
      company: job.company,
      location: job.location,
      contractType: job.mode,
      publishedAt: job.postedAt,
      url: `${SITE_URL}/offerte-di-lavoro/${slugById.get(job.id) ?? job.id}`,
    }));

    return NextResponse.json(
      { jobs: data },
      {
        status: 200,
        headers: {
          ...corsHeaders(),
          'Cache-Control': CACHE_CONTROL,
        },
      }
    );
  } catch (error) {
    console.error('Errore endpoint pubblico jobs:', error);
    return NextResponse.json(
      { error: 'Impossibile recuperare le offerte al momento.' },
      { status: 500, headers: corsHeaders() }
    );
  }
}
