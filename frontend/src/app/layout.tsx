import React from "react";
import type { Metadata } from "next";
import { Playfair_Display, DM_Sans, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { ClientOnlyOverlays } from "@/components/ui/ClientOnlyOverlays";
import { BetaBanner } from "@/components/layout/BetaBanner";
import { JsonLd } from "./schema";

const playfairDisplay = Playfair_Display({
  variable: "--font-playfair", subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
});
const dmSans = DM_Sans({
  variable: "--font-dm-sans", subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});
const jetbrainsMono = JetBrains_Mono({
  variable: "--font-mono", subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const SITE_URL = "https://agentsentry.org";
const TITLE    = "AgentSentry, NHI & AI Agent Risk Auditor";
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
  alternates: { canonical: SITE_URL },
  openGraph: {
    type:        "website",
    url:          SITE_URL,
    siteName:    "AgentSentry",
    title:        TITLE,
    description: DESC,
    images: [{ url: "/og-image.svg", width: 1200, height: 630, alt: "AgentSentry, NHI & AI Agent Risk Auditor" }],
  },
  twitter: {
    card:        "summary_large_image",
    site:        "@agentsentry",
    creator:     "@AbhiramLanka",
    title:        TITLE,
    description: DESC,
    images:      ["/og-image.svg"],
  },
  robots: {
    index:  true,
    follow: true,
    googleBot: {
      index:               true,
      follow:              true,
      "max-snippet":       -1,
      "max-image-preview": "large",
      "max-video-preview": -1,
    },
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${playfairDisplay.variable} ${dmSans.variable} ${jetbrainsMono.variable}`}>
      <head>
        <JsonLd />
      </head>
      <body className="antialiased">
        <BetaBanner />
        {children}
        <ClientOnlyOverlays />
      </body>
    </html>
  );
}
