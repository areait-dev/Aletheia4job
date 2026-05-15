import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

export const dynamic = 'force-dynamic'

type SupabaseResult =
  | { ok: true; supabase: ReturnType<typeof createClient> }
  | { ok: false; response: NextResponse }

function resolveSupabase(): SupabaseResult {
  try {
    return { ok: true, supabase: createClient() }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('[auth/callback] createClient failed:', error)

    if (message.includes('context error') || message.includes('cookies()')) {
      return {
        ok: false,
        response: NextResponse.json(
          { error: 'Authentication service unavailable' },
          { status: 500 },
        ),
      }
    }

    return {
      ok: false,
      response: NextResponse.json({ error: 'Internal authentication error' }, { status: 500 }),
    }
  }
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/dashboard'

  if (code) {
    const clientResult = resolveSupabase()
    if (!clientResult.ok) return clientResult.response

    const { error } = await clientResult.supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth-callback-error`)
}
