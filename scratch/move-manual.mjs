import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
async function main() {
  const result = await prisma.candidate.updateMany({
    where: { organizationId: "376e034e-8cf5-47b2-bd2a-2eeb81f97493" },
    data: { organizationId: "org_prod_123" },
  });
  console.log(`Spostati ${result.count} candidati`);

  const updated = await prisma.candidate.findMany({
    where: { organizationId: "org_prod_123" },
    orderBy: { createdAt: "desc" },
    select: { firstName: true, lastName: true, email: true, role: true, source: true, organizationId: true },
  });
  console.log("Candidati in org_prod_123:", JSON.stringify(updated, null, 2));
  await prisma.$disconnect();
}
main().catch(e => { console.error(e); process.exit(1); });
