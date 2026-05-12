const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const sectors = await prisma.candidate.groupBy({
    by: ['sector'],
    _count: {
      id: true,
    },
  });
  
  console.log('Conteggio per settore:');
  console.table(sectors.map(s => ({ settore: s.sector, conteggio: s._count.id })));
  
  const totalCount = await prisma.candidate.count();
  console.log(`\nTotale candidati nel database: ${totalCount}`);
  
  const itCandidates = await prisma.candidate.findMany({
    where: { sector: 'IT' },
  });
  console.log(`Candidati totali nel settore 'IT': ${itCandidates.length}`);
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
