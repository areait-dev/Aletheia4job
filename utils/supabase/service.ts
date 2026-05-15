import { createClient } from '@supabase/supabase-js';

/**
 * Client Supabase con Service Role — solo server-side (API routes, Server Actions).
 * Non importare mai in componenti client.
 */
export function createServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error(
      'Configurazione Supabase mancante: imposta NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY',
    );
  }

  return createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
