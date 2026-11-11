/**
 * Prova di carico: genera candidati finti SOLO nel database di staging.
 *
 *   npx tsx scripts/loadtest/seed-candidates.ts --confirm-host=<host-staging> [--count=20000]
 *   npx tsx scripts/loadtest/seed-candidates.ts --confirm-host=<host-staging> --purge
 *
 * Sicurezza:
 * - legge SOLO STAGING_DATABASE_URL (mai DATABASE_URL), da un file .env.staging fuori dal repo
 *   indicato con STAGING_ENV_FILE oppure dall'ambiente;
 * - rifiuta di partire se l'host coincide con quello di DATABASE_URL (produzione) o non coincide
 *   con --confirm-host;
 * - tutti i dati usano email @example.invalid e organizzazioni "LOADTEST-*": --purge li cancella;
 * - nessun file reale nello Storage (cvUrl nullo o percorso fittizio).
 */
import { readFileSync, existsSync } from 'node:fs';
import { PrismaClient } from '@prisma/client';

function loadEnvFile(path?: string) {
  if (!path || !existsSync(path)) return;
  for (const line of readFileSync(path, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*"?([^"]*)"?\s*$/);
    if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2];
  }
}

function hostOf(url: string | undefined) {
  try {
    return url ? new URL(url).hostname : '';
  } catch {
    return '';
  }
}

const arg = (name: string) => process.argv.find((a) => a.startsWith(`--${name}=`))?.split('=')[1];
const flag = (name: string) => process.argv.includes(`--${name}`);

// Produzione: letta solo per RIFIUTARE, mai per connettersi.
const prodHost = hostOf(process.env.DATABASE_URL);
loadEnvFile(process.env.STAGING_ENV_FILE);
const stagingUrl = process.env.STAGING_DATABASE_URL;
const stagingHost = hostOf(stagingUrl);
const confirm = arg('confirm-host');

if (!stagingUrl || !stagingHost) throw new Error('STAGING_DATABASE_URL mancante o non valida.');
if (confirm !== stagingHost) throw new Error(`--confirm-host deve essere esattamente "${stagingHost}".`);
if (!prodHost) throw new Error('RIFIUTATO: DATABASE_URL (produzione) non disponibile per il confronto; guardia non verificabile.');
if (stagingHost === prodHost) throw new Error('RIFIUTATO: l\'host di staging coincide con quello di produzione.');
// Il pooler condivide host tra progetti diversi solo in parte: controllo anche il project ref.
const ref = (u: string) => u.match(/postgres\.([a-z0-9]+)[:@]|db\.([a-z0-9]+)\.supabase/i)?.slice(1).find(Boolean);
const prodRef = process.env.DATABASE_URL ? ref(process.env.DATABASE_URL) : undefined;
if (!prodRef || prodRef === ref(stagingUrl)) throw new Error('RIFIUTATO: stesso progetto Supabase di produzione.');

const prisma = new PrismaClient({ datasourceUrl: stagingUrl });

// --- generatori deterministici (seed fisso: prove ripetibili) ---
let s = 123456789;
const rnd = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 2 ** 32);
const pick = <T,>(a: T[]) => a[Math.floor(rnd() * a.length)];
const NOMI = ['Marco', 'Giulia', 'Luca', 'Sara', 'Andrea', 'Chiara', 'Matteo', 'Elena', 'Davide', 'Martina', 'Paolo', 'Francesca', 'Simone', 'Valentina', 'Alessio'];
const COGNOMI = ['Rossi', 'Russo', 'Ferrari', 'Esposito', 'Bianchi', 'Romano', 'Colombo', 'Ricci', 'Marino', 'Greco', 'Bruno', 'Gallo', 'Conti', 'De Luca', 'Costa'];
const CITTA = ['Milano', 'Roma', 'Torino', 'Napoli', 'Bologna', 'Firenze', 'Bari', 'Palermo', 'Verona', 'Padova', 'Genova', 'Cagliari'];
const SETTORI = ['Scuola', 'IT', 'Sanità', 'Logistica', 'Commercio', 'Ristorazione', 'Edilizia', 'Amministrazione', 'Marketing', 'Industria'];
const RUOLI = ['Docente', 'Sviluppatore', 'Infermiere', 'Magazziniere', 'Commesso', 'Cuoco', 'Geometra', 'Impiegato amministrativo', 'Addetto marketing', 'Operaio specializzato'];
const SENIORITY = ['Junior', 'Mid', 'Senior'];
const STATI = ['Nuovo', 'Nuovo', 'Nuovo', 'In valutazione', 'Colloquio', 'Offerta', 'Scartato', 'Assunto'];
const SKILL = ['Excel', 'Inglese', 'Word', 'Gestione clienti', 'SQL', 'Python', 'Patente B', 'Problem solving', 'Lavoro in team', 'Contabilità', 'Didattica', 'CRM', 'Logistica', 'Sicurezza sul lavoro'];
const PAROLE = 'esperienza lavoro responsabile gestione cliente progetto team obiettivi risultati formazione competenze azienda attività sviluppo analisi supporto coordinamento processi qualità'.split(' ');

