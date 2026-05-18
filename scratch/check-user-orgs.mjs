import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
async function main() {
  const memberships = await prisma.membership.findMany({
    where: { userId: "1b45fd11-73f8-4e0f-97e2-d177ca504e72" },
    orderBy: { createdAt: "asc" },
    include: { organization: { select: { name: true } } },
  });
  console.log("Memberships:", JSON.stringify(memberships, null, 2));
  console.log("\nFirst membership returned by getAuthContext:", memberships[0]?.organizationId);
  await prisma.$disconnect();
}
main().catch(e => { console.error(e); process.exit(1); });
