"use client";

import { useState, FormEvent } from "react";
import { motion } from "framer-motion";
import { Send, GitBranch, Mail, MessageCircle, CheckCircle, AlertCircle } from "lucide-react";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

const channels = [
  {
    icon: MessageCircle,
    label: "X / Twitter",
    handle: "@AgentSentryApp",
    href: "https://x.com/AgentSentryApp",
    accent: "#1d9bf0",
  },
  {
    icon: GitBranch,
    label: "GitHub Issues",
    handle: "Open an issue",
    href: "https://github.com/Abhiram-ops/agent-sentry/issues/new",
    accent: "#00ff88",
  },
];

export default function ContactPage() {
  const [form, setForm] = useState({ name: "", email: "", message: "" });
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setStatus("loading");
    setErrorMsg("");
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error || "Something went wrong. Please try again.");
        setStatus("error");
      } else {
        setStatus("success");
        setForm({ name: "", email: "", message: "" });
      }
    } catch {
      setErrorMsg("Network error. Please try again.");
      setStatus("error");
    }
  };

  return (
    <div className="min-h-screen bg-black text-white">
      <Navbar />

      <main style={{ maxWidth: 1100, margin: "0 auto", paddingLeft: 56, paddingRight: 56, paddingTop: 140, paddingBottom: 96 }}>
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-14"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-[#00ff88]/20 bg-[#00ff88]/5 text-[#00ff88] text-xs font-mono mb-5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#00ff88] animate-pulse" />
            CONTACT
          </div>
          <h1 className="text-4xl font-bold text-white mb-3">Get in touch</h1>
          <p className="text-[#555] text-base max-w-md">
            Found a bug? Have a feature idea? Just want to talk security?{" "}
            Send a message and I&apos;ll get back to you.
          </p>
        </motion.div>

        {/* Two-column layout */}
        <div className="grid grid-cols-1 md:grid-cols-[1fr_280px] gap-12">

          {/* Form column */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            {status === "success" ? (
              <div className="flex flex-col items-center justify-center min-h-[340px] rounded-xl border border-[#00ff88]/20 bg-[#00ff88]/5 p-12 text-center">
                <CheckCircle className="w-12 h-12 text-[#00ff88] mb-5" />
                <h2 className="text-xl font-semibold text-white mb-2">Message received</h2>
                <p className="text-[#555] text-sm max-w-xs">
                  You&apos;ll get a confirmation email shortly. I typically reply within 24–48 hours.
                </p>
                <button
                  onClick={() => setStatus("idle")}
                  className="mt-8 text-xs text-[#00ff88] underline underline-offset-4 hover:no-underline"
                >
                  Send another message
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-xs text-[#555] font-mono mb-2 tracking-widest">NAME</label>
                    <input
                      type="text"
                      required
                      placeholder="Abhiram Lanka"
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      className="w-full bg-white/[0.03] border border-white/[0.08] rounded-lg px-4 py-3 text-sm text-white placeholder-[#333] focus:outline-none focus:border-[#00ff88]/40 transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-[#555] font-mono mb-2 tracking-widest">EMAIL</label>
                    <input
                      type="email"
                      required
                      placeholder="you@example.com"
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                      className="w-full bg-white/[0.03] border border-white/[0.08] rounded-lg px-4 py-3 text-sm text-white placeholder-[#333] focus:outline-none focus:border-[#00ff88]/40 transition-colors"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs text-[#555] font-mono mb-2 tracking-widest">MESSAGE</label>
                  <textarea
                    required
                    rows={7}
                    placeholder="Tell me what's on your mind..."
                    value={form.message}
                    onChange={(e) => setForm({ ...form, message: e.target.value })}
                    className="w-full bg-white/[0.03] border border-white/[0.08] rounded-lg px-4 py-3 text-sm text-white placeholder-[#333] focus:outline-none focus:border-[#00ff88]/40 transition-colors resize-none"
                  />
                </div>

                {status === "error" && (
                  <div className="flex items-center gap-2 text-red-400 text-sm">
                    <AlertCircle size={14} />
                    {errorMsg}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={status === "loading"}
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-[#00ff88] text-black text-sm font-semibold hover:bg-[#00e07a] transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {status === "loading" ? (
                    <>
                      <span className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                      Sending…
                    </>
                  ) : (
                    <>
                      <Send size={14} />
                      Send message
                    </>
                  )}
                </button>
              </form>
            )}
          </motion.div>

          {/* Sidebar column */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="space-y-3 pt-1"
          >
            <p className="text-xs text-[#444] font-mono tracking-widest mb-6">OR REACH OUT DIRECTLY</p>

            {channels.map((ch) => {
              const Icon = ch.icon;
              return (
                <Link
                  key={ch.label}
                  href={ch.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-4 p-4 rounded-xl border border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.04] hover:border-white/[0.1] transition-all"
                >
                  <div
                    className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ background: `${ch.accent}15`, border: `1px solid ${ch.accent}25` }}
                  >
                    <Icon size={16} style={{ color: ch.accent }} />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs text-[#444] font-mono">{ch.label}</div>
                    <div className="text-sm text-white font-medium truncate">{ch.handle}</div>
                  </div>
                </Link>
              );
            })}

            <Link
              href="mailto:agentsentry.tool@gmail.com"
              className="flex items-center gap-4 p-4 rounded-xl border border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.04] hover:border-white/[0.1] transition-all"
            >
              <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ background: "#a855f715", border: "1px solid #a855f725" }}>
                <Mail size={16} style={{ color: "#a855f7" }} />
              </div>
              <div className="min-w-0">
                <div className="text-xs text-[#444] font-mono">Email</div>
                <div className="text-sm text-white font-medium truncate">agentsentry.tool@gmail.com</div>
              </div>
            </Link>

            <div className="pt-4 border-t border-white/[0.06]">
              <p className="text-xs text-[#333] leading-relaxed">
                Response time is usually 24–48 hours. For urgent issues, DM on X for the fastest reply.
              </p>
            </div>
          </motion.div>

        </div>
      </main>

      <Footer />
    </div>
  );
}
