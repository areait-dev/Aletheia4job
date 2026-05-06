/**
 * Database Seed Script for job-tracker
 *
 * This script migrates data from CSV files to PostgreSQL database.
 *
 * Migration Status: ✅ IN PROGRESS (December 21, 2025)
 * - Migrating Job data from NeonDB/Supabase to Hetzner VPS PostgreSQL database
 *
 * Usage:
 *   npm run db:seed
 *
 * Note: This script uses upsert, so it's safe to run multiple times.
 * It will update existing records or create new ones.
 */

import { PrismaClient } from "@prisma/client";
import { parse } from "csv-parse/sync";
import * as fs from "fs";
import * as path from "path";

const prisma = new PrismaClient();

// CSV file paths (update these to match your actual paths)
const CSV_DIR = "/Users/arnob_t78/Papers/Project Doc/db-migration/jobify";

interface JobRow {
  id: string;
  clerkId: string;
  createdAt: string;
  updatedAt: string;
  position: string;
  company: string;
  location: string;
  status: string;
  mode: string;
}

async function parseCSV<T>(filePath: string): Promise<T[]> {
  if (!fs.existsSync(filePath)) {
    console.warn(`⚠️  CSV file not found: ${filePath}`);
    return [];
  }

  const content = fs.readFileSync(filePath, "utf-8");
  if (!content.trim() || content.trim().split("\n").length <= 1) {
    console.warn(`⚠️  CSV file is empty: ${filePath}`);
    return [];
  }

  const records = parse(content, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  });
  return records as T[];
}

async function seedJobs() {
  console.log("🌱 Seeding jobs...");
  const jobs = await parseCSV<JobRow>(path.join(CSV_DIR, "Job.csv"));

  if (jobs.length === 0) {
    console.log("⚠️  No jobs to seed");
    return;
  }

  for (const job of jobs) {
    try {
      await prisma.job.upsert({
        where: { id: job.id },
        update: {
          clerkId: job.clerkId,
          position: job.position,
          company: job.company,
          location: job.location,
          status: job.status,
          mode: job.mode,
          createdAt: new Date(job.createdAt),
          updatedAt: new Date(job.updatedAt),
        },
        create: {
          id: job.id,
          clerkId: job.clerkId,
          position: job.position,
          company: job.company,
          location: job.location,
          status: job.status,
          mode: job.mode,
          createdAt: new Date(job.createdAt),
          updatedAt: new Date(job.updatedAt),
        },
      });
    } catch (error) {
      console.error(`❌ Error seeding job ${job.id}:`, error);
    }
  }
  console.log(`✅ Seeded ${jobs.length} jobs`);
}

async function main() {
  console.log("🚀 Starting database seed...\n");

  try {
    // Seed jobs (only model with data)
    await seedJobs();

    console.log("\n✨ Database seeded successfully!");
  } catch (error) {
    console.error("❌ Error seeding database:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

