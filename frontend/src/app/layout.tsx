import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { JsonLd } from "./schema";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const SITE_URL = "https://agentsentry.org";
const TITLE    = "AgentSentry — NHI & AI Agent Risk Auditor";
const DESC     =
  "AgentSentry is an open-source CLI that discovers every Non-Human Identity (NHI) and AI agent across AWS, Azure, GCP, GitHub, and Kubernetes, scores their blast radius, and surfaces the exact permissions to revoke. Free to use.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default:  TITLE,
    template: "%s | AgentSentry",
  },
  description: DESC,
  keywords: [
    "AgentSentry",
    "non-human identity security",
    "NHI audit",
    "AI agent security",
    "cloud IAM audit",
    "AWS IAM scanner",
    "Kubernetes secret scanner",
    "attack graph",
    "least privilege",
    "open source cloud security",
  ],
  authors:   [{ name: "Abhiram Lanka", url: SITE_URL }],
  creator:   "Abhiram Lanka",
  publisher: "AgentSentry",
  category:  "cybersecurity",

  // ── Canonical + alternate ─────────────────────────────────────────────────
  alternates: {
    canonical: SITE_URL,
  },

  // ── Open Graph (navigational + informational snippets) ────────────────────
  openGraph: {
    type:        "website",
    url:          SITE_URL,
    siteName:    "AgentSentry",
    title:        TITLE,
    description: DESC,
    images: [
      {
        url:    "/og-image",
        width:   1200,
        height:  630,
        alt:    "AgentSentry — NHI & AI Agent Risk Auditor",
      },
    ],
  },

  // ── Twitter / X card ─────────────────────────────────────────────────────
  twitter: {
    card:        "summary_large_image",
    site:        "@agentsentry",
    creator:     "@AbhiramLanka",
    title:        TITLE,
    description: DESC,
    images:      ["/og-image"],
  },

  // ── Robots ────────────────────────────────────────────────────────────────
  robots: {
    index:          true,
    follow:         true,
    googleBot: {
      index:               true,
      follow:              true,
      "max-snippet":       -1,
      "max-image-preview": "large",
      "max-video-preview": -1,
    },
  },

  // ── Verification (add values from Search Console / Bing once registered) ──
  verification: {
    // google: "YOUR_GOOGLE_SEARCH_CONSOLE_TOKEN",
    // yandex: "YOUR_YANDEX_TOKEN",
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable}`}>
      <head>
        <JsonLd />
      </head>
      <body style={{ background: "#000", color: "#fff", minHeight: "100vh" }}>
        {children}
      </body>
    </html>
  );
}
