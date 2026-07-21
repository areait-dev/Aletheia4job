import { MetadataRoute } from "next";
import { getPublicJobsAction } from "@/utils/actions";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://aletheia4job.it";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const jobs = await getPublicJobsAction();

  const jobEntries: MetadataRoute.Sitemap = jobs.map((job) => ({
    url: `${siteUrl}/offerte-di-lavoro/${job.id}`,
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
