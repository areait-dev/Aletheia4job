/**
 * Verifica (SOLA LETTURA) che il bucket pubblico `logos` contenga solo immagini:
 * per ogni oggetto controlla estensione e firma del file (magic bytes). Segnala PDF/Office/altro.
 *   npx tsx scripts/maintenance/storage-audit-logos.ts [bucket]
 * Esce con codice 1 se trova qualcosa che non è un'immagine.
 */
import 'dotenv/config';
import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { listBucketObjects } from './lib-storage-list';
import { detectImageType } from '../../utils/imageSignature';

config({ path: '.env.local' });

async function main() {
  const bucket = process.argv[2] ?? 'logos';
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Imposta NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY.');
  const supabase = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });

  const { data: b } = await supabase.storage.getBucket(bucket);
  console.log(`Bucket ${bucket}: ${b?.public ? 'PUBBLICO' : 'privato'}`);
  const objs = await listBucketObjects(supabase, bucket);
  console.log(`${objs.length} oggetti`);
  const bad: string[] = [];
  const byType: Record<string, number> = {};
  for (const o of objs) {
    if (o.path.endsWith('.keep') || o.path.endsWith('.emptyFolderPlaceholder')) continue;
    const { data, error } = await supabase.storage.from(bucket).download(o.path);
    if (error || !data) { bad.push(`${o.path}: non scaricabile (${error?.message})`); continue; }
    const buf = Buffer.from(await data.arrayBuffer());
    const t = detectImageType(buf);
    byType[t ?? 'NON_IMMAGINE'] = (byType[t ?? 'NON_IMMAGINE'] ?? 0) + 1;
    if (!t) bad.push(`${o.path}: non è un'immagine riconosciuta (${buf.length} byte)`);
  }
  console.log('Per tipo:', JSON.stringify(byType));
  if (bad.length) { console.error(`PROBLEMI (${bad.length}):\n  ` + bad.join('\n  ')); process.exit(1); }
  console.log('OK: solo immagini.');
}
main().catch((e) => { console.error(e.message ?? e); process.exit(1); });
