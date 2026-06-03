"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { ArrowRight, Terminal } from "lucide-react";
import GithubIcon from "./GithubIcon";

const TERMINAL_LINES = [
  { text: "$ python -m agentsentry scan aws --enrich", color: "#00ff88", delay: 0 },
  { text: "[AgentSentry] Connecting to AWS...", color: "#888", delay: 600 },
  { text: "[AgentSentry] Scanning IAM roles...", color: "#888", delay: 1000 },
  { text: "[AgentSentry] Fetching CISA KEV catalog...", color: "#888", delay: 1400 },
  { text: "[AgentSentry] Loaded 1,610 KEV entries. 325 linked to ransomware.", color: "#888", delay: 1900 },
  { text: "", color: "#888", delay: 2300 },
  { text: "NHIs Discovered: 47   Critical: 8   High: 12   AI Agents: 6", color: "#fff", delay: 2500 },
  { text: "", color: "#888", delay: 2700 },
  { text: "● CRITICAL   ml-pipeline-executor      Score: 450.0   AdminAccess", color: "#ff3366", delay: 2900 },
  { text: "● CRITICAL   langchain-crm-agent       Score: 300.0   Irreversible tools", color: "#ff3366", delay: 3200 },
  { text: "● CRITICAL   github-actions-deploy     Score: 112.5   Internet-facing", color: "#ff3366", delay: 3500 },
  { text: "● HIGH       legacy-reporting-key      Score:  67.5   Never rotated", color: "#ffcc00", delay: 3800 },
  { text: "", color: "#888", delay: 4100 },
  { text: "⚠ CVE-2022-22954 matched — ransomware campaign active", color: "#ff3366", delay: 4300 },
  { text: "⚠ CVE-2021-42287 matched — privilege escalation in wild", color: "#ff3366", delay: 4600 },
];

function TerminalDemo() {
  const [visibleLines, setVisibleLines] = useState<number>(0);

  useEffect(() => {
    let timeouts: ReturnType<typeof setTimeout>[] = [];
    TERMINAL_LINES.forEach((_, i) => {
      const t = setTimeout(() => {
        setVisibleLines(i + 1);
      }, TERMINAL_LINES[i].delay);
      timeouts.push(t);
    });
    return () => timeouts.forEach(clearTimeout);
  }, []);

  return (
    <div className="relative rounded-xl border border-[#1f1f1f] bg-black overflow-hidden">
      {/* Window chrome */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-[#1f1f1f] bg-[#0d0d0d]">
        <div className="w-3 h-3 rounded-full bg-[#ff3366]/60" />
        <div className="w-3 h-3 rounded-full bg-[#ffcc00]/60" />
        <div className="w-3 h-3 rounded-full bg-[#00ff88]/60" />
        <span className="ml-3 text-xs text-[#444] font-mono flex items-center gap-1.5">
          <Terminal className="w-3 h-3" />
          agentsentry — terminal
        </span>
      </div>

      {/* Terminal content */}
      <div className="p-5 font-mono text-sm space-y-1 min-h-[320px]">
        {TERMINAL_LINES.slice(0, visibleLines).map((line, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.15 }}
            style={{ color: line.color }}
            className="leading-relaxed"
          >
            {line.text || " "}
          </motion.div>
        ))}
        {visibleLines < TERMINAL_LINES.length && (
          <span className="text-[#00ff88] cursor-blink">█</span>
        )}
      </div>

      {/* Glow effect */}
      <div className="absolute inset-0 pointer-events-none rounded-xl"
        style={{ boxShadow: "inset 0 0 60px rgba(0,255,136,0.03)" }} />
    </div>
  );
}

export default function Hero() {
  return (
    <section className="relative min-h-screen flex flex-col justify-center pt-24 pb-16 grid-bg overflow-hidden">

      {/* Background radial glow */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full pointer-events-none"
        style={{ background: "radial-gradient(circle, rgba(0,255,136,0.04) 0%, transparent 70%)" }} />

      <div className="relative max-w-7xl mx-auto px-6 w-full">
        <div className="grid lg:grid-cols-2 gap-16 items-center">

          {/* Left — copy */}
          <div>
            {/* Badge */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-[#00ff88]/20 bg-[#00ff88]/5 text-[#00ff88] text-xs font-mono mb-8"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-[#00ff88] animate-pulse" />
              Open source · v0.1.0 · Research preview
            </motion.div>

            {/* Headline */}
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.08 }}
              className="text-5xl lg:text-7xl font-bold leading-[1.05] tracking-tight mb-6"
            >
              Find every
              <br />
              <span className="gradient-text">machine identity</span>
              <br />
              before they do.
            </motion.h1>

            {/* Subheadline */}
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.16 }}
              className="text-lg text-[#888] max-w-xl mb-10 leading-relaxed"
            >
              45 machine identities for every 1 human. IAM roles, API keys,
              AI agents — almost none of them governed. AgentSentry audits
              your cloud in minutes, scores every NHI by blast radius, and
              maps attack paths to your crown jewels.
            </motion.p>

            {/* CTAs */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.24 }}
              className="flex flex-wrap gap-4 mb-12"
            >
              <Link
                href="#pricing"
                className="flex items-center gap-2 px-6 py-3 bg-[#00ff88] text-black font-semibold rounded-lg hover:bg-[#00cc6a] transition-colors glow-green-hover"
              >
                Get started free
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                href="https://github.com/Abhiram-ops/agent-sentry"
                target="_blank"
                className="flex items-center gap-2 px-6 py-3 border border-[#2a2a2a] text-white rounded-lg hover:border-[#444] hover:bg-[#0d0d0d] transition-colors"
              >
                <GithubIcon className="w-4 h-4" />
                View on GitHub
              </Link>
            </motion.div>

            {/* Install command */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.32 }}
              className="flex items-center gap-3 font-mono text-sm"
            >
              <span className="text-[#444]">Quick start:</span>
              <div className="flex items-center gap-2 px-3 py-1.5 bg-[#0d0d0d] border border-[#1f1f1f] rounded-lg">
                <span className="text-[#00ff88]">$</span>
                <span className="text-[#888]">pip install agentsentry</span>
              </div>
            </motion.div>
          </div>

          {/* Right — terminal */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="relative"
          >
            <TerminalDemo />

            {/* Decorative glow behind terminal */}
            <div className="absolute -inset-4 rounded-2xl pointer-events-none -z-10"
              style={{ background: "radial-gradient(ellipse, rgba(0,255,136,0.06) 0%, transparent 70%)" }} />
          </motion.div>
        </div>
      </div>
    </section>
  );
}
