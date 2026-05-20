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

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL || "https://jobify-tracker.vercel.app"
  ),
  title: {
    default:
      "Job Aletheia | Modern Job Application Tracker - Organize Your Job Search",
    template: "%s | Job Aletheia - Job Application Tracker",
  },
  description:
    "Job Aletheia is a full-featured, modern job application tracking app for job seekers. Built with Next.js 14+, TypeScript, Clerk authentication, Prisma ORM, React Query, and PostgreSQL. Track your job applications, analyze your progress with charts and statistics, export your data, and manage your job search journey efficiently with a beautiful, responsive dashboard. Free, open-source, and production-ready.",
  keywords: [
    "job tracker",
    "job application tracker",
    "job search tracker",
    "job application management",
    "career tracker",
    "job hunt organizer",
    "Next.js",
    "Next.js 14",
    "TypeScript",
    "React",
    "PostgreSQL",
    "Prisma ORM",
    "React Query",
    "TanStack Query",
    "shadcn/ui",
    "Tailwind CSS",
    "React Hook Form",
    "Zod validation",
    "Recharts",
    "job dashboard",
    "job analytics",
    "job statistics",
    "job search analytics",
    "job application export",
    "CSV export",
    "Excel export",
    "job search management",
    "career management",
    "dark mode",
    "responsive design",
    "mobile-friendly",
    "modern UI",
    "beautiful dashboard",
    "full stack",
    "full-stack application",
    "open source",
    "learning project",
    "portfolio project",
    "TypeScript project",
    "Next.js tutorial",
    "job seeker",
    "career development",
    "job hunting",
    "application tracking",
    "interview tracking",
  ],
  authors: [
    {
      name: "Arnob Mahmud",
      url: "https://arnob-mahmud.vercel.app/",
    },
  ],
  creator: "Arnob Mahmud",
  applicationName: "Job Aletheia",
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
    locale: "en_US",
    url: "https://jobify-tracker.vercel.app",
    siteName: "Job Aletheia - Job Application Tracker",
    title: "Job Aletheia | Modern Job Application Tracker - Organize Your Job Search",
    description:
      "Track your job applications, analyze your progress with charts and statistics, and manage your job search journey efficiently. Built with Next.js 14+, TypeScript, Prisma, React Query, and PostgreSQL. Free, open-source, and production-ready.",
    images: [
      {
        url: "/main.svg",
        width: 1200,
        height: 630,
        alt: "Job Aletheia - Modern Job Application Tracking Dashboard",
        type: "image/svg+xml",
      },
      {
        url: "/logo.svg",
        width: 800,
        height: 600,
        alt: "Job Aletheia Logo",
        type: "image/svg+xml",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Job Aletheia | Modern Job Application Tracker",
    description:
      "Track your job applications, analyze your progress, and manage your job search journey efficiently. Built with Next.js 14+, TypeScript, Prisma, React Query, and PostgreSQL.",
    creator: "@arnob_t78",
    site: "@arnob_t78",
    images: [
      {
        url: "/main.svg",
        width: 1200,
        height: 630,
        alt: "Job Aletheia - Modern Job Application Tracking Dashboard",
      },
    ],
  },
  alternates: {
    canonical: "https://jobify-tracker.vercel.app",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="font-sans" suppressHydrationWarning>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
