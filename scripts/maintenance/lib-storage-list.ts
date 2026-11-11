// Elenco ricorsivo degli oggetti di un bucket Supabase (sola lettura).
import type { SupabaseClient } from '@supabase/supabase-js';

const PAGE = 1000;

export type Obj = { bucket: string; path: string; size: number | null; createdAt: string | null; updatedAt?: string | null; etag?: string | null };

export async function listBucketObjects(supabase: SupabaseClient<any, any, any>, bucket: string): Promise<Obj[]> {
  const out: Obj[] = [];
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
        else {
          out.push({
            bucket,
            path: full,
            size: (e.metadata as { size?: number } | null)?.size ?? null,
            createdAt: e.created_at ?? null,
            updatedAt: e.updated_at ?? null,
            etag: (e.metadata as { eTag?: string } | null)?.eTag ?? null,
          });
        }
      }
      if (data.length < PAGE) break;
    }
  }
  await walk('');
  return out;
}

