/**
 * Simulazione di un picco di CV (SOLO staging + server finti locali). Nessun dato reale, nessun servizio esterno a pagamento.
 *
 * Avvia: server finto (Groq con limite di richieste + Storage), l'app Next in modalità sviluppo da una cartella
 * indicata (così si confrontano due versioni del codice), il server di sviluppo di Inngest. Poi crea N candidature
 * su staging, invia gli N eventi "cv/process.requested" tutti insieme e misura finché finiscono.
 *
 *   node scripts/loadtest/peak/run.cjs --dir=<cartella-app> --label=PRIMA --count=200 --rpm=100 [--conn-limit=3] [--port=3100] [--timeout-min=14]
 *
 * Il server finto imita Groq con un limite di RPM e latenza 2-4 s: i limiti reali del piano Groq NON sono noti, il valore è un parametro.
 */
const { spawn, spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const arg = (n, d) => { const a = process.argv.find((x) => x.startsWith(`--${n}=`)); return a ? a.split('=').slice(1).join('=') : d; };
const DIR = path.resolve(arg('dir', '.'));
const LABEL = arg('label', 'misura');
const COUNT = Number(arg('count', 200));
const RPM = Number(arg('rpm', 100));
const PORT = Number(arg('port', 3100));
const CONN_LIMIT = arg('conn-limit', '');
const TIMEOUT_MIN = Number(arg('timeout-min', 14));
const REPO = path.resolve(__dirname, '..', '..', '..');
const MOCK_PORT = 4010;
const OUT_DIR = arg('out', path.join(REPO, 'tmp'));
fs.mkdirSync(OUT_DIR, { recursive: true });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const rd = (f) => { const o = {}; for (const l of fs.readFileSync(f, 'utf8').split(/\r?\n/)) { const m = l.match(/^\s*([A-Z0-9_]+)\s*=\s*"?([^"]*)"?\s*$/); if (m) o[m[1]] = m[2]; } return o; };
const st = rd(process.env.STAGING_ENV_FILE || path.join(REPO, '.env.staging'));
const prodUrl = fs.existsSync(path.join(REPO, '.env')) ? rd(path.join(REPO, '.env')).DATABASE_URL : '';
const prodRef = (prodUrl.match(/postgres\.([a-z0-9]+)/) || [])[1];
if (!prodRef || st.STAGING_DATABASE_URL.includes(prodRef)) { console.error('RIFIUTATO: staging uguale a produzione o produzione non verificabile.'); process.exit(1); }
const direct = new URL(st.STAGING_DATABASE_URL); direct.port = '5432'; direct.search = '';
const SESSION_URL = st.STAGING_DATABASE_URL.replace(':6543/', ':5432/').split('?')[0];
const DB_URL = st.STAGING_DATABASE_URL + (CONN_LIMIT ? `&connection_limit=${CONN_LIMIT}` : '');

const children = [];
function start(name, cmd, args, opts) {
  const log = fs.openSync(path.join(OUT_DIR, `${LABEL}-${name}.log`), 'w');
  const p = spawn(cmd, args, { ...opts, stdio: ['ignore', log, log] });
  children.push({ name, p });
  return p;
}
function killAll() {
  for (const { p } of children) { try { spawnSync('taskkill', ['/PID', String(p.pid), '/T', '/F'], { stdio: 'ignore' }); } catch { /* già chiuso */ } }
}
process.on('SIGINT', () => { killAll(); process.exit(1); });
async function waitFor(url, label, tries = 120, init) {
  for (let i = 0; i < tries; i++) { try { const r = await fetch(url, init); if (r.status < 500) return r; } catch { /* non ancora pronto */ } await sleep(1500); }
  throw new Error(`${label} non raggiungibile: ${url}`);
}

(async () => {
  const { PrismaClient } = require('@prisma/client');
  // sessione diretta (porta 5432) per le misure sul database di staging
  const pg = new PrismaClient({ datasourceUrl: SESSION_URL });
  const q = async (sql) => pg.$queryRawUnsafe(sql);

  console.log(`\n=== ${LABEL}: ${COUNT} CV insieme | app: ${DIR} | rpm=${RPM} | connection_limit=${CONN_LIMIT || '(predefinito)'} ===`);

  start('mock', process.execPath, [path.join(__dirname, 'mock-server.cjs'), `--port=${MOCK_PORT}`, `--rpm=${RPM}`], { cwd: REPO });
  await waitFor(`http://127.0.0.1:${MOCK_PORT}/health`, 'server finto', 20);

  const env = {
    ...process.env, NODE_ENV: 'development', PORT: String(PORT),
    DATABASE_URL: DB_URL, DIRECT_URL: SESSION_URL,
    NEXT_PUBLIC_SUPABASE_URL: `http://127.0.0.1:${MOCK_PORT}`, NEXT_PUBLIC_SUPABASE_ANON_KEY: 'fake', SUPABASE_SERVICE_ROLE_KEY: 'fake',
    GROQ_API_KEY: 'fake', GROQ_BASE_URL: `http://127.0.0.1:${MOCK_PORT}`,
    INNGEST_DEV: '1', INNGEST_SERVE_ORIGIN: `http://127.0.0.1:${PORT}`, NEXT_TELEMETRY_DISABLED: '1',
  };
  start('next', process.execPath, [path.join(DIR, 'node_modules', 'next', 'dist', 'bin', 'next'), 'dev', '-p', String(PORT)], { cwd: DIR, env });
  console.log('avvio app Next (compilazione al primo accesso)...');
  await waitFor(`http://127.0.0.1:${PORT}/api/inngest`, 'app Next', 150);

  start('inngest', 'npx', ['--yes', 'inngest-cli@latest', 'dev', '-u', `http://127.0.0.1:${PORT}/api/inngest`, '--no-discovery'], { cwd: REPO, shell: true });
  await waitFor('http://127.0.0.1:8288/', 'Inngest dev server', 90);
  const put = await fetch(`http://127.0.0.1:${PORT}/api/inngest`, { method: 'PUT' });
  console.log('registrazione funzioni su Inngest dev:', put.status, (await put.text()).slice(0, 100));
  await sleep(3000);

  // dati di prova su staging
  // si richiama tsx direttamente (run-staging.cjs perde l'output quando è collegato a una pipe)
  const seed = spawnSync('npx', ['tsx', 'scripts/loadtest/peak/seed-peak.ts', `--count=${COUNT}`], {
    cwd: REPO, encoding: 'utf8', maxBuffer: 50 * 1024 * 1024, shell: true,
    env: { ...process.env, DATABASE_URL: prodUrl, STAGING_DIRECT_SESSION_URL: SESSION_URL },
  });
  let seeded;
  try { seeded = JSON.parse(seed.stdout.slice(seed.stdout.indexOf('{'))); } catch { console.error('seed fallito:\n', (seed.stdout + seed.stderr).slice(-600)); killAll(); process.exit(1); }
  console.log(`creati ${seeded.events.length} candidati+candidature PENDING su staging`);

  await fetch(`http://127.0.0.1:${MOCK_PORT}/reset`, { method: 'POST' });
  const base = Number((await q(`select count(*)::int n from pg_stat_activity where datname = current_database() and pid <> pg_backend_pid()`))[0].n);

  const t0 = Date.now();
  const sendRes = await fetch('http://127.0.0.1:8288/e/dev', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(seeded.events) });
  console.log(`eventi inviati insieme: HTTP ${sendRes.status}`);

  const timeline = [];
  let peakConn = 0, lastPrint = 0, reached = {};
  const deadline = t0 + TIMEOUT_MIN * 60000;
  let final = null;
  while (Date.now() < deadline) {
    await sleep(3000);
    const rows = await q(`select a."parsingStatus" s, count(*)::int n, count(a."matchingScore")::int scored from "Application" a join "Candidate" c on c.id = a."candidateId" where c.email like 'peak-%@example.invalid' group by 1`);
    const by = Object.fromEntries(rows.map((r) => [r.s, r.n]));
    const scored = rows.reduce((s, r) => s + r.scored, 0);
    const conn = Number((await q(`select count(*)::int n from pg_stat_activity where datname = current_database() and pid <> pg_backend_pid()`))[0].n) - base;
    peakConn = Math.max(peakConn, conn);
    const mock = await (await fetch(`http://127.0.0.1:${MOCK_PORT}/stats`)).json();
    const done = (by.COMPLETED || 0) + (by.FAILED || 0);
    const sec = Math.round((Date.now() - t0) / 1000);
    timeline.push({ sec, by, scored, conn, aiCalls: mock.aiCalls, ai429: mock.ai429, inFlight: mock.inFlight });
    for (const p of [25, 50, 90, 100]) if (!reached[p] && done >= COUNT * p / 100) reached[p] = sec;
    if (sec - lastPrint >= 15) {
      lastPrint = sec;
      console.log(`  t=${String(sec).padStart(4)}s  in coda/attesa=${by.PENDING || 0} in lavorazione=${by.PROCESSING || 0} completati=${by.COMPLETED || 0} falliti=${by.FAILED || 0} | con punteggio=${scored} | AI: chiamate=${mock.aiCalls} 429=${mock.ai429} in volo=${mock.inFlight} (picco ${mock.maxInFlight}) | connessioni DB=${conn} (picco ${peakConn})`);
    }
    if (done >= COUNT) { final = { by, scored, mock }; break; }
  }
  if (!final) {
    const last = timeline[timeline.length - 1];
    const mock = await (await fetch(`http://127.0.0.1:${MOCK_PORT}/stats`)).json();
    final = { by: last.by, scored: last.scored, mock, timeout: true };
  }

  const errs = await q(`select left(a."parsingError", 110) e, count(*)::int n from "Application" a join "Candidate" c on c.id = a."candidateId" where c.email like 'peak-%@example.invalid' and a."parsingError" is not null group by 1 order by 2 desc limit 3`);
  const report = {
    label: LABEL, count: COUNT, rpm: RPM, connLimit: CONN_LIMIT || null, app: path.basename(DIR),
    tempoTotaleSec: Math.round((Date.now() - t0) / 1000), tempoAl: reached, esito: final.by, conPunteggio: final.scored, timeout: !!final.timeout,
    ai: { chiamate: final.mock.aiCalls, ok: final.mock.ai200, rate429: final.mock.ai429, maxContemporanee: final.mock.maxInFlight, scaricamentiStorage: final.mock.storageDownloads },
    picchiConnessioniDB: peakConn, erroriRegistrati: errs,
  };
  fs.writeFileSync(path.join(OUT_DIR, `${LABEL}-report.json`), JSON.stringify({ report, timeline }, null, 1));
  console.log('\nRISULTATO ' + LABEL + ':\n' + JSON.stringify(report, null, 1));
  await pg.$disconnect();
  killAll();
  process.exit(0);
})().catch((e) => { console.error('ERRORE:', e.message); killAll(); process.exit(1); });
