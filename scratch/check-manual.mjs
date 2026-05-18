import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
async function main() {
  const manual = await prisma.candidate.findMany({
    where: { organizationId: "376e034e-8cf5-47b2-bd2a-2eeb81f97493" },
    orderBy: { createdAt: "desc" },
    select: { id: true, firstName: true, lastName: true, email: true, role: true, source: true },
  });
  console.log("Manual candidates:", JSON.stringify(manual, null, 2));
  await prisma.$disconnect();
}
main().catch(e => { console.error(e); process.exit(1); });
