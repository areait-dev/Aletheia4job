import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const stats = await prisma.candidate.groupBy({
    by: ['status'],
    _count: {
      status: true,
    },
  });
  console.log('--- DB STATS ---');
  console.log(JSON.stringify(stats, null, 2));
  console.log('--- END DB STATS ---');
}

main()
  .catch((e) => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
