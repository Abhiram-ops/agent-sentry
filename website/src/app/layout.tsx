import type { Metadata } from "next";
import dynamic from "next/dynamic";
const ChatBot = dynamic(() => import("@/components/ChatBot"), { ssr: false });
const CursorTrail = dynamic(() => import("@/components/CursorTrail"), { ssr: false });
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "AgentSentry — NHI & AI Agent Risk Auditor",
  description:
    "Discover every machine identity and AI agent in your cloud. Score their blast radius. Fix what matters. Free and open source.",
  keywords: ["non-human identity", "NHI security", "AI agent security", "cloud security", "IAM audit"],
  authors: [{ name: "Abhiram Lanka" }],
  openGraph: {
    title: "AgentSentry — NHI & AI Agent Risk Auditor",
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
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} dark`}>
      <body className="min-h-full antialiased bg-black text-white overflow-x-hidden">
        {children}
        <ChatBot />
        <CursorTrail />
      </body>
    </html>
  );
}
