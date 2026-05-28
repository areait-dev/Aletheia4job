const supabaseUrl = process.env.SUPABASE_URL

if (!supabaseUrl) {
  console.error('[keep-alive] SUPABASE_URL è obbligatoria')
  process.exit(1)
}

async function ping() {
  const start = Date.now()
  const res = await fetch(supabaseUrl, { method: 'HEAD' })
  const elapsed = Date.now() - start
  console.log(`[keep-alive] OK (HTTP ${res.status}, ${elapsed}ms)`)
}

await ping()
