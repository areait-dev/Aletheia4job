import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
async function main() {
  const toDelete = await prisma.candidate.findMany({
    where: {
      organizationId: "org_prod_123",
      source: { not: "Diretto" },
    },
    select: { id: true, firstName: true, lastName: true, email: true, source: true },
  });

  console.log(`Trovati ${toDelete.length} candidati test da eliminare:`);
  toDelete.forEach(c => console.log(`  - ${c.firstName} ${c.lastName} (${c.email}) [${c.source}]`));

  // Delete applications first, then candidates
  for (const c of toDelete) {
    await prisma.application.deleteMany({ where: { candidateId: c.id } });
    await prisma.candidateNote.deleteMany({ where: { candidateId: c.id } });
    await prisma.interview.deleteMany({ where: { candidateId: c.id } });
  }

  const result = await prisma.candidate.deleteMany({
    where: {
      organizationId: "org_prod_123",
      source: { not: "Diretto" },
    },
  });

  console.log(`\nEliminati ${result.count} candidati test`);

  const remaining = await prisma.candidate.findMany({
    where: { organizationId: "org_prod_123" },
    select: { firstName: true, lastName: true, email: true, source: true },
  });
  console.log(`\nRimasti ${remaining.length} candidati:`);
  remaining.forEach(c => console.log(`  - ${c.firstName} ${c.lastName} (${c.email}) [${c.source}]`));

  await prisma.$disconnect();
}
main().catch(e => { console.error(e); process.exit(1); });
