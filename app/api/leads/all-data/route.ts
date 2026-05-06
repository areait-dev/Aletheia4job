import { NextResponse } from 'next/server';
import prisma from '@/utils/db';
import { createClient } from '@/utils/supabase/server';

export async function GET() {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    // In production, we should check for user
    // if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const candidates = await prisma.candidate.findMany({
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
