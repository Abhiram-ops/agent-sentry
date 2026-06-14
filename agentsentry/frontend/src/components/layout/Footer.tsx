"use client";

import Link from "next/link";
import { Shield } from "lucide-react";
import { GithubIcon } from "@/components/ui/GithubIcon";

const SOCIALS = [
  {
    label: "GitHub",
    href: "https://github.com/Abhiram-ops/agent-sentry",
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
        <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
      </svg>
    ),
  },
  {
    label: "X / Twitter",
    href: "https://x.com/agentsentry",
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
      </svg>
    ),
  },
  {
    label: "LinkedIn",
    href: "https://linkedin.com/company/agentsentry",
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
        <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
      </svg>
    ),
  },
  {
    label: "Bluesky",
    href: "https://bsky.app/profile/agentsentry.bsky.social",
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
        <path d="M12 10.8c-1.087-2.114-4.046-6.053-6.798-7.995C3.202 1.803 1.204 1.864.946 3.35.75 4.483.5 8.05.5 10.8c0 2.353.5 5.333 2.5 6.333.5.25 1.5.5 2 .5.5 0 1.25-.5 2.5-2.5 1.25-2 2.5-4.5 4.5-4.5s3.25 2.5 4.5 4.5c1.25 2 2 2.5 2.5 2.5.5 0 1.5-.25 2-.5 2-1 2.5-3.98 2.5-6.333 0-2.75-.25-6.317-.446-7.45-.258-1.486-2.256-1.547-4.256-.155C15.046 4.747 13.087 8.686 12 10.8z" />
      </svg>
    ),
  },
  {
    label: "Dev.to",
    href: "https://dev.to/agentsentry",
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
        <path d="M7.42 10.05c-.18-.16-.46-.23-.84-.23H6l.02 2.44.04 2.45.56-.02c.41 0 .63-.07.83-.26.24-.24.26-.36.26-2.2 0-1.91-.02-1.96-.29-2.18zM0 4.94v14.12h24V4.94H0zM8.56 15.3c-.44.58-1.06.77-2.53.77H4.71V8.53h1.4c1.67 0 2.16.18 2.6.9.27.43.29.6.32 2.57.05 2.23-.02 2.73-.47 3.3zm5.09-5.47h-2.47v1.77h1.52v1.28l-.72.04-.75.03v1.77l1.22.03 1.2.04v1.28h-1.6c-1.53 0-1.6-.01-1.87-.3l-.3-.28v-3.16c0-3.02.01-3.18.25-3.48.23-.31.25-.31 1.88-.31h1.64v1.28zm4.68 5.45c-.17.43-.64.79-1 .79-.18 0-.45-.15-.67-.39-.32-.32-.45-.63-.82-2.08l-.9-3.39-.45-1.67h.76c.4 0 .75.02.75.05 0 .06 1.16 4.54 1.26 4.83.04.15.32-.7.73-2.3l.66-2.52.74-.04c.4-.02.73 0 .73.04 0 .14-1.67 6.38-1.8 6.68z" />
      </svg>
    ),
  },
  {
    label: "Newsletter",
    href: "https://blastradius.beehiiv.com",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
        <path d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
      </svg>
    ),
  },
];

export default function Footer() {
  return (
    <footer className="border-t border-white/[0.05] pt-12 pb-8">
      <div className="px-6 md:px-14" style={{ maxWidth: 1100, margin: "0 auto" }}>

        {/* Top row — brand + nav links */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-6 mb-8">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-[#00ff88]/10 border border-[#00ff88]/20 flex items-center justify-center">
              <Shield className="w-3.5 h-3.5 text-[#00ff88]" />
            </div>
            <span className="font-semibold text-white text-sm">
              Agent<span className="text-[#00ff88]">Sentry</span>
            </span>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-[#888]">
            <Link href="/claim" className="hover:text-[#00ff88] transition-colors">Get Free Key</Link>
            <Link href="/docs" className="hover:text-white transition-colors">Docs</Link>
            <Link href="#research" className="hover:text-white transition-colors">Research</Link>
            <Link href="#pricing" className="hover:text-white transition-colors">Pricing</Link>
            <Link href="/contact" className="hover:text-white transition-colors">Contact</Link>
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-white/[0.04] mb-6" />

        {/* Bottom row — social icons + copyright */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            {SOCIALS.map((s) => (
              <Link
                key={s.label}
                href={s.href}
                target="_blank"
                rel="noopener noreferrer"
                title={s.label}
                className="text-[#555] hover:text-[#00ff88] transition-colors"
              >
                {s.icon}
              </Link>
            ))}
          </div>

          <div className="text-xs text-[#555] font-mono">
            AGPL-3.0 License · Built by Abhiram Lanka · 2026
          </div>
        </div>
      </div>
    </footer>
  );
}
