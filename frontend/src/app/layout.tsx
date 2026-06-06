import type { Metadata } from "next";
import { Geist, Geist_Mono, JetBrains_Mono } from "next/font/google";
import "./globals.css";

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
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} ${jetbrainsMono.variable}`}>
      <body style={{ background: "#000", color: "#fff", minHeight: "100vh" }}>
        {children}
      </body>
    </html>
  );
}
