import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  const job = await prisma.job.findUnique({
    where: { id: "ce37f7bd-28c9-40ee-a370-6213dae8580a" },
    select: { id: true, title: true, organizationId: true, userId: true }
  });
  console.log("Job:", JSON.stringify(job, null, 2));

  if (!job) {
    console.log("Job not found, checking all jobs...");
    const allJobs = await prisma.job.findMany({ take: 5, select: { id: true, title: true, status: true } });
    console.log("All jobs:", JSON.stringify(allJobs, null, 2));
    return;
  }

  const org = await prisma.organization.findUnique({ where: { id: job.organizationId }, select: { id: true, name: true } });
  console.log("Org:", JSON.stringify(org, null, 2));

  const candidates = await prisma.candidate.findMany({
    where: { organizationId: job.organizationId },
    take: 10,
    orderBy: { createdAt: 'desc' },
    select: { id: true, firstName: true, lastName: true, email: true, createdAt: true, role: true }
  });
  console.log("Recent candidates:", JSON.stringify(candidates, null, 2));

  const apps = await prisma.application.findMany({
    where: { jobId: job.id },
    include: { candidate: { select: { firstName: true, lastName: true, email: true } } },
    orderBy: { createdAt: 'desc' }
  });
  console.log("Applications for this job:", JSON.stringify(apps, null, 2));

  await prisma.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
