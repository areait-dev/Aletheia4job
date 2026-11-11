/**
 * Imposta i limiti dei bucket di Storage (ripetibile).
 *   cvs   : privato, max 10 MB, solo PDF / DOC / DOCX
 *   logos : pubblico, max 5 MB, solo immagini
 *
 *   npx tsx scripts/maintenance/storage-configure-buckets.ts           # prova: mostra la differenza
 *   npx tsx scripts/maintenance/storage-configure-buckets.ts --apply   # applica
 *
 * I limiti valgono per i NUOVI upload: i file già presenti non vengono toccati.
 */
import 'dotenv/config';
import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';

config({ path: '.env.local' });

const MB = 1024 * 1024;
const WANTED: Record<string, { public: boolean; fileSizeLimit: number; allowedMimeTypes: string[] }> = {
  cvs: {
    public: false,
    fileSizeLimit: 10 * MB,
    allowedMimeTypes: [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ],
  },
  logos: {
    public: true,
    fileSizeLimit: 5 * MB,
    allowedMimeTypes: ['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'],
  },
};

async function main() {
  const apply = process.argv.includes('--apply');
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Imposta NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY.');
  const supabase = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });

  const { data: buckets, error } = await supabase.storage.listBuckets();
  if (error) throw new Error(error.message);
  for (const [id, want] of Object.entries(WANTED)) {
    const cur = buckets?.find((b) => b.id === id);
    if (!cur) { console.log(`${id}: NON esiste (non creato da questo script)`); continue; }
    console.log(`${id}: ora  public=${cur.public} limite=${cur.file_size_limit ?? 'nessuno'} tipi=${cur.allowed_mime_types?.join(',') ?? 'tutti'}`);
    console.log(`${' '.repeat(id.length)}  vuoi public=${want.public} limite=${want.fileSizeLimit} tipi=${want.allowedMimeTypes.join(',')}`);
    if (apply) {
      const { error: e } = await supabase.storage.updateBucket(id, want);
      if (e) throw new Error(`updateBucket(${id}): ${e.message}`);
      console.log(`${id}: aggiornato`);
    }
  }
  if (!apply) console.log('\n(prova: nulla modificato; usa --apply)');
}
main().catch((e) => { console.error(e.message ?? e); process.exit(1); });
