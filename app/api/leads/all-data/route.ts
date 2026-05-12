import { NextResponse } from 'next/server';
import prisma from '@/utils/db';
import { getAuthContext } from '@/utils/authz';

export async function GET() {
  try {
    const auth = await getAuthContext();
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const candidates = await prisma.candidate.findMany({
      where: {
        organizationId: auth.organizationId,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Mocking the structure expected by the old frontend to prevent errors if ported
    return NextResponse.json({
      candidates,
      googleFormLeads: [], // For compatibility with ported code
      facebookLeads: [],   // For compatibility with ported code
      stats: {
        total: candidates.length,
      }
    });
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
