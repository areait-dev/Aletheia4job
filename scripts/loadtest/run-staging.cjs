// Esegue un comando con le variabili di staging caricate da .env.staging (senza stamparle).
const fs = require('fs'), { spawnSync } = require('child_process');
const rd = (f) => { const o = {}; for (const l of fs.readFileSync(f, 'utf8').split(/\r?\n/)) { const m = l.match(/^\s*([A-Z0-9_]+)\s*=\s*"?([^"]*)"?\s*$/); if (m) o[m[1]] = m[2]; } return o; };
const st = rd(process.env.STAGING_ENV_FILE || '.env.staging'), pr = fs.existsSync('.env') ? rd('.env') : {};
const direct = new URL(st.STAGING_DATABASE_URL); direct.port = '5432'; direct.search = '';
const env = { ...process.env, DATABASE_URL: pr.DATABASE_URL, STAGING_DATABASE_URL: st.STAGING_DATABASE_URL, STAGING_DIRECT_SESSION_URL: direct.toString(), STAGING_HOST: new URL(st.STAGING_DATABASE_URL).hostname };
const [cmd, ...args] = process.argv.slice(2).map((a) => a.replace('{HOST}', env.STAGING_HOST));
// Comandi Prisma (migrate, diff...): DATABASE_URL/DIRECT_URL DEVONO essere quelli di staging, mai di produzione.
if (args.includes('prisma')) {
  if (!pr.DATABASE_URL || st.STAGING_DATABASE_URL.includes((pr.DATABASE_URL.match(/postgres\.([a-z0-9]+)/) || [])[1] || '@@')) {
    console.error('RIFIUTATO: staging uguale a produzione o produzione non verificabile.'); process.exit(1);
  }
  env.DATABASE_URL = st.STAGING_DATABASE_URL;
  env.DIRECT_URL = direct.toString();
}
const r = spawnSync(cmd, args, { env, shell: true, encoding: 'utf8' });
process.stdout.write((r.stdout + r.stderr).replace(/postgres(ql)?:\/\/[^\s"]+/g, '<url>').replace(/^.*npm warn.*\n/gim, ''));
process.exit(r.status || 0);
