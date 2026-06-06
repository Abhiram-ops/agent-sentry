"use client";

import Link from "next/link";
import { Shield } from "lucide-react";
import GithubIcon from "./GithubIcon";

export default function Footer() {
  return (
    <footer className="border-t border-white/[0.05] py-16">
      <div style={{ maxWidth: 1100, margin: "0 auto", paddingLeft: 56, paddingRight: 56 }}>
        <div className="flex flex-col md:flex-row items-center justify-between gap-8">
          {/* Logo */}
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-[#00ff88]/10 border border-[#00ff88]/20 flex items-center justify-center">
              <Shield className="w-3.5 h-3.5 text-[#00ff88]" />
            </div>
            <span className="font-semibold text-white text-sm">
              Agent<span className="text-[#00ff88]">Sentry</span>
            </span>
          </div>

          {/* Links */}
          <div className="flex items-center gap-8 text-sm text-[#333]">
            <Link href="https://github.com/Abhiram-ops/agent-sentry" target="_blank"
              className="hover:text-white transition-colors flex items-center gap-1.5">
              <GithubIcon className="w-3.5 h-3.5" />
              GitHub
            </Link>
            <Link href="#research" className="hover:text-white transition-colors">Research</Link>
            <Link href="#pricing" className="hover:text-white transition-colors">Pricing</Link>
          </div>

          {/* Copyright */}
          <div className="text-xs text-[#222] font-mono">
            MIT License · Built by Abhiram Lanka · 2026
          </div>
        </div>
      </div>
    </footer>
  );
}
