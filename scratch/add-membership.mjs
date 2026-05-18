import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
async function main() {
  const membership = await prisma.membership.upsert({
    where: {
      userId_organizationId: {
        userId: "1b45fd11-73f8-4e0f-97e2-d177ca504e72",
        organizationId: "org_prod_123",
      },
    },
    update: { role: "OWNER" },
    create: {
      userId: "1b45fd11-73f8-4e0f-97e2-d177ca504e72",
      organizationId: "org_prod_123",
      role: "OWNER",
    },
  });
  console.log("Membership:", JSON.stringify(membership, null, 2));
  await prisma.$disconnect();
}
main().catch(e => { console.error(e); process.exit(1); });
