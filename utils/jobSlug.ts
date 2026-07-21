export function slugify(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // rimuove accenti
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || 'annuncio';
}

const UUID_RE = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Estrae un uuid da vecchi formati di slug (id nudo, o "titolo-<uuid>")
// per mantenere compatibili i link gia' condivisi prima dell'introduzione
// degli slug basati sul solo titolo.
export function extractJobIdFromSlug(slug: string): string {
  const match = slug.match(UUID_RE);
  return match ? match[0] : slug;
}

export type JobSlugEntry = { id: string; slug: string };

// jobs deve arrivare gia' ordinato in modo stabile (es. per data di pubblicazione)
// cosi' che, a parita' di titolo, lo stesso annuncio riceva sempre lo stesso slug.
export function buildJobSlugMap(jobs: { id: string; title: string }[]): JobSlugEntry[] {
  const used = new Map<string, number>();
  return jobs.map((job) => {
    const base = slugify(job.title);
    const count = used.get(base) ?? 0;
    used.set(base, count + 1);
    return { id: job.id, slug: count === 0 ? base : `${base}-${count + 1}` };
  });
}
