import { MetadataRoute } from "next";
import { getPublicJobsAction, getPublicJobSlugMapAction } from "@/utils/actions";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://aletheia4job.it";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
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
