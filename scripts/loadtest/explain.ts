/**
 * Misura con EXPLAIN (ANALYZE, BUFFERS) le query reali dell'app sul database di STAGING.
 *   node scripts/loadtest/run-staging.cjs npx tsx scripts/loadtest/explain.ts [--label=prima]
 * Usa solo STAGING_DIRECT_SESSION_URL (passata da run-staging.cjs): rifiuta l'host di produzione.
 */
import { PrismaClient } from '@prisma/client';

const url = process.env.STAGING_DIRECT_SESSION_URL;
if (!url) throw new Error('STAGING_DIRECT_SESSION_URL mancante.');
const prodRef = process.env.DATABASE_URL?.match(/postgres\.([a-z0-9]+)/)?.[1];
if (!prodRef) throw new Error('RIFIUTATO: DATABASE_URL (produzione) non disponibile per il confronto; guardia non verificabile.');
if (url.includes(prodRef)) throw new Error('RIFIUTATO: database di produzione.');

const prisma = new PrismaClient({ datasourceUrl: url });
const label = process.argv.find((a) => a.startsWith('--label='))?.split('=')[1] ?? 'misura';

type Q = { name: string; sql: string };

async function main() {
  await prisma.$executeRawUnsafe(`ANALYZE "Candidate"`);
  await prisma.$executeRawUnsafe(`ANALYZE "Job"`);
  const big = (await prisma.$queryRawUnsafe<{ id: string; n: bigint }[]>(
    `select "organizationId" id, count(*) n from "Candidate" group by 1 order by 2 desc limit 1`,
  ))[0];
  const small = (await prisma.$queryRawUnsafe<{ id: string }[]>(
    `select "organizationId" id from "Candidate" group by 1 order by count(*) asc limit 1`,
  ))[0];
  const O = `'${big.id}'`;
  const S = `'${small.id}'`;
  const like = (c: string, t: string) => `"${c}" ILIKE '%${t}%'`;
  const searchOr = (t: string) =>
    ['firstName', 'lastName', 'email', 'city', 'role', 'sector', 'skills'].map((c) => like(c, t)).join(' OR ');
  const cols = `"id","createdAt","updatedAt","firstName","lastName","email","phone","city","role","seniority","sector","expectedSalary","skills","status","cvUrl","notes","province","education","organizationId","userId","source","resumeText","matchingScore"`;

  const qs: Q[] = [
    { name: 'archivio: org grande, ordine data, pagina 1', sql: `select ${cols} from "Candidate" where "organizationId"=${O} order by "createdAt" desc limit 10 offset 0` },
    { name: 'archivio: org grande, pagina 500 (offset 5000)', sql: `select ${cols} from "Candidate" where "organizationId"=${O} order by "createdAt" desc limit 10 offset 5000` },
    { name: 'archivio: filtro stato + ordine', sql: `select ${cols} from "Candidate" where "organizationId"=${O} and "status"='Colloquio' order by "createdAt" desc limit 10` },
    { name: 'archivio: filtro settore (ILIKE esatto, come Prisma equals insensitive)', sql: `select ${cols} from "Candidate" where "organizationId"=${O} and "sector" ILIKE 'IT' order by "createdAt" desc limit 10` },
    { name: 'archivio: count totale org', sql: `select count(*) from "Candidate" where "organizationId"=${O}` },
    { name: 'archivio: count con filtro stato', sql: `select count(*) from "Candidate" where "organizationId"=${O} and "status"='Nuovo'` },
    { name: 'ricerca 7 colonne "mar" (org grande) pagina', sql: `select ${cols} from "Candidate" where "organizationId"=${O} and (${searchOr('mar')}) order by "createdAt" desc limit 10` },
    { name: 'ricerca 7 colonne "mar" (org grande) count', sql: `select count(*) from "Candidate" where "organizationId"=${O} and (${searchOr('mar')})` },
    { name: 'ricerca 7 colonne rara "zzqx" (nessun risultato) count', sql: `select count(*) from "Candidate" where "organizationId"=${O} and (${searchOr('zzqx')})` },
    { name: 'ricerca 7 colonne rara "zzqx" pagina (scansione completa)', sql: `select ${cols} from "Candidate" where "organizationId"=${O} and (${searchOr('zzqx')}) order by "createdAt" desc limit 10` },
    { name: 'ricerca 7 colonne "sql" (org piccola) pagina', sql: `select ${cols} from "Candidate" where "organizationId"=${S} and (${searchOr('sql')}) order by "createdAt" desc limit 10` },
    { name: 'cartelle: groupBy settore (org grande)', sql: `select "sector", count("sector") from "Candidate" where "organizationId"=${O} group by "sector" order by "sector" asc` },
    { name: 'dashboard: groupBy stato', sql: `select "status", count(*) from "Candidate" where "organizationId"=${O} group by "status"` },
    { name: 'dashboard: top 5 settori', sql: `select "sector", count(*) c from "Candidate" where "organizationId"=${O} group by "sector" order by c desc limit 5` },
    { name: 'matching offerta: 500 candidati (updatedAt desc, tutte le colonne + testo CV)', sql: `select * from "Candidate" where "organizationId"=${O} and "status" <> 'Non idoneo' order by "updatedAt" desc limit 500` },
    { name: 'matching candidato: offerte aperte org', sql: `select * from "Job" where "organizationId"=${O} and "status"='Aperto' and "isActive"=true and ("expiresAt" is null or "expiresAt" > now()) limit 300` },
    { name: 'career page / feed: annunci attivi (tutte le org)', sql: `select * from "Job" where "isActive"=true and "status"='Aperto' order by "postedAt" desc` },
  ];

  const out: { name: string; ms: number; node: string; rows: number }[] = [];
  for (const q of qs) {
    const times: number[] = [];
    let node = '';
    let rows = 0;
    for (let i = 0; i < 4; i++) {
      const r = await prisma.$queryRawUnsafe<{ 'QUERY PLAN': any }[]>(`EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) ${q.sql}`);
      const plan = r[0]['QUERY PLAN'][0];
      times.push(plan['Execution Time'] + plan['Planning Time']);
      const find = (p: any): string[] => [p['Node Type'] + (p['Index Name'] ? `(${p['Index Name']})` : ''), ...(p.Plans ?? []).flatMap(find)];
      node = find(plan.Plan).join(' > ');
      rows = plan.Plan['Actual Rows'];
    }
    times.shift(); // scarta la prima (cache fredda)
    times.sort((a, b) => a - b);
    out.push({ name: q.name, ms: Math.round(times[1] * 10) / 10, node, rows });
  }
  console.log(`\n== ${label} (staging, org grande=${big.n} candidati) ==`);
  for (const o of out) console.log(`${String(o.ms).padStart(8)} ms  ${o.ms > 200 ? '!!' : '  '} ${o.name}\n            ${o.node}`);

  // Latenza reale lato client per il matching (include trasferimento del testo CV)
  const t0 = Date.now();
  const rows = await prisma.candidate.findMany({ where: { organizationId: big.id, status: { not: 'Non idoneo' } }, orderBy: { updatedAt: 'desc' }, take: 500 });
  console.log(`\nmatching 500 candidati via Prisma (con resumeText, ${Math.round(rows.reduce((s, r) => s + (r.resumeText?.length ?? 0), 0) / 1024)} KB di testo): ${Date.now() - t0} ms`);
}

main().catch((e) => { console.error(e.message ?? e); process.exitCode = 1; }).finally(() => prisma.$disconnect());
