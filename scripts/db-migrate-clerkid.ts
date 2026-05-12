/**
 * Migrate jobs from old userId to new userId
 * Run: npx tsx scripts/db-migrate-clerkid.ts <OLD_USER_ID> <NEW_USER_ID>
 *
 * Use when you switched Clerk apps and want to reassign your old jobs
 * to your new user. Get OLD_USER_ID from db-inspect output.
 * Get NEW_USER_ID from Clerk Dashboard → Users → your user.
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const [oldUserId, newUserId] = process.argv.slice(2);

  if (!oldUserId || !newUserId) {
    console.error('\nUsage: npx tsx scripts/db-migrate-clerkid.ts <OLD_USER_ID> <NEW_USER_ID>\n');
    console.error('Run scripts/db-inspect.ts first to see userIds in the database.\n');
    process.exit(1);
  }

  const count = await prisma.job.updateMany({
    where: { userId: oldUserId },
    data: { userId: newUserId },
  });

  console.log(`\nMigrated ${count.count} job(s) from ${oldUserId} to ${newUserId}\n`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
