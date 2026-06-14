import React from "react";
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ClientOnlyOverlays } from "@/components/ClientOnlyOverlays";
import { ToastProvider } from "@/components/Toast";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "AgentSentry — NHI & AI Agent Security Scanner",
  description:
    "Finds every IAM role, API key, SSH key, and AI agent in your cloud. Scores each one's blast radius. Open source, AGPL-3.0, free.",
  keywords: ["non-human identity", "NHI security", "AI agent security", "cloud security", "IAM audit", "CISA KEV"],
  authors: [{ name: "Abhiram Lanka" }],
  openGraph: {
    title: "AgentSentry — NHI & AI Agent Security Scanner",
    description: "45 machine identities for every 1 human. Almost none governed. AgentSentry finds them all.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable}`}>
      <body style={{ background: "var(--bg)", color: "var(--tx)" }}>
        <ToastProvider>
          {children}
          <ClientOnlyOverlays />
        </ToastProvider>
      </body>
    </html>
  );
}
