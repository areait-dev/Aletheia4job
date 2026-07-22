import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
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
  const isAuthRoute    = request.nextUrl.pathname.startsWith('/login')
  const isInviteRoute  = request.nextUrl.pathname.startsWith('/invite/')
  const isCareersRoute = request.nextUrl.pathname.startsWith('/offerte-di-lavoro') ||
                         request.nextUrl.pathname.startsWith('/registrazione')
  const isSeoRoute     = request.nextUrl.pathname === '/robots.txt' ||
                         request.nextUrl.pathname === '/sitemap.xml'
  const isApiRoute     = request.nextUrl.pathname.startsWith('/api/feeds') ||
                         request.nextUrl.pathname.startsWith('/api/upload-cv')

  if (!user && !isAuthRoute && !isInviteRoute && !isCareersRoute && !isSeoRoute && !isApiRoute && request.nextUrl.pathname !== '/') {
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
