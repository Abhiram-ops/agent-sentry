"use client";

import type { ReactNode } from "react";
import { NavbarWeb3 as Navbar } from "@/components/layout/NavbarWeb3";
import Footer from "@/components/layout/Footer";
import { motion } from "framer-motion";

type LegalShellProps = {
  eyebrow: string;
  title: string;
  intro?: string;
  lastUpdated: string;
  children: ReactNode;
};

/**
 * Shared layout for legal / trust pages (Privacy, Terms, Security).
 * A centered prose column on the site's standard Navbar + Footer chrome.
 */
export default function LegalShell({ eyebrow, title, intro, lastUpdated, children }: LegalShellProps) {
  return (
    <div className="auth-shell">
      <Navbar />
      <main style={{ flex: 1, padding: "120px 24px 80px", maxWidth: 820, margin: "0 auto", width: "100%" }}>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 12, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--accent)", marginBottom: 12 }}>
            {eyebrow}
          </div>
          <h1 style={{ fontSize: 38, lineHeight: 1.15, margin: "0 0 16px", letterSpacing: "-0.02em" }}>{title}</h1>
          {intro && (
            <p style={{ fontSize: 17, lineHeight: 1.6, color: "var(--text-muted)", margin: "0 0 8px" }}>{intro}</p>
          )}
          <p style={{ fontSize: 13, color: "var(--text-faint)", margin: "0 0 48px" }}>Last updated: {lastUpdated}</p>

          <div className="legal-prose">{children}</div>
        </motion.div>
      </main>
      <Footer />

      <style jsx global>{`
        .legal-prose h2 {
          font-size: 22px;
          letter-spacing: -0.01em;
          margin: 44px 0 14px;
          padding-top: 8px;
        }
        .legal-prose h3 {
          font-size: 16px;
          margin: 28px 0 10px;
          color: var(--text);
        }
        .legal-prose p,
        .legal-prose li {
          font-size: 15.5px;
          line-height: 1.72;
          color: var(--text-muted);
        }
        .legal-prose p {
          margin: 0 0 16px;
        }
        .legal-prose ul {
          margin: 0 0 18px;
          padding-left: 22px;
        }
        .legal-prose li {
          margin: 0 0 8px;
        }
        .legal-prose strong {
          color: var(--text);
          font-weight: 600;
        }
        .legal-prose a {
          color: var(--accent);
          text-decoration: none;
        }
        .legal-prose a:hover {
          text-decoration: underline;
        }
        .legal-prose code {
          font-family: var(--font-mono);
          font-size: 13.5px;
          background: var(--accent-subtle);
          color: var(--accent);
          padding: 2px 6px;
          border-radius: 5px;
        }
        .legal-callout {
          border: 1px solid var(--accent-muted);
          background: var(--accent-subtle);
          border-radius: 12px;
          padding: 20px 24px;
          margin: 0 0 28px;
        }
        .legal-callout p {
          margin: 0;
          color: var(--text);
        }
        .legal-prose table {
          width: 100%;
          border-collapse: collapse;
          margin: 0 0 24px;
          font-size: 14.5px;
        }
        .legal-prose th,
        .legal-prose td {
          text-align: left;
          padding: 10px 14px;
          border-bottom: 1px solid var(--border);
          color: var(--text-muted);
        }
        .legal-prose th {
          color: var(--text);
          font-weight: 600;
          border-bottom: 2px solid var(--border);
        }
      `}</style>
    </div>
  );
}
