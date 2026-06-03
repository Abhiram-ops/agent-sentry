"use client";

import { motion } from "framer-motion";
import { Shield, Bot, Zap, Network, AlertTriangle, FileSearch } from "lucide-react";

const FEATURES = [
  {
    icon: Network,
    title: "NHI Discovery",
    description:
      "Finds every IAM role, API key, service account, and OAuth token in your cloud. The ones you know about, and the ones you don't.",
    color: "#00ff88",
    size: "large",
  },
  {
    icon: Bot,
    title: "AI Agent Scanner",
    description:
      "Statically analyzes LangChain, CrewAI, and AutoGen codebases. Extracts tool permissions. Computes the AI-Amplification Factor.",
    color: "#0088ff",
    size: "small",
  },
  {
    icon: AlertTriangle,
    title: "CISA KEV Enrichment",
    description:
      "Correlates every finding against 1,610+ actively exploited CVEs. Flags ransomware-linked vulnerabilities.",
    color: "#ff3366",
    size: "small",
  },
  {
    icon: Shield,
    title: "Attack Graph",
    description:
      "Builds a directed graph of access relationships. Computes blast radius: if this identity is compromised, what does the attacker reach?",
    color: "#ffcc00",
    size: "small",
  },
  {
    icon: FileSearch,
    title: "MITRE ATT&CK Mapping",
    description:
      "Every finding maps to ATT&CK techniques. T1078.004, T1528, T1651 — the language your SOC already speaks.",
    color: "#00ff88",
    size: "small",
  },
  {
    icon: Zap,
    title: "Risk Scoring: P×R×E×A",
    description:
      "Privilege × Reachability × Exposure × AI-Amplification. The first scoring model that accounts for autonomous AI agent blast radius.",
    color: "#ff8800",
    size: "large",
  },
];

export default function Features() {
  return (
    <section id="features" className="py-24">
      <div className="max-w-7xl mx-auto px-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.5 }}
          className="mb-16"
        >
          <div className="text-xs font-mono text-[#00ff88] mb-4 tracking-widest uppercase">
            What it does
          </div>
          <h2 className="text-4xl font-bold text-white mb-4">
            Every attack surface.<br />One scanner.
          </h2>
          <p className="text-[#888] max-w-xl">
            AgentSentry is the only open-source tool that audits machine identities
            and AI agents in the same scan, with the same risk model.
          </p>
        </motion.div>

        {/* Bento grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {FEATURES.map((feature, i) => {
            const Icon = feature.icon;
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ duration: 0.5, delay: i * 0.08 }}
                whileHover={{ borderColor: feature.color + "33" }}
                className={`relative p-6 rounded-xl border border-[#1f1f1f] bg-[#0d0d0d] group cursor-default
                  ${feature.size === "large" ? "md:col-span-2" : ""}`}
              >
                {/* Icon */}
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center mb-4 transition-colors duration-300"
                  style={{
                    background: feature.color + "15",
                    border: `1px solid ${feature.color}30`,
                  }}
                >
                  <Icon className="w-5 h-5" style={{ color: feature.color }} />
                </div>

                <h3 className="text-white font-semibold mb-2">{feature.title}</h3>
                <p className="text-[#888] text-sm leading-relaxed">{feature.description}</p>

                {/* Hover glow */}
                <div
                  className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
                  style={{
                    background: `radial-gradient(circle at 30% 30%, ${feature.color}08, transparent 60%)`,
                  }}
                />
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
