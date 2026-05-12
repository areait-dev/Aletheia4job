import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'

/**
 * Crea un client Supabase per l'utilizzo in Server Components, Server Actions o Route Handlers.
 * In Next.js 14, cookies() deve essere chiamato all'interno del contesto di richiesta.
 */
export function createClient() {
  let cookieStore;
  
  try {
    cookieStore = cookies();
  } catch (error) {
    // Se cookies() fallisce, probabilmente siamo in un contesto statico o client-side non previsto
    console.error("Supabase createClient: cookies() called outside of request context");
    throw new Error("Supabase createClient: context error");
  }

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value, ...options })
          } catch (error) {
            // Ignorato se chiamato da Server Component (solo Middleware o Actions possono settare cookie)
          }
        },
        remove(name: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value: '', ...options })
          } catch (error) {
            // Ignorato se chiamato da Server Component
          }
        },
      },
    }
  )
}
