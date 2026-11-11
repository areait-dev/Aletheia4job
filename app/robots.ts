import { MetadataRoute } from "next";
import { headers } from "next/headers";

// Vedi commento in app/sitemap.ts: preferisce l'host reale della richiesta
// a NEXT_PUBLIC_SITE_URL, che su Vercel puo' essere mal configurato.
function getSiteUrl(): string {
  const host = headers().get("host");
  if (host && !host.includes("localhost")) {
    return `https://${host}`;
  }
  return process.env.NEXT_PUBLIC_SITE_URL || "https://aletheia4job.it";
}

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/offerte-di-lavoro"],
        disallow: [
          "/dashboard",
          "/selezione",
          "/statistiche",
          "/posizioni",
          "/nuovo-candidato",
          "/calendario",
          "/amministrazione",
          "/dipendenti",
          "/presenze",
          "/documenti",
          "/inserimento",
          "/valutazioni",
          "/login",
          "/sign-in",
          "/sign-up",
          "/invito",
          "/api",
        ],
      },
    ],
    sitemap: `${getSiteUrl()}/sitemap.xml`,
  };
}