function resumeText() {
  // lunghezza realistica: mediana ~4.500, coda lunga fino a ~20.000 (dati reali: media 7.000, p95 18.000)
  const len = Math.min(20000, Math.round(1200 + Math.exp(rnd() * 3.2) * 600 * (0.5 + rnd())));
  const out: string[] = [];
  let n = 0;
  while (n < len) {
    const w = pick(PAROLE);
    out.push(w);
    n += w.length + 1;
  }
  return out.join(' ');
}

// distribuzione disuguale: una org grande, le altre via via più piccole
const QUOTE = [0.5, 0.18, 0.1, 0.08, 0.06, 0.04, 0.025, 0.015];

async function purge() {
  const orgs = await prisma.organization.findMany({ where: { name: { startsWith: 'LOADTEST-' } }, select: { id: true } });
  const ids = orgs.map((o) => o.id);
  const c = await prisma.candidate.deleteMany({ where: { organizationId: { in: ids } } });
  const j = await prisma.job.deleteMany({ where: { organizationId: { in: ids } } });
  const o = await prisma.organization.deleteMany({ where: { id: { in: ids } } });
  console.log(`Eliminati: ${c.count} candidati, ${j.count} annunci, ${o.count} organizzazioni LOADTEST-*.`);
}

async function main() {
  console.log(`Staging: ${stagingHost}`);
  if (flag('purge')) return purge();

  const count = Number(arg('count') ?? 20000);
  const orgs: { id: string; name: string }[] = [];
  for (let i = 0; i < QUOTE.length; i++) {
    const name = `LOADTEST-${i + 1}`;
    orgs.push(
      (await prisma.organization.findFirst({ where: { name } })) ??
        (await prisma.organization.create({ data: { name } })),
    );
  }

  // annunci per ogni org (career page / feed / matching)
  for (const org of orgs) {
    if (await prisma.job.count({ where: { organizationId: org.id } })) continue;
    await prisma.job.createMany({
      data: Array.from({ length: 40 }, (_, k) => ({
        userId: 'loadtest-user',
        organizationId: org.id,
        title: `${pick(RUOLI)} ${k + 1}`,
        company: org.name,
        location: pick(CITTA),
        city: pick(CITTA),
        description: 'Annuncio di prova per la prova di carico. '.repeat(20),
        requirements: pick(SKILL) + ', ' + pick(SKILL),
        sector: pick(SETTORI),
        mode: pick(['In sede', 'Ibrido', 'Remoto']),
        status: pick(['Aperto', 'Aperto', 'Chiuso']),
        isActive: rnd() > 0.2,
      })),
    });
  }

  let created = 0;
  const BATCH = 1000;
  for (let oi = 0; oi < orgs.length; oi++) {
    const target = Math.round(count * QUOTE[oi]);
    for (let done = 0; done < target; done += BATCH) {
      const n = Math.min(BATCH, target - done);
      const rows = Array.from({ length: n }, (_, k) => {
        const idx = done + k;
        const nome = pick(NOMI);
        const cognome = pick(COGNOMI);
        const sector = pick(SETTORI);
        return {
          firstName: nome,
          lastName: cognome,
          email: `${nome}.${cognome}.${oi + 1}.${idx}@example.invalid`.toLowerCase().replace(/\s/g, ''),
          phone: `3${Math.floor(rnd() * 1e9).toString().padStart(9, '0')}`,
          city: pick(CITTA),
          role: pick(RUOLI),
          seniority: pick(SENIORITY),
          sector,
          expectedSalary: rnd() > 0.4 ? 18000 + Math.floor(rnd() * 40000) : null,
          skills: Array.from({ length: 3 + Math.floor(rnd() * 5) }, () => pick(SKILL)).join(', '),
          status: pick(STATI),
          cvUrl: rnd() > 0.15 ? `${orgs[oi].id}/loadtest-${oi}-${idx}.pdf` : null, // percorso fittizio, nessun file
          education: pick(['Diploma', 'Laurea triennale', 'Laurea magistrale', 'Master']),
          organizationId: orgs[oi].id,
          userId: 'loadtest-user',
          source: pick(['Diretto', 'Spontanea', 'Annuncio', 'Long List']),
          resumeText: resumeText(),
          matchingScore: rnd() > 0.5 ? Math.floor(rnd() * 100) : null,
          createdAt: new Date(Date.now() - Math.floor(rnd() * 2 * 365 * 864e5)),
        };
      });
      const r = await prisma.candidate.createMany({ data: rows, skipDuplicates: true });
      created += r.count;
      process.stdout.write(`\r${created}/${count} candidati`);
    }
  }
  console.log(`\nFatto: ${created} candidati su ${orgs.length} organizzazioni. Nessun file creato nello Storage.`);
}

main()
  .catch((e) => {
    console.error(e.message ?? e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
