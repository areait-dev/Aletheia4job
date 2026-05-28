const supabaseUrl = process.env.SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('[keep-alive] SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY sono obbligatorie')
  process.exit(1)
}

async function ping() {
  const start = Date.now()

  const res = await fetch(`${supabaseUrl}/rest/v1/Organization?select=id&limit=1`, {
    headers: {
      apikey: supabaseKey,
      Authorization: `Bearer ${supabaseKey}`,
    },
  })

  const elapsed = Date.now() - start

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    console.error(`[keep-alive] FALLITO dopo ${elapsed}ms (HTTP ${res.status}): ${text}`)
    process.exit(1)
  }

  const data = await res.json()
  console.log(`[keep-alive] OK — ${data.length} organizzazioni trovate (${elapsed}ms)`)
}

await ping()
