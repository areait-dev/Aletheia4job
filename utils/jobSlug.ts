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
// Se due annunci hanno lo stesso titolo, si disambigua con la sede
// (es. "pizzaiolo-milano"); se anche titolo+sede coincidono, si aggiunge
// infine un numero progressivo per garantire comunque l'unicita'.
export function buildJobSlugMap(jobs: { id: string; title: string; location?: string | null }[]): JobSlugEntry[] {
  const titleCount = new Map<string, number>();
  for (const job of jobs) {
    const base = slugify(job.title);
    titleCount.set(base, (titleCount.get(base) ?? 0) + 1);
  }

  const usedSlugs = new Set<string>();
  return jobs.map((job) => {
    const base = slugify(job.title);
    let slug = base;

    if ((titleCount.get(base) ?? 0) > 1) {
      const location = job.location ? slugify(job.location) : '';
      slug = location ? `${base}-${location}` : base;
    }

    if (usedSlugs.has(slug)) {
      let n = 2;
      while (usedSlugs.has(`${slug}-${n}`)) n++;
      slug = `${slug}-${n}`;
    }

    usedSlugs.add(slug);
    return { id: job.id, slug };
  });
}
