import { NextResponse } from 'next/server';
import prisma from '@/utils/db';
import { getAuthContext, type AuthContext } from '@/utils/authz';

export const dynamic = 'force-dynamic';

type AuthResult =
  | { ok: true; auth: AuthContext }
  | { ok: false; response: NextResponse };

async function resolveAuth(): Promise<AuthResult> {
  try {
    const auth = await getAuthContext();
    if (!auth) {
      return {
        ok: false,
        response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
      };
    }
    return { ok: true, auth };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[leads/all-data] getAuthContext failed:', error);

    if (message.includes('context error') || message.includes('cookies()')) {
      return {
        ok: false,
        response: NextResponse.json(
          { error: 'Authentication service unavailable' },
          { status: 500 },
        ),
      };
    }

    return {
      ok: false,
      response: NextResponse.json({ error: 'Internal authentication error' }, { status: 500 }),
    };
  }
}

export async function GET() {
  const authResult = await resolveAuth();
  if (!authResult.ok) return authResult.response;
  const { auth } = authResult;

  try {
    const candidates = await prisma.candidate.findMany({
      where: {
        organizationId: auth.organizationId,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json({
      candidates,
      googleFormLeads: [],
      facebookLeads: [],
      stats: {
        total: candidates.length,
      },
    });
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
