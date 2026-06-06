import React from "react";
import type { Metadata } from "next";
import { Geist, Geist_Mono, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { ClientOnlyOverlays } from "@/components/ui/ClientOnlyOverlays";
import PageLoader from "@/components/PageLoader";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} ${jetbrainsMono.variable} dark`}>
      <head>
        <link rel="preconnect" href="https://api.fontshare.com" />
        <link
          href="https://api.fontshare.com/v2/css?f[]=general-sans@400,500,600,700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-full antialiased text-white overflow-x-hidden" style={{ background: "transparent" }}>
        <PageLoader />
        {/* ── Global video background ─────────────────────────── */}
        <video
          autoPlay muted loop playsInline
          style={{
            position: "fixed", inset: 0, width: "100%", height: "100%",
            objectFit: "cover", zIndex: -2, pointerEvents: "none",
          }}
        >
          <source src="/hero-bg.mp4" type="video/mp4" />
        </video>
        {/* Dark overlay — keeps all section text readable */}
        <div style={{
          position: "fixed", inset: 0,
          background: "rgba(0,0,0,0.78)",
          zIndex: -1, pointerEvents: "none",
        }} />
        {children}
        <ClientOnlyOverlays />
      </body>
    </html>
  );
}
