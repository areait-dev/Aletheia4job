/**
 * Analisi (SOLA LETTURA) dei log dell'API gateway di Supabase tramite l'API di gestione:
 * richieste a /rest/v1/ e allo Storage, raggruppate per giorno, ruolo della chiave, area, IP e user agent.
 *
 *   SUPABASE_TOKEN_FILE=<file con SUPABASE_ACCESS_TOKEN=...> npx tsx scripts/maintenance/supabase-log-audit.ts [giorni=7] [file-csv-output]
 *
 * Il token non viene mai stampato né salvato. Il project ref si ricava da NEXT_PUBLIC_SUPABASE_URL.
 * L'endpoint accetta SQL ClickHouse sulla tabella `logs` (filtro source = 'edge_logs'); le richieste sono distanziate per i limiti di frequenza.
 */
import 'dotenv/config';
import fs from 'node:fs';

const tokenFile = process.env.SUPABASE_TOKEN_FILE;
if (!tokenFile) throw new Error('Imposta SUPABASE_TOKEN_FILE.');
const tokenMatch = fs.readFileSync(tokenFile, 'utf8').match(/^\s*SUPABASE_ACCESS_TOKEN\s*=\s*"?([^"\r\n]+)"?/m);
if (!tokenMatch) throw new Error('SUPABASE_ACCESS_TOKEN non trovato nel file.');
const TOKEN: string = tokenMatch[1].trim();
const refMatch = process.env.NEXT_PUBLIC_SUPABASE_URL?.match(/https:\/\/([a-z0-9]+)\./)?.[1];
if (!refMatch) throw new Error('Project ref non determinabile da NEXT_PUBLIC_SUPABASE_URL.');
const ref: string = refMatch;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function query(sql: string, start: Date, end: Date): Promise<any[]> {
  const u = new URL(`https://api.supabase.com/v1/projects/${ref}/analytics/endpoints/logs`);
  u.searchParams.set('sql', sql);
  u.searchParams.set('iso_timestamp_start', start.toISOString());
  u.searchParams.set('iso_timestamp_end', end.toISOString());
  for (let attempt = 0; attempt < 6; attempt++) {
    const r = await fetch(u, { headers: { Authorization: `Bearer ${TOKEN}` } });
    if (r.status === 429) { await sleep(15000 * (attempt + 1)); continue; }
    const j: any = await r.json().catch(() => ({}));
    if (!r.ok || j?.error) throw new Error(`HTTP ${r.status}: ${typeof j?.error === 'string' ? j.error : JSON.stringify(j?.error ?? j).slice(0, 300)}`);
    return j.result ?? [];
  }
  throw new Error('Limite di frequenza dell\'API: riprovare più tardi.');
}

const A = (k: string) => `log_attributes['${k}']`;
const SQL = `
SELECT
  toDate(timestamp) AS day,
  ${A('request.sb.jwt.apikey.payload.role')} AS key_role,
  ${A('request.sb.jwt.authorization.payload.role')} AS auth_role,
  ${A('request.method')} AS method,
  multiIf(
    startsWith(${A('request.path')}, '/rest/v1/'), 'rest',
    startsWith(${A('request.path')}, '/storage/v1/object/public/'), 'storage-pubblico',
    startsWith(${A('request.path')}, '/storage/v1/object/sign/'), 'storage-link-firmato',
    startsWith(${A('request.path')}, '/storage/v1/'), 'storage-api',
    'altro') AS area,
  ${A('response.status_code')} AS status,
  ${A('request.headers.cf_connecting_ip')} AS ip,
  ${A('request.headers.user_agent')} AS ua,
  ${A('request.headers.x_client_info')} AS client,
  ${A('request.cf.country')} AS country,
  ${A('request.cf.asOrganization')} AS asn,
  count() AS n
FROM logs
WHERE source = 'edge_logs'
  AND (startsWith(${A('request.path')}, '/rest/v1/') OR startsWith(${A('request.path')}, '/storage/v1/'))
GROUP BY day, key_role, auth_role, method, area, status, ip, ua, client, country, asn
ORDER BY day, n DESC`;

