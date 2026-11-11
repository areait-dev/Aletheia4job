/**
 * Backup locale dei file dei bucket Supabase Storage (sola lettura).
 * Scarica ricorsivamente tutti i file, mantenendo la struttura di cartelle, e
 * verifica la dimensione di ogni file scaricato. Non modifica nulla su Supabase.
 *
 * Uso:
 *   npx tsx scripts/maintenance/storage-download-buckets.ts <cartella-destinazione> [--bucket=cvs,candidates]
 */
import 'dotenv/config';
import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import fs from 'node:fs';
import path from 'node:path';

config({ path: '.env.local' });

const PAGE = 1000;

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Imposta NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY.');
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

type Entry = { path: string; size: number | null };

async function listAll(supabase: ReturnType<typeof getServiceClient>, bucket: string): Promise<Entry[]> {
  const out: Entry[] = [];
  async function walk(prefix: string) {
    for (let offset = 0; ; offset += PAGE) {
      const { data, error } = await supabase.storage.from(bucket).list(prefix, {
        limit: PAGE, offset, sortBy: { column: 'name', order: 'asc' },
      });
      if (error) throw new Error(`list("${prefix}") su ${bucket}: ${error.message}`);
      if (!data || data.length === 0) break;
      for (const e of data) {
        const full = prefix ? `${prefix}/${e.name}` : e.name;
        if (e.id === null) await walk(full);
        else out.push({ path: full, size: (e.metadata as { size?: number } | null)?.size ?? null });
      }
      if (data.length < PAGE) break;
    }
  }
  await walk('');
  return out;
}

async function main() {
  const dest = process.argv[2];
  if (!dest || dest.startsWith('--')) throw new Error('Indica la cartella di destinazione come primo argomento.');
  const bucketArg = process.argv.find((a) => a.startsWith('--bucket='))?.split('=')[1];
  const buckets = bucketArg ? bucketArg.split(',') : ['cvs', 'candidates'];
  const supabase = getServiceClient();

  let failures = 0;
  for (const bucket of buckets) {
    const files = await listAll(supabase, bucket);
    console.log(`[${bucket}] ${files.length} file da scaricare`);
    let ok = 0, bytes = 0;
    for (const f of files) {
      const target = path.join(dest, bucket, ...f.path.split('/'));
      fs.mkdirSync(path.dirname(target), { recursive: true });
      const { data, error } = await supabase.storage.from(bucket).download(f.path);
      if (error || !data) { failures++; console.error(`  ERRORE ${f.path}: ${error?.message}`); continue; }
      const buf = Buffer.from(await data.arrayBuffer());
      if (f.size !== null && buf.length !== f.size) { failures++; console.error(`  DIMENSIONE DIVERSA ${f.path}: ${buf.length} != ${f.size}`); continue; }
      fs.writeFileSync(target, buf);
      ok++; bytes += buf.length;
    }
    console.log(`[${bucket}] scaricati ${ok}/${files.length} (${(bytes / 1048576).toFixed(1)} MB)`);
  }
  if (failures > 0) { console.error(`${failures} file con problemi`); process.exit(1); }
}

main().catch((e) => { console.error(e.message); process.exit(1); });
