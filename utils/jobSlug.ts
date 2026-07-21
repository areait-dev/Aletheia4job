const UUID_RE = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function slugify(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // rimuove accenti
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

export function buildJobSlug(title: string, id: string): string {
  const base = slugify(title);
  return base ? `${base}-${id}` : id;
}

export function extractJobIdFromSlug(slug: string): string {
  const match = slug.match(UUID_RE);
  return match ? match[0] : slug;
}
