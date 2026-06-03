"use client";

import { motion } from "framer-motion";
import { Check, Lock } from "lucide-react";
import Link from "next/link";

const FREE_FEATURES = [
  "AWS IAM role & access key scanner",
  "LangChain / CrewAI / AutoGen agent scanner",
  "P×R×E×A risk scoring engine",
  "CISA KEV threat intel enrichment",
  "Interactive NHI attack graph",
  "MITRE ATT&CK mapping",
  "CLI tool — runs locally, no data sent",
  "Open source — MIT license",
];

const PRO_FEATURES = [
  "Everything in Free",
  { locked: true, text: "Continuous monitoring — alerts when new NHIs appear" },
  { locked: true, text: "Remediation workflows — auto-creates Jira/ServiceNow tickets" },
  { locked: true, text: "Audit-grade PDF reports — SOC2, ISO27001, NIS2 mapping" },
  "Azure AD + GCP scanner",
  "GitHub Actions secrets scanner",
  "Priority support",
  "Early access to new features",
];

export default function Pricing() {
  return (
    <section id="pricing" className="py-24 border-t border-[#1f1f1f]">
      <div className="max-w-7xl mx-auto px-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.5 }}
          className="text-center mb-16"
        >
          <div className="text-xs font-mono text-[#00ff88] mb-4 tracking-widest uppercase">
            Pricing
          </div>
          <h2 className="text-4xl font-bold text-white mb-4">
            Free forever. Pro when you need it.
          </h2>
          <p className="text-[#888] max-w-lg mx-auto">
            The core scanner is free and always will be. Pro unlocks the features
            that enterprises need for continuous governance.
          </p>
        </motion.div>

        {/* Cards */}
        <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
          {/* Free */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="p-8 rounded-xl border border-[#1f1f1f] bg-[#0d0d0d]"
          >
            <div className="mb-6">
              <div className="text-xs font-mono text-[#888] mb-2 uppercase tracking-widest">Free</div>
              <div className="text-5xl font-bold text-white mb-1">$0</div>
              <div className="text-sm text-[#444]">Open source · MIT license</div>
            </div>

            <Link
              href="https://github.com/Abhiram-ops/agent-sentry"
              target="_blank"
              className="block w-full py-3 px-4 border border-[#2a2a2a] text-white text-sm font-semibold rounded-lg text-center hover:border-[#444] hover:bg-[#141414] transition-colors mb-8"
            >
              Clone on GitHub
            </Link>

            <ul className="space-y-3">
              {FREE_FEATURES.map((f, i) => (
                <li key={i} className="flex items-start gap-3 text-sm text-[#888]">
                  <Check className="w-4 h-4 text-[#00ff88] mt-0.5 shrink-0" />
                  {f}
                </li>
              ))}
            </ul>
          </motion.div>

          {/* Pro */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.08 }}
            className="relative p-8 rounded-xl border border-[#00ff88]/20 bg-[#0d0d0d] overflow-hidden"
            style={{ boxShadow: "0 0 40px rgba(0,255,136,0.06)" }}
          >
            {/* Coming soon badge */}
            <div className="absolute top-4 right-4 px-2 py-1 bg-[#00ff88]/10 border border-[#00ff88]/20 rounded-md text-xs font-mono text-[#00ff88]">
              Coming soon
            </div>

            <div className="mb-6">
              <div className="text-xs font-mono text-[#00ff88] mb-2 uppercase tracking-widest">Pro</div>
              <div className="text-5xl font-bold text-white mb-1">
                $49
                <span className="text-xl font-normal text-[#888]">/mo</span>
              </div>
              <div className="text-sm text-[#444]">Per workspace · cancel anytime</div>
            </div>

            <button
              disabled
              className="block w-full py-3 px-4 bg-[#00ff88]/20 text-[#00ff88]/60 text-sm font-semibold rounded-lg text-center cursor-not-allowed mb-8 border border-[#00ff88]/10"
            >
              Join waitlist
            </button>

            <ul className="space-y-3">
              {PRO_FEATURES.map((f, i) => {
                const isLocked = typeof f === "object";
                const text = isLocked ? f.text : f;
                return (
                  <li key={i} className={`flex items-start gap-3 text-sm ${isLocked ? "text-[#555]" : "text-[#888]"}`}>
                    {isLocked
                      ? <Lock className="w-4 h-4 text-[#333] mt-0.5 shrink-0" />
                      : <Check className="w-4 h-4 text-[#00ff88] mt-0.5 shrink-0" />
                    }
                    <span>
                      {text}
                      {isLocked && (
                        <span className="ml-2 text-xs px-1.5 py-0.5 rounded bg-[#1a1a1a] text-[#444] font-mono">
                          pro
                        </span>
                      )}
                    </span>
                  </li>
                );
              })}
            </ul>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
