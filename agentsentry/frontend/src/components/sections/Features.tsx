"use client";

import React from "react";
import { useRef, useState } from "react";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { Shield, Bot, Zap, Network, AlertTriangle, FileSearch } from "lucide-react";
import { Container } from "@/components/ui/Container";

function TiltCard({ children, accentColor, wide = false, index }: { children: React.ReactNode; accentColor: string; wide?: boolean; index: number; }) {
  const ref = useRef<HTMLDivElement>(null);
  const mx = useMotionValue(0); const my = useMotionValue(0);
  const sx = useSpring(mx, { stiffness: 300, damping: 26 });
  const sy = useSpring(my, { stiffness: 300, damping: 26 });
  const rotX = useTransform(sy, [-0.5, 0.5], [7, -7]);
  const rotY = useTransform(sx, [-0.5, 0.5], [-7, 7]);
  const [shine, setShine] = useState({ x: 50, y: 50, show: false });
  const onMove = (e: React.MouseEvent) => {
    const r = ref.current?.getBoundingClientRect(); if (!r) return;
    mx.set((e.clientX - r.left) / r.width - 0.5); my.set((e.clientY - r.top) / r.height - 0.5);
    setShine({ x: ((e.clientX - r.left) / r.width) * 100, y: ((e.clientY - r.top) / r.height) * 100, show: true });
  };
  const onLeave = () => { mx.set(0); my.set(0); setShine(s => ({ ...s, show: false })); };
  return (
    <motion.div ref={ref}
      initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-50px" }} transition={{ duration: 0.5, delay: index * 0.07 }}
      onMouseMove={onMove} onMouseLeave={onLeave}
      style={{ rotateX: rotX, rotateY: rotY, transformPerspective: 900, transformStyle: "preserve-3d", gridColumn: wide ? "span 2" : "span 1", borderTop: "1px solid rgba(0,255,136,0.15)" }}
      whileHover={{ scale: 1.01 }}
      className="relative rounded-2xl overflow-hidden cursor-default group backdrop-blur-sm bg-white/5 border border-white/10 hover:border-[#00ff88]/40 hover:bg-white/[0.08] transition-all duration-300">
      <div className="relative h-full" style={{ padding: "36px 36px", boxShadow: "0 24px 64px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.04)" }}>
        <div className="absolute top-0 left-0 right-0 h-px opacity-0 group-hover:opacity-100 transition-opacity duration-400"
          style={{ background: `linear-gradient(90deg, transparent, ${accentColor}55, transparent)` }} />
        <div className="absolute inset-0 pointer-events-none rounded-2xl" style={{ background: shine.show ? `radial-gradient(circle at ${shine.x}% ${shine.y}%, ${accentColor}12 0%, transparent 55%)` : "transparent", transition: "background 0.15s ease" }} />
        {children}
      </div>
    </motion.div>
  );
}

const FEATURES = [
  { icon: Network,       title: "Multi-Cloud NHI Discovery", color: "#00ff88", wide: true,
    desc: "Finds every IAM role, API key, service account, Managed Identity, and OAuth token — across AWS, Azure, GCP, GitHub, Kubernetes, and your local machine. One command. Every environment." },
  { icon: Bot,           title: "AI Agent Scanner",          color: "#0099ff", wide: false,
    desc: "Statically analyzes LangChain, CrewAI, and AutoGen codebases. Extracts tool permissions. Computes the AI-Amplification Factor." },
  { icon: AlertTriangle, title: "CISA KEV Enrichment",       color: "#ff3366", wide: false,
    desc: "Correlates every finding against 1,610+ actively exploited CVEs. Flags ransomware-linked vulnerabilities in real time." },
  { icon: Shield,        title: "Attack Graph",              color: "#ffcc00", wide: false,
    desc: "Cross-provider attack graph. Computes blast radius: if this identity is compromised, what does the attacker reach — regardless of which cloud it lives in?" },
  { icon: FileSearch,    title: "MITRE ATT&CK Mapping",      color: "#00ff88", wide: false,
    desc: "Every finding maps to ATT&CK techniques. T1078.004, T1528, T1552, T1611 — the language your SOC already speaks." },
  { icon: Zap,           title: "Risk Scoring: P×R×E×A",     color: "#ff8800", wide: true,
    desc: "Privilege × Reachability × Exposure × AI-Amplification. Consistent across all providers — the same score model whether the identity lives in AWS, K8s, or a local .env file. Novel academic contribution." },
];

export default function Features() {
  return (
    <section id="features" style={{ padding: "120px 0" }}>
      <Container>
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }} transition={{ duration: 0.5 }}
          style={{ marginBottom: 72 }}>
          <div style={{ fontFamily: "monospace", fontSize: 11, color: "#00ff88", marginBottom: 20, letterSpacing: "0.2em", textTransform: "uppercase" }}>
            What it does
          </div>
          <h2 style={{ fontSize: "clamp(2rem, 3.5vw, 3rem)", fontWeight: 700, color: "#fff", marginBottom: 20, lineHeight: 1.1, letterSpacing: "-0.02em" }}>
            Every attack surface.<br />One scanner.
          </h2>
          <p style={{ color: "#a0a0a0", maxWidth: 480, fontSize: "clamp(0.95rem, 1.4vw, 1.05rem)", lineHeight: 1.75 }}>
            The only open-source tool that audits machine identities across every cloud and environment — with the same risk model, in the same scan.
          </p>
        </motion.div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }} className="features-grid">
          {FEATURES.map((f, i) => {
            const Icon = f.icon;
            return (
              <TiltCard key={i} accentColor={f.color} wide={f.wide} index={i}>
                <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                  <div style={{ width: 44, height: 44, borderRadius: 12, background: f.color + "12", border: `1px solid ${f.color}28`, display: "flex", alignItems: "center", justifyContent: "center" }} className="feat-icon">
                    <Icon style={{ width: 20, height: 20, color: f.color }} />
                  </div>
                  <div>
                    <h3 style={{ color: "#fff", fontWeight: 600, fontSize: 17, marginBottom: 10, letterSpacing: "-0.01em" }}>{f.title}</h3>
                    <p style={{ color: "#a0a0a0", fontSize: 14, lineHeight: 1.72 }}>{f.desc}</p>
                  </div>
                </div>
              </TiltCard>
            );
          })}
        </div>
      </Container>
      <style>{`
        @media (max-width: 900px) { .features-grid { grid-template-columns: 1fr !important; } .features-grid > * { grid-column: span 1 !important; } }
        @media (min-width: 901px) and (max-width: 1100px) { .features-grid { grid-template-columns: repeat(2, 1fr) !important; } }
        .feat-icon { transition: transform 0.25s ease; }
        .group:hover .feat-icon { transform: scale(1.08) rotate(-3deg); }
      `}</style>
    </section>
  );
}
