import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  const memberships = await prisma.membership.findMany({
    include: { organization: { select: { id: true, name: true } } }
  });
  console.log("Memberships:", JSON.stringify(memberships, null, 2));

  const orgs = await prisma.organization.findMany();
  console.log("\nAll organizations:", JSON.stringify(orgs, null, 2));

  const jobs = await prisma.job.findMany({ select: { id: true, title: true, organizationId: true } });
  console.log("\nJobs:", JSON.stringify(jobs, null, 2));

  const candidateOrgs = await prisma.candidate.groupBy({ by: ['organizationId'], _count: true });
  console.log("\nCandidates by org:", JSON.stringify(candidateOrgs, null, 2));

  await prisma.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
