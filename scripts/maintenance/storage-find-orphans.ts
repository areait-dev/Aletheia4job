/**
 * Trova (ed eventualmente elimina) i file orfani nei bucket Supabase Storage:
 * file presenti nello Storage ma non referenziati da nessun record nel DB
 * (Candidate.cvUrl per i bucket 'cvs'/'candidates', Job.companyLogoUrl per 'logos').
 *
 * Uso:
 *   npx tsx scripts/storage-find-orphans.ts                 -> dry-run, elenca gli orfani
 *   npx tsx scripts/storage-find-orphans.ts --delete         -> elimina gli orfani trovati
 *   npx tsx scripts/storage-find-orphans.ts --bucket=cvs     -> limita a un bucket specifico
 */

import { PrismaClient } from '@prisma/client';
import { createClient } from '@supabase/supabase-js';

const prisma = new PrismaClient();

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error('Imposta NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY nell\'ambiente.');
  }
  return createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
}

const BUCKETS = ['cvs', 'candidates', 'logos'] as const;
type Bucket = (typeof BUCKETS)[number];

async function listAllFiles(supabase: ReturnType<typeof getServiceClient>, bucket: Bucket): Promise<string[]> {
  const paths: string[] = [];

  async function walk(prefix: string) {
    const { data, error } = await supabase.storage.from(bucket).list(prefix, {
      limit: 1000,
      sortBy: { column: 'name', order: 'asc' },
    });
    if (error) {
      console.error(`[${bucket}] Errore list("${prefix}"):`, error.message);
      return;
    }
    if (!data) return;

    for (const entry of data) {
      const fullPath = prefix ? `${prefix}/${entry.name}` : entry.name;
      // Le "cartelle" in Supabase Storage sono entry senza metadata/id
      const isFolder = entry.id === null;
      if (isFolder) {
        await walk(fullPath);
      } else {
        paths.push(fullPath);
      }
    }
  }

  await walk('');
  return paths;
}

function extractPathFromPublicUrl(url: string, bucket: string): string | null {
  const marker = `/storage/v1/object/public/${bucket}/`;
  const idx = url.indexOf(marker);
  if (idx === -1) return null;
  return decodeURIComponent(url.slice(idx + marker.length));
}

async function main() {
  const args = process.argv.slice(2);
  const shouldDelete = args.includes('--delete');
  const bucketArg = args.find((a) => a.startsWith('--bucket='))?.split('=')[1] as Bucket | undefined;
  const targetBuckets = bucketArg ? [bucketArg] : BUCKETS;

  const supabase = getServiceClient();

  const candidates = await prisma.candidate.findMany({
    where: { cvUrl: { not: null } },
    select: { id: true, cvUrl: true },
  });
  const jobs = await prisma.job.findMany({
    where: { companyLogoUrl: { not: null } },
    select: { id: true, companyLogoUrl: true },
  });

  console.log(`\n=== Jobify Storage Orphan Finder ===`);
  console.log(`Candidati con cvUrl: ${candidates.length} | Job con logo: ${jobs.length}\n`);

  let totalOrphans = 0;

  for (const bucket of targetBuckets) {
    console.log(`--- Bucket: ${bucket} ---`);
    const files = await listAllFiles(supabase, bucket);
    console.log(`File trovati nello storage: ${files.length}`);

    const referencedPaths = new Set<string>();
    for (const c of candidates) {
      const p = c.cvUrl ? extractPathFromPublicUrl(c.cvUrl, bucket) : null;
      if (p) referencedPaths.add(p);
    }
    for (const j of jobs) {
      const p = j.companyLogoUrl ? extractPathFromPublicUrl(j.companyLogoUrl, bucket) : null;
      if (p) referencedPaths.add(p);
    }

    const orphans = files.filter((f) => !referencedPaths.has(f));
    console.log(`File referenziati nel DB: ${referencedPaths.size}`);
    console.log(`File orfani (non referenziati): ${orphans.length}`);

    if (orphans.length > 0) {
      console.log(orphans.map((o) => `  - ${o}`).join('\n'));
    }

    if (shouldDelete && orphans.length > 0) {
      const { error } = await supabase.storage.from(bucket).remove(orphans);
      if (error) {
        console.error(`Errore durante l'eliminazione su bucket ${bucket}:`, error.message);
      } else {
        console.log(`✅ Eliminati ${orphans.length} file orfani da "${bucket}".`);
      }
    }

    totalOrphans += orphans.length;
    console.log('');
  }

  console.log('─'.repeat(60));
  if (!shouldDelete) {
    console.log(`Totale orfani trovati: ${totalOrphans}`);
    if (totalOrphans > 0) {
      console.log('Esegui con --delete per eliminarli, es:');
      console.log('  npx tsx scripts/storage-find-orphans.ts --delete');
    }
  } else {
    console.log(`Totale orfani eliminati: ${totalOrphans}`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
