/**
 * Prepara i dati della simulazione del picco SOLO su staging: N candidati finti con la candidatura
 * (parsingStatus PENDING) a un annuncio dell'organizzazione LOADTEST-1, e stampa gli eventi
 * "cv/process.requested" da inviare. Con --cleanup elimina i dati della simulazione.
 *
 *   node scripts/loadtest/run-staging.cjs npx tsx scripts/loadtest/peak/seed-peak.ts --count=200 > eventi.json
 */
import { PrismaClient } from '@prisma/client';

const url = process.env.STAGING_DIRECT_SESSION_URL;
const prodRef = process.env.DATABASE_URL?.match(/postgres\.([a-z0-9]+)/)?.[1];
if (!url || !prodRef || url.includes(prodRef)) throw new Error('RIFIUTATO: serve il database di staging e DATABASE_URL (produzione) per il confronto.');
const prisma = new PrismaClient({ datasourceUrl: url });
const count = Number(process.argv.find((a) => a.startsWith('--count='))?.split('=')[1] ?? 200);

(async () => {
  const org = await prisma.organization.findFirst({ where: { name: 'LOADTEST-1' }, select: { id: true } });
  if (!org) throw new Error('Organizzazione LOADTEST-1 assente: lanciare prima seed-candidates.ts');
  // pulizia di eventuali dati di simulazioni precedenti
  const del = await prisma.candidate.deleteMany({ where: { organizationId: org.id, email: { startsWith: 'peak-' } } });
  if (process.argv.includes('--cleanup')) { console.error(`eliminati ${del.count} candidati di simulazione`); return; }

  const job = await prisma.job.findFirst({ where: { organizationId: org.id, status: 'Aperto' }, select: { id: true } });
  if (!job) throw new Error('Nessun annuncio aperto in LOADTEST-1');

  const events = [];
  for (let i = 0; i < count; i++) {
    const c = await prisma.candidate.create({
      data: {
        organizationId: org.id, userId: 'loadtest-user', firstName: 'Peak', lastName: `Test${i}`, email: `peak-${i}@example.invalid`,
        city: 'Milano', role: 'Da definire', seniority: 'Mid', sector: 'Da definire', status: 'Nuovo', source: 'Simulazione picco', cvUrl: `loadtest/peak-${i}.pdf`,
      },
      select: { id: true },
    });
    const a = await prisma.application.create({ data: { organizationId: org.id, candidateId: c.id, jobId: job.id, status: 'Nuovo', parsingStatus: 'PENDING' }, select: { id: true } });
    events.push({ name: 'cv/process.requested', data: { applicationId: a.id, candidateId: c.id, jobId: job.id, organizationId: org.id, cvUrl: `loadtest/peak-${i}.pdf` } });
  }
  process.stdout.write(JSON.stringify({ organizationId: org.id, events }));
})().catch((e) => { console.error(e.message ?? e); process.exit(1); }).finally(() => prisma.$disconnect());
