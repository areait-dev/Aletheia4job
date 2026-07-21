import { MetadataRoute } from "next";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://aletheia4job.it";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/offerte-di-lavoro"],
        disallow: [
          "/dashboard",
          "/pipeline",
          "/stats",
          "/positions",
          "/add-candidate",
          "/calendar",
          "/admin",
          "/employees",
          "/attendance",
          "/documents",
          "/onboarding",
          "/performance",
          "/login",
          "/sign-in",
          "/sign-up",
          "/invite",
          "/api",
        ],
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
