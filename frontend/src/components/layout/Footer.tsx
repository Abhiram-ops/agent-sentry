"use client";

import Link from "next/link";
import { Shield } from "lucide-react";
import { GithubIcon } from "@/components/ui/GithubIcon";

export default function Footer() {
  return (
    <footer className="border-t border-white/[0.05] py-16">
      <div className="px-6 md:px-14" style={{ maxWidth: 1100, margin: "0 auto" }}>
        <div className="flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-[#00ff88]/10 border border-[#00ff88]/20 flex items-center justify-center">
              <Shield className="w-3.5 h-3.5 text-[#00ff88]" />
            </div>
            <span className="font-semibold text-white text-sm">
              Agent<span className="text-[#00ff88]">Sentry</span>
            </span>
          </div>

          <div className="flex items-center gap-8 text-sm text-[#888]">
            <Link href="https://github.com/Abhiram-ops/agent-sentry" target="_blank"
              className="hover:text-white transition-colors flex items-center gap-1.5">
              <GithubIcon size={14} color="currentColor" />
              GitHub
            </Link>
            <Link href="/docs" className="hover:text-white transition-colors">Docs</Link>
            <Link href="#research" className="hover:text-white transition-colors">Research</Link>
            <Link href="#pricing" className="hover:text-white transition-colors">Pricing</Link>
            <Link href="/contact" className="hover:text-white transition-colors">Contact</Link>
          </div>

          <div className="text-xs text-[#666] font-mono">
            MIT License · Built by Abhiram Lanka · 2026
          </div>
        </div>
      </div>
    </footer>
  );
}
