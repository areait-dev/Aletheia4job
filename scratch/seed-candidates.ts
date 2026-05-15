import prisma from '../utils/db';

async function main() {
  const organization = await prisma.organization.findFirst();
  const user = await prisma.membership.findFirst();
  const job = await prisma.job.findFirst({
    where: { title: 'Sviluppatore Backend Node.js' }
  });

  if (!organization || !user || !job) {
    console.error('Missing required data');
    return;
  }

  const candidatesData = [
    {
      firstName: 'Marco',
      lastName: 'Rossi',
      email: 'marco.rossi.test@example.com',
      city: 'Milano',
      role: 'Backend Dev',
      seniority: 'Senior',
      sector: 'IT',
      status: 'Nuovo',
      organizationId: organization.id,
      userId: user.userId,
      source: 'Test AI',
    },
    {
      firstName: 'Giulia',
      lastName: 'Bianchi',
      email: 'giulia.bianchi.test@example.com',
      city: 'Roma',
      role: 'Node.js Developer',
      seniority: 'Mid',
      sector: 'IT',
      status: 'Nuovo',
      organizationId: organization.id,
      userId: user.userId,
      source: 'Test AI',
    }
  ];

  for (const data of candidatesData) {
    const candidate = await prisma.candidate.create({ data });
    await prisma.application.create({
      data: {
        candidateId: candidate.id,
        jobId: job.id,
        organizationId: organization.id,
        status: 'Nuovo'
      }
    });
    console.log(`Created candidate ${data.firstName} and linked to job ${job.title}`);
  }
}

main().catch(console.error);
