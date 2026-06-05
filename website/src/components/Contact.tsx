"use client";

import { motion } from "framer-motion";
import { MessageCircle, Github, Mail, ExternalLink } from "lucide-react";
import Link from "next/link";

const channels = [
  {
    icon: MessageCircle,
    label: "X / Twitter",
    handle: "@AgentSentryApp",
    description: "Fastest response. DM us for support, bugs, or feature requests.",
    href: "https://x.com/AgentSentryApp",
    cta: "Open DM",
    accent: "#1d9bf0",
  },
  {
    icon: Github,
    label: "GitHub Issues",
    handle: "agent-sentry",
    description: "Bug reports, feature requests, and pull requests welcome.",
    href: "https://github.com/Abhiram-ops/agent-sentry/issues/new",
    cta: "Open Issue",
    accent: "#00ff88",
  },
  {
    icon: Mail,
    label: "Email",
    handle: "agentsentry.tool@gmail.com",
    description: "For partnership, research collaboration, or anything else.",
    href: "mailto:agentsentry.tool@gmail.com",
    cta: "Send Email",
    accent: "#a855f7",
  },
];
export default function Contact() {
  return (
    <section id="contact" className="py-24">
      <div style={{ maxWidth: 1100, margin: "0 auto", paddingLeft: 56, paddingRight: 56 }}>

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="mb-14"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-[#00ff88]/20 bg-[#00ff88]/5 text-[#00ff88] text-xs font-mono mb-5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#00ff88] animate-pulse" />
            SUPPORT
          </div>
          <h2 className="text-3xl font-bold text-white mb-3">
            Contact the developer
          </h2>
          <p className="text-[#555] text-base max-w-lg">
            Found a bug? Want to contribute? Just have a question?
            Pick whichever channel works best.
          </p>
        </motion.div>

        {/* Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {channels.map((ch, i) => {
            const Icon = ch.icon;
            return (
              <motion.div
                key={ch.label}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.1 }}
              >
                <Link
                  href={ch.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex flex-col h-full p-6 rounded-xl border border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.04] hover:border-white/[0.12] transition-all duration-200"
                >
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center mb-5"
                    style={{ background: `${ch.accent}15`, border: `1px solid ${ch.accent}30` }}
                  >
                    <Icon className="w-4.5 h-4.5" style={{ color: ch.accent }} size={18} />
                  </div>
                  <div className="text-xs text-[#444] font-mono mb-1">{ch.label}</div>
                  <div className="text-sm text-white font-medium mb-3">{ch.handle}</div>
                  <p className="text-sm text-[#444] leading-relaxed flex-1">{ch.description}</p>
                  <div
                    className="mt-5 inline-flex items-center gap-1.5 text-xs font-medium transition-colors"
                    style={{ color: ch.accent }}
                  >
                    {ch.cta}
                    <ExternalLink size={11} />
                  </div>
                </Link>
              </motion.div>
            );
          })}
        </div>

      </div>
    </section>
  );
}