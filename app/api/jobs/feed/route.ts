import { NextResponse } from 'next/server';
import prisma from '@/utils/db';

export async function GET() {
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
      include: {
        organization: {
          select: { name: true }
        }
      }
    });

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://job-aletheia.vercel.app';

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<source>
  <publisher>Job Aletheia ATS</publisher>
  <publisherurl>${baseUrl}</publisherurl>
  <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
  ${jobs.map(job => `
  <job>
    <title><![CDATA[${job.title}]]></title>
    <date><![CDATA[${job.postedAt?.toUTCString() || job.createdAt.toUTCString()}]]></date>
    <referencenumber><![CDATA[${job.id}]]></referencenumber>
    <url><![CDATA[${baseUrl}/careers/${job.id}]]></url>
    <company><![CDATA[${job.company}]]></company>
    <city><![CDATA[${job.city || ''}]]></city>
    <state><![CDATA[${job.province || ''}]]></state>
    <country><![CDATA[${job.country || 'IT'}]]></country>
    <description><![CDATA[${job.description}\n\nRequisiti:\n${job.requirements}]]></description>
    <salary><![CDATA[${job.salaryText || (job.salaryMin ? `${job.salaryMin} - ${job.salaryMax} ${job.salaryCurrency}` : '')}]]></salary>
    <education><![CDATA[${job.educationLevel || ''}]]></education>
    <jobtype><![CDATA[${job.mode}]]></jobtype>
    <category><![CDATA[${job.category || job.sector}]]></category>
    <experience><![CDATA[${job.experienceLevel || ''}]]></experience>
  </job>`).join('')}
</source>`;

    return new NextResponse(xml, {
      headers: {
        'Content-Type': 'application/xml',
        'Cache-Control': 's-maxage=3600, stale-while-revalidate',
      },
    });
  } catch (error) {
    console.error('Error generating job feed:', error);
    return new NextResponse('Error generating job feed', { status: 500 });
  }
}
