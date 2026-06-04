"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { ArrowRight, Terminal } from "lucide-react";
import GithubIcon from "./GithubIcon";
import dynamic from "next/dynamic";

const AttackGraph3D = dynamic(() => import("./AttackGraph3D"), { ssr: false });

const LINES = [
  { text: "$ agentsentry scan all --enrich",                                  color: "#00ff88", delay: 0    },
  { text: "[•] Auto-detecting providers…",                                    color: "#444",    delay: 500  },
  { text: "[✓] 6 providers ready: aws azure gcp github k8s local",           color: "#555",    delay: 900  },
  { text: "",                                                                  color: "",        delay: 1100 },
  { text: "── Scanning: local ──",                                            color: "#666",    delay: 1200 },
  { text: "[✓] local: SSH key unencrypted · 2 secrets in .env",              color: "#ffcc00", delay: 1600 },
  { text: "── Scanning: aws ──",                                              color: "#666",    delay: 1900 },
  { text: "[✓] aws: 47 NHIs · 8 critical · CISA KEV enriched",              color: "#555",    delay: 2400 },
  { text: "── Scanning: github ──",                                           color: "#666",    delay: 2700 },
  { text: "[✓] github: PAT with admin:org scope · 3 deploy keys",            color: "#ffcc00", delay: 3100 },
  { text: "── Scanning: k8s ──",                                              color: "#666",    delay: 3400 },
  { text: "[✓] k8s: ServiceAccount bound to cluster-admin",                  color: "#ff3366", delay: 3800 },
  { text: "",                                                                  color: "",        delay: 4000 },
  { text: "  NHIs Found: 67   Critical: 11   High: 18   AI Agents: 6",      color: "#fff",    delay: 4200 },
  { text: "",                                                                  color: "",        delay: 4400 },
  { text: "● CRITICAL  k8s/default/pipeline-sa   cluster-admin binding",     color: "#ff3366", delay: 4600 },
  { text: "● CRITICAL  ml-pipeline-executor       Score 450.0  AdminAccess", color: "#ff3366", delay: 4900 },
  { text: "● HIGH      github PAT / Abhiram-ops   admin:org scope",          color: "#ffcc00", delay: 5200 },
  { text: "",                                                                  color: "",        delay: 5400 },
  { text: "⚠ CVE-2022-22954 matched  ·  CVE-2021-42287 matched",            color: "#ff3366", delay: 5600 },
  { text: "[✓] Report → agentsentry-report-2026.json",                       color: "#00ff88", delay: 5900 },
];

function TerminalDemo() {
  const [visible, setVisible] = useState(0);
  useEffect(() => {
    const timers = LINES.map((line, i) => setTimeout(() => setVisible(i + 1), line.delay));
    return () => timers.forEach(clearTimeout);
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, y: 32 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.9, delay: 0.4, ease: [0.21, 0.47, 0.32, 0.98] }}
      className="relative"
      style={{ perspective: 1200 }}
    >
      {/* Glow halo behind terminal */}
      <div className="absolute pointer-events-none" style={{
        inset: "-32px", borderRadius: 32,
        background: "radial-gradient(ellipse at 50% 50%, rgba(0,255,136,0.10) 0%, transparent 68%)",
        filter: "blur(16px)", zIndex: -1,
      }} />

      <div className="relative rounded-2xl overflow-hidden" style={{
        border: "1px solid rgba(255,255,255,0.06)",
        background: "#050505",
        boxShadow: "0 48px 96px rgba(0,0,0,0.75), 0 0 0 1px rgba(0,255,136,0.04)",
      }}>
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#00ff88]/25 to-transparent" />

        {/* Chrome bar */}
        <div className="flex items-center gap-2 px-5 py-4 border-b" style={{ borderColor: "rgba(255,255,255,0.05)", background: "#090909" }}>
          <div className="w-3 h-3 rounded-full" style={{ background: "#ff5f57" }} />
          <div className="w-3 h-3 rounded-full" style={{ background: "#febc2e" }} />
          <div className="w-3 h-3 rounded-full" style={{ background: "#28c840" }} />
          <span className="ml-3 text-[11px] font-mono flex items-center gap-1.5" style={{ color: "#2a2a2a" }}>
            <Terminal className="w-3 h-3" /> agentsentry — bash
          </span>
        </div>

        {/* Output */}
        <div className="p-5 font-mono leading-relaxed" style={{ fontSize: 12.5, minHeight: 340, lineHeight: 1.7 }}>
          {LINES.slice(0, visible).map((line, i) => (
            <motion.div key={i} initial={{ opacity: 0, x: -5 }} animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.1 }} style={{ color: line.color || "#2a2a2a" }}>
              {line.text || " "}
            </motion.div>
          ))}
          {visible < LINES.length && (
            <span className="inline-block align-middle" style={{
              width: 7, height: 14, background: "#00ff88",
              animation: "tblink 1s step-end infinite",
            }} />
          )}
        </div>

        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#00ff88]/08 to-transparent" />
      </div>
    </motion.div>
  );
}

