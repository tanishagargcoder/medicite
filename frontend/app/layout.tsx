import type { Metadata } from "next";
import { Manrope } from "next/font/google";
import "./globals.css";

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-manrope",
  display: "swap",
});

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://medicite.vercel.app";
const DESCRIPTION =
  "Upload a medical report and ask questions in plain English. MediCite gives answers grounded in your document with clickable page-level citations — no guessing.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "MediCite — Understand your medical reports with AI",
    template: "%s · MediCite",
  },
  description: DESCRIPTION,
  applicationName: "MediCite",
  keywords: [
    "understand medical report",
    "medical report explained",
    "check medical report online",
    "ask questions about medical records",
    "AI medical document reader",
    "discharge summary explained",
    "lab report analyzer",
    "RAG document Q&A",
    "medical document intelligence",
  ],
  authors: [{ name: "Tanisha Garg" }],
  creator: "Tanisha Garg",
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    url: SITE_URL,
    siteName: "MediCite",
    title: "MediCite — Understand your medical reports with AI",
    description: DESCRIPTION,
  },
  twitter: {
    card: "summary_large_image",
    title: "MediCite — Understand your medical reports with AI",
    description: DESCRIPTION,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large" },
  },
  // Set NEXT_PUBLIC_GOOGLE_VERIFICATION to the token Search Console gives you
  // during the "HTML tag" verification step.
  verification: process.env.NEXT_PUBLIC_GOOGLE_VERIFICATION
    ? { google: process.env.NEXT_PUBLIC_GOOGLE_VERIFICATION }
    : undefined,
  category: "health",
};

// Structured data helps search engines understand what MediCite is.
const jsonLd = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: "MediCite",
  applicationCategory: "HealthApplication",
  operatingSystem: "Web",
  url: SITE_URL,
  description: DESCRIPTION,
  offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={manrope.variable}>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
