import React from "react";
import type { Metadata } from "next";
import { Playfair_Display, DM_Sans, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { ClientOnlyOverlays } from "@/components/ui/ClientOnlyOverlays";

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

export const metadata: Metadata = {
  title: "AgentSentry — NHI & AI Agent Risk Auditor",
  description:
    "Discover every machine identity and AI agent in your cloud. Score blast radius. Fix what matters. Free and open source.",
  keywords: ["non-human identity", "NHI security", "AI agent security", "cloud security", "IAM audit", "attack graph"],
  authors: [{ name: "Abhiram Lanka" }],
  openGraph: {
    title: "AgentSentry — NHI & AI Agent Risk Auditor",
    description: "45 machine identities for every 1 human. Almost none governed. AgentSentry finds them all.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "AgentSentry",
    description: "Open-source NHI & AI Agent Risk Auditor",
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${playfairDisplay.variable} ${dmSans.variable} ${jetbrainsMono.variable}`}>
      <body className="antialiased">
        {children}
        <ClientOnlyOverlays />
      </body>
    </html>
  );
}
