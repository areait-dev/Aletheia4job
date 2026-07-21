/**
 * Root Layout Component
 *
 * This is the root layout for the entire Next.js application.
 * It wraps all pages and provides:
 * - Global metadata (SEO, Open Graph, Twitter cards)
 * - Clerk authentication provider
 * - Global providers (React Query, Theme, Toast)
 * - Global styles and fonts
 *
 * Key Concepts:
 * - Layouts in Next.js are shared UI that persist across page navigations
 * - Root layout is required and wraps all pages
 * - Metadata is used for SEO and social media sharing
 */
import type { Metadata } from "next";
import "./globals.css";
import Providers from "./providers";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://aletheia4job.it";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Offerte di Lavoro | Aletheia4Job",
    template: "%s | Aletheia4Job",
  },
  description:
    "Scopri le offerte di lavoro attive di Aletheia4Job, agenzia per il lavoro. Candidati in pochi click alle posizioni aperte nella tua zona e nel tuo settore.",
  applicationName: "Aletheia4Job",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  icons: {
    icon: [{ url: "/logo-brand.png", sizes: "any" }],
    apple: [{ url: "/logo-brand.png", type: "image/png" }],
    shortcut: "/logo-brand.png",
  },
  openGraph: {
    type: "website",
    locale: "it_IT",
    url: siteUrl,
    siteName: "Aletheia4Job",
    title: "Offerte di Lavoro | Aletheia4Job",
    description:
      "Scopri le offerte di lavoro attive di Aletheia4Job, agenzia per il lavoro. Candidati in pochi click alle posizioni aperte nella tua zona e nel tuo settore.",
    images: [
      {
        url: "/logo-brand.png",
        width: 1200,
        height: 630,
        alt: "Aletheia4Job - Offerte di Lavoro",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Offerte di Lavoro | Aletheia4Job",
    description:
      "Scopri le offerte di lavoro attive di Aletheia4Job, agenzia per il lavoro.",
    images: [
      {
        url: "/logo-brand.png",
        width: 1200,
        height: 630,
        alt: "Aletheia4Job - Offerte di Lavoro",
      },
    ],
  },
  alternates: {
    canonical: siteUrl,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="it" suppressHydrationWarning>
      <body className="font-sans" suppressHydrationWarning>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
