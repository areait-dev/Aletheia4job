import prisma from '../utils/db';

async function main() {
  const sectors = await prisma.candidate.groupBy({
    by: ['sector'],
    _count: { id: true }
  });
  console.log('--- SECTOR COUNTS ---');
  console.log(sectors);
}

main().catch(console.error);
