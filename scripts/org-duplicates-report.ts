/**
 * Report (sola lettura) sulle organizzazioni duplicate create dal bug in
 * utils/authz.ts (race condition sulla creazione automatica della "org
 * personale" al primo login). Per ogni email con più organizzazioni mostra
 * quante ne ha e quanti record (job/candidati/application) contiene ciascuna,
 * così si può decidere manualmente quale consolidare.
 *
 * Uso: npx tsx scripts/org-duplicates-report.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const orgs = await prisma.organization.findMany({
    select: { id: true, name: true, createdAt: true },
    orderBy: { createdAt: 'asc' },
  });

  const groups = new Map<string, typeof orgs>();
  for (const o of orgs) {
    const key = o.name;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(o);
  }

  console.log(`\n=== Report organizzazioni duplicate ===`);
  console.log(`Totale organizzazioni: ${orgs.length}\n`);

  for (const [name, group] of groups) {
    if (group.length < 2) continue;

    console.log(`\n"${name}" — ${group.length} organizzazioni:`);
    console.log('─'.repeat(70));

    for (const org of group) {
      const [jobs, candidates, applications, memberships] = await Promise.all([
        prisma.job.count({ where: { organizationId: org.id } }),
        prisma.candidate.count({ where: { organizationId: org.id } }),
        prisma.application.count({ where: { organizationId: org.id } }),
        prisma.membership.count({ where: { organizationId: org.id } }),
      ]);

      const total = jobs + candidates + applications;
      const flag = total > 0 ? '  <-- contiene dati' : '';
      console.log(
        `  ${org.id}  [${org.createdAt.toISOString()}]  jobs=${jobs} candidati=${candidates} candidature=${applications} membri=${memberships}${flag}`
      );
    }
  }

  console.log('\n' + '─'.repeat(70));
  console.log('Nessuna modifica è stata effettuata: questo script è sola lettura.');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
