import prisma from '../utils/db';

async function main() {
  const jobs = await prisma.job.findMany({
    include: { _count: { select: { applications: true } } }
  });
  console.log('--- JOBS WITH COUNTS ---');
  console.log(jobs.map(j => ({ title: j.title, count: j._count.applications })));

  const applications = await prisma.application.findMany({
    include: {
      candidate: { select: { firstName: true, lastName: true, email: true } },
      job: { select: { title: true } }
    }
  });
  console.log('--- APPLICATIONS ---');
  console.log(applications.map(a => ({
    candidate: `${a.candidate.firstName} ${a.candidate.lastName}`,
    job: a.job.title
  })));
}

main().catch(console.error);