export default function Hero() {
  return (
    <section className="relative overflow-hidden" style={{
      minHeight: "100svh", display: "flex", alignItems: "center",
      paddingTop: 96, paddingBottom: 80,
    }}>
      {/* Three.js attack graph */}
      <AttackGraph3D />

      {/* Dot grid overlay */}
      <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 1, opacity: 0.6 }}>
        <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="hdots" x="0" y="0" width="36" height="36" patternUnits="userSpaceOnUse">
              <circle cx="1" cy="1" r="0.85" fill="rgba(255,255,255,0.035)" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#hdots)" />
        </svg>
      </div>

      {/* Ambient orbs */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden" style={{ zIndex: 1 }}>
        <div style={{ position:"absolute", width:700, height:700, top:"5%", left:"48%", borderRadius:"50%",
          background:"radial-gradient(circle, rgba(0,255,136,0.08) 0%, transparent 68%)",
          filter:"blur(72px)", animation:"orb1 9s ease-in-out infinite" }} />
        <div style={{ position:"absolute", width:400, height:400, top:"52%", left:"2%", borderRadius:"50%",
          background:"radial-gradient(circle, rgba(255,51,102,0.05) 0%, transparent 68%)",
          filter:"blur(80px)", animation:"orb2 11s ease-in-out infinite" }} />
        <div style={{ position:"absolute", width:500, height:500, bottom:"-8%", right:"-2%", borderRadius:"50%",
          background:"radial-gradient(circle, rgba(0,136,255,0.05) 0%, transparent 68%)",
          filter:"blur(80px)", animation:"orb3 13s ease-in-out infinite" }} />
      </div>

      {/* Content */}
      <div className="relative w-full" style={{ maxWidth:1100, margin:"0 auto", paddingLeft:48, paddingRight:48, zIndex:2 }}>
        <div className="grid lg:grid-cols-2 items-center" style={{ gap: "clamp(48px, 6vw, 96px)" }}>

          {/* Left */}
          <div style={{ display:"flex", flexDirection:"column", gap:28 }}>
            {/* Badge */}
            <motion.div initial={{ opacity:0, y:16 }} animate={{ opacity:1, y:0 }} transition={{ duration:0.5 }}
              style={{ display:"inline-flex", alignItems:"center", gap:10, padding:"8px 16px",
                borderRadius:999, border:"1px solid rgba(0,255,136,0.22)",
                background:"rgba(0,255,136,0.05)", color:"#00ff88",
                fontFamily:"monospace", fontSize:12, width:"fit-content" }}>
              <span style={{ width:6, height:6, borderRadius:"50%", background:"#00ff88",
                animation:"nbpulse 2s ease-in-out infinite" }} />
              Open source · v0.1.0 · Research preview
            </motion.div>

            {/* Headline */}
            <motion.h1 initial={{ opacity:0, y:18 }} animate={{ opacity:1, y:0 }}
              transition={{ duration:0.55, delay:0.08 }}
              style={{ fontWeight:700, lineHeight:1.06, letterSpacing:"-0.02em",
                fontSize:"clamp(2.5rem, 4.8vw, 4rem)", color:"#fff", margin:0 }}>
              Find every{" "}
              <span style={{
                backgroundImage:"linear-gradient(135deg, #ffffff 10%, #00ff88 100%)",
                WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent", backgroundClip:"text",
              }}>
                machine identity
              </span>
              <br />before they do.
            </motion.h1>

            {/* Sub */}
            <motion.p initial={{ opacity:0, y:18 }} animate={{ opacity:1, y:0 }}
              transition={{ duration:0.55, delay:0.16 }}
              style={{ color:"#555", lineHeight:1.75, maxWidth:480,
                fontSize:"clamp(0.95rem, 1.5vw, 1.05rem)", margin:0 }}>
              45 machine identities for every 1 human. IAM roles, API keys, AI agents —
              almost none governed. AgentSentry audits your cloud, scores every NHI by
              blast radius, and maps attack paths to your crown jewels.
            </motion.p>

            {/* CTAs */}
            <motion.div initial={{ opacity:0, y:18 }} animate={{ opacity:1, y:0 }}
              transition={{ duration:0.55, delay:0.24 }}
              style={{ display:"flex", flexWrap:"wrap", gap:14 }}>
              <Link href="#pricing" style={{
                display:"flex", alignItems:"center", gap:8,
                padding:"14px 28px", background:"#00ff88", color:"#000",
                fontSize:14, fontWeight:600, borderRadius:12, textDecoration:"none",
                boxShadow:"0 0 32px rgba(0,255,136,0.22)",
                transition:"all 0.2s ease",
              }}
              onMouseEnter={e=>{(e.currentTarget as HTMLElement).style.cssText+="background:#00cc6a;box-shadow:0 0 48px rgba(0,255,136,0.38);"}}
              onMouseLeave={e=>{(e.currentTarget as HTMLElement).style.background="#00ff88";(e.currentTarget as HTMLElement).style.boxShadow="0 0 32px rgba(0,255,136,0.22)";}}>
                Get started free <ArrowRight className="w-4 h-4" />
              </Link>
              <Link href="https://github.com/Abhiram-ops/agent-sentry" target="_blank" style={{
                display:"flex", alignItems:"center", gap:8,
                padding:"14px 28px", border:"1px solid rgba(255,255,255,0.10)",
                color:"#fff", fontSize:14, borderRadius:12, textDecoration:"none",
                transition:"all 0.2s ease",
              }}
              onMouseEnter={e=>{(e.currentTarget as HTMLElement).style.borderColor="rgba(255,255,255,0.20)";(e.currentTarget as HTMLElement).style.background="rgba(255,255,255,0.04)";}}
              onMouseLeave={e=>{(e.currentTarget as HTMLElement).style.borderColor="rgba(255,255,255,0.10)";(e.currentTarget as HTMLElement).style.background="transparent";}}>
                <GithubIcon className="w-4 h-4" /> View on GitHub
              </Link>
            </motion.div>

            {/* Install */}
            <motion.div initial={{ opacity:0, y:18 }} animate={{ opacity:1, y:0 }}
              transition={{ duration:0.55, delay:0.32 }}
              style={{ display:"flex", alignItems:"center", gap:12, fontFamily:"monospace", fontSize:13 }}>
              <span style={{ color:"#2a2a2a" }}>Quick start:</span>
              <div style={{ display:"flex", alignItems:"center", gap:10, padding:"8px 16px",
                border:"1px solid rgba(255,255,255,0.06)", borderRadius:8,
                background:"rgba(255,255,255,0.02)", cursor:"text", userSelect:"all" }}>
                <span style={{ color:"#00ff88" }}>$</span>
                <span style={{ color:"#3a3a3a" }}>pip install agentsentry</span>
              </div>
            </motion.div>
          </div>

          {/* Right — terminal */}
          <div className="relative">
            <TerminalDemo />
          </div>
        </div>
      </div>

      <style>{`
        @keyframes orb1  { 0%,100%{transform:translate(0,0) scale(1)}   33%{transform:translate(-28px,18px) scale(1.04)} 66%{transform:translate(18px,-14px) scale(0.97)} }
        @keyframes orb2  { 0%,100%{transform:translate(0,0)}  50%{transform:translate(22px,-26px)} }
        @keyframes orb3  { 0%,100%{transform:translate(0,0)}  50%{transform:translate(-16px,20px)} }
        @keyframes nbpulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.55;transform:scale(1.35)} }
        @keyframes tblink  { 0%,100%{opacity:1} 50%{opacity:0} }
      `}</style>
    </section>
  );
}
