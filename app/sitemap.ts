import { MetadataRoute } from "next";
import { headers } from "next/headers";
import { getPublicJobsAction, getPublicJobSlugMapAction } from "@/utils/actions";

// Deriva il dominio dalla richiesta reale invece di fidarsi solo di
// NEXT_PUBLIC_SITE_URL: se quella variabile e' mal configurata su Vercel
// (es. rimasta a localhost) la sitemap resterebbe comunque corretta.
function getSiteUrl(): string {
  const host = headers().get("host");
  if (host && !host.includes("localhost")) {
    const protocol = host.includes("localhost") ? "http" : "https";
    return `${protocol}://${host}`;
  }
  return process.env.NEXT_PUBLIC_SITE_URL || "https://aletheia4job.it";
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = getSiteUrl();
  const [jobs, slugMap] = await Promise.all([
    getPublicJobsAction(),
    getPublicJobSlugMapAction(),
  ]);
  const slugById = new Map(slugMap.map((e) => [e.id, e.slug]));

  const jobEntries: MetadataRoute.Sitemap = jobs.map((job) => ({
    url: `${siteUrl}/offerte-di-lavoro/${slugById.get(job.id) ?? job.id}`,
    lastModified: job.postedAt ?? undefined,
    changeFrequency: "daily",
    priority: 0.8,
  }));

  return [
    {
      url: siteUrl,
      lastModified: new Date(),
      changeFrequency: "hourly",
      priority: 1,
    },
    ...jobEntries,
  ];
}