type Row = { day: string; key_role: string; auth_role: string; method: string; area: string; status: string; ip: string; ua: string; client: string; country: string; asn: string; n: number };

async function main() {
  const days = Number(process.argv.find((a, i) => i > 1 && /^\d+$/.test(a)) ?? 7);
  const outCsv = process.argv.find((a, i) => i > 1 && a.endsWith('.csv'));
  const end = new Date();
  const all: Row[] = [];
  for (let d = days - 1; d >= 0; d--) {
    // una finestra per giorno solare UTC (l'API limita l'intervallo di una richiesta)
    const dayStart = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate() - d));
    const dayEnd = d === 0 ? end : new Date(dayStart.getTime() + 24 * 3600e3 - 1);
    const rows = (await query(SQL, dayStart, dayEnd)) as Row[];
    all.push(...rows.map((r) => ({ ...r, n: Number(r.n) })));
    process.stderr.write(`  ${dayStart.toISOString().slice(0, 10)}: ${rows.length} gruppi\n`);
    await sleep(4000);
  }
  if (outCsv) {
    const head = 'giorno,ruolo_chiave,ruolo_auth,metodo,area,stato,ip,paese,rete,user_agent,client,n';
    fs.writeFileSync(outCsv, head + '\n' + all.map((r) => [r.day, r.key_role, r.auth_role, r.method, r.area, r.status, r.ip, r.country, r.asn, r.ua, r.client, r.n].map((v) => `"${String(v ?? '').replace(/"/g, '""')}"`).join(',')).join('\n'));
  }
  const total = all.reduce((s, r) => s + r.n, 0);
  console.log(`Periodo: ultimi ${days} giorni (UTC) — richieste a /rest/v1 e /storage/v1: ${total}`);

  const sum = (rows: Row[], k: (r: Row) => string) => {
    const m = new Map<string, number>();
    for (const r of rows) m.set(k(r), (m.get(k(r)) ?? 0) + r.n);
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
  };
  console.log('\nPer ruolo della chiave (apikey):');
  for (const [k, n] of sum(all, (r) => r.key_role || '(nessuna / non JWT)')) console.log(`  ${String(n).padStart(6)}  ${k}`);
  console.log('\nPer giorno e ruolo:');
  for (const [k, n] of sum(all, (r) => `${r.day}  ${r.key_role || '(nessuna)'}`).sort()) console.log(`  ${String(n).padStart(6)}  ${k}`);

  const notService = all.filter((r) => r.key_role !== 'service_role');
  console.log(`\nRichieste NON fatte con la chiave di servizio (anon o senza chiave): ${notService.reduce((s, r) => s + r.n, 0)}`);
  const grouped = new Map<string, Row & { days: Set<string> }>();
  for (const r of notService) {
    const key = [r.key_role, r.area, r.method, r.status, r.ip, r.ua, r.client].join('|');
    const g = grouped.get(key);
    if (g) { g.n += r.n; g.days.add(r.day); } else grouped.set(key, { ...r, days: new Set([r.day]) });
  }
  for (const g of [...grouped.values()].sort((a, b) => b.n - a.n)) {
    console.log(`  ${String(g.n).padStart(5)}  [${g.key_role || 'no-key'}] ${g.area} ${g.method} → ${g.status}  ip=${g.ip} (${g.country}, ${g.asn})  giorni=${[...g.days].sort().map((d) => d.slice(5)).join(',')}\n         ua="${g.ua.slice(0, 90)}" client="${g.client.slice(0, 60)}"`);
  }

  const svc = all.filter((r) => r.key_role === 'service_role');
  console.log('\nChiave di servizio (la nostra app lato server) — IP e client:');
  for (const [k, n] of sum(svc, (r) => `${r.ip} (${r.country}, ${r.asn}) client="${r.client.slice(0, 40)}"`).slice(0, 12)) console.log(`  ${String(n).padStart(6)}  ${k}`);
}
main().catch((e) => { console.error(e.message ?? e); process.exit(1); });
