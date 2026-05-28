import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('[keep-alive] SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY sono obbligatorie')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function ping() {
  const start = Date.now()

  const { data, error } = await supabase
    .from('Organization')
    .select('id', { count: 'exact', head: true })

  const elapsed = Date.now() - start

  if (error) {
    console.error(`[keep-alive] FALLITO dopo ${elapsed}ms:`, error.message)
    process.exit(1)
  }

  console.log(`[keep-alive] OK — ${data?.length ?? 0} organizzazioni trovate (${elapsed}ms)`)
}

await ping()
