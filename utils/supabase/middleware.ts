import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { isMultipostingEnabled, isMultipostingPath } from '@/utils/featureFlags'

export async function updateSession(request: NextRequest) {
  // Multiposting: a flag spento questi endpoint non esistono (404, senza passare dal login).
  // A flag acceso il webhook ha un'autenticazione propria (secret) e salta la sessione.
  if (isMultipostingPath(request.nextUrl.pathname)) {
    if (!isMultipostingEnabled()) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }
    if (request.nextUrl.pathname === '/api/webhooks/multiposting') {
      return NextResponse.next()
    }
  }

  let supabaseResponse = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          request.cookies.set({
            name,
            value,
            ...options,
          })
          supabaseResponse = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          supabaseResponse.cookies.set({
            name,
            value,
            ...options,
          })
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({
            name,
            value: '',
            ...options,
          })
          supabaseResponse = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          supabaseResponse.cookies.set({
            name,
            value: '',
            ...options,
          })
        },
      },
    }
  )

  // refreshing the auth token
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Protect routes conditionally based on authentication
  const isAuthRoute    = request.nextUrl.pathname.startsWith('/login') ||
                         request.nextUrl.pathname.startsWith('/aziende/registrati')
  const isInviteRoute  = request.nextUrl.pathname.startsWith('/invito/')
  const isCareersRoute = request.nextUrl.pathname.startsWith('/offerte-di-lavoro') ||
                         request.nextUrl.pathname.startsWith('/registrazione') ||
                         request.nextUrl.pathname.startsWith('/diventa-docente') ||
                         request.nextUrl.pathname.startsWith('/privacy-policy') ||
                         request.nextUrl.pathname.startsWith('/cookie-policy') ||
                         request.nextUrl.pathname.startsWith('/aziende/termini') ||
                         request.nextUrl.pathname.startsWith('/aziende/privacy-azienda')
  // Richiesta del link di recupero: pubblica. La pagina /reimposta-password/nuova
  // richiede invece la sessione di recupero creata da /auth/callback.
  const isResetRequestRoute = request.nextUrl.pathname === '/reimposta-password'
  const isAuthCallback = request.nextUrl.pathname.startsWith('/auth/callback')
  const isSeoRoute     = request.nextUrl.pathname === '/robots.txt' ||
                         request.nextUrl.pathname === '/sitemap.xml'
  const isApiRoute     = (isMultipostingEnabled() && request.nextUrl.pathname.startsWith('/api/feeds')) ||
                         request.nextUrl.pathname.startsWith('/api/upload-cv') ||
                         request.nextUrl.pathname.startsWith('/api/public/')

  if (!user && !isAuthRoute && !isInviteRoute && !isCareersRoute && !isResetRequestRoute && !isAuthCallback && !isSeoRoute && !isApiRoute && request.nextUrl.pathname !== '/') {
    // If not authenticated and not on an auth route, redirect to login
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  if (user && isAuthRoute) {
     // If authenticated trying to access login, redirect to dashboard
    const url = request.nextUrl.clone()
    url.pathname = '/dashboard'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}
