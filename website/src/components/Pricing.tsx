"use client";

import { useRef, useState } from "react";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { Check, Lock } from "lucide-react";
import Link from "next/link";
import Container from "./Container";

const FREE = [
  "AWS IAM role & access key scanner",
  "LangChain / CrewAI / AutoGen agent scanner",
  "P×R×E×A risk scoring engine",
  "CISA KEV threat intel enrichment",
  "Interactive NHI attack graph",
  "MITRE ATT&CK mapping",
  "CLI — runs locally, no data leaves you",
  "Open source — MIT license",
];

type ProItem = string | { locked: true; text: string };
const PRO: ProItem[] = [
  "Everything in Free",
  { locked: true, text: "Continuous monitoring — alerts on new NHIs" },
  { locked: true, text: "Remediation workflows — auto Jira/ServiceNow tickets" },
  { locked: true, text: "Audit-grade PDF reports — SOC 2, ISO 27001, NIS 2" },
  "Azure AD + GCP scanner",
  "GitHub Actions secrets scanner",
  "Priority support",
  "Early access to new features",
];

// ─── 3D pricing card ───────────────────────────────────────────────────────

function PricingCard({
  children, accentColor, delay = 0,
}: {
  children: React.ReactNode; accentColor: string; delay?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const sx = useSpring(mx, { stiffness: 250, damping: 24 });
  const sy = useSpring(my, { stiffness: 250, damping: 24 });
  const rotX = useTransform(sy, [-0.5, 0.5], [6, -6]);
  const rotY = useTransform(sx, [-0.5, 0.5], [-6, 6]);
  const [shine, setShine] = useState({ x: 50, y: 50, show: false });

  const onMove = (e: React.MouseEvent) => {
    const r = ref.current?.getBoundingClientRect();
    if (!r) return;
    mx.set((e.clientX - r.left) / r.width - 0.5);
    my.set((e.clientY - r.top) / r.height - 0.5);
    setShine({ x: ((e.clientX - r.left) / r.width) * 100, y: ((e.clientY - r.top) / r.height) * 100, show: true });
  };
  const onLeave = () => { mx.set(0); my.set(0); setShine(s => ({ ...s, show: false })); };

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.55, delay }}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      style={{ rotateX: rotX, rotateY: rotY, transformPerspective: 1000, transformStyle: "preserve-3d" }}
      whileHover={{ scale: 1.015, y: -4 }}
      className="relative"
    >
      {/* Deep shadow (pseudo 3D base) */}
      <div className="absolute inset-x-4 -bottom-4 h-8 rounded-2xl pointer-events-none" style={{
        background: `radial-gradient(ellipse, ${accentColor}18 0%, transparent 70%)`,
        filter: "blur(16px)",
        transform: "translateZ(-30px)",
      }} />

      <div className="relative rounded-2xl overflow-hidden" style={{
        border: `1px solid ${accentColor === "#00ff88" ? "rgba(0,255,136,0.14)" : "rgba(255,255,255,0.06)"}`,
        background: "linear-gradient(160deg, #070707 0%, #050505 100%)",
        boxShadow: `0 32px 72px rgba(0,0,0,0.6), 0 0 0 1px ${accentColor}08, inset 0 1px 0 rgba(255,255,255,0.04)`,
        padding: "44px 40px",
      }}>
        {/* Top glow line */}
        <div className="absolute top-0 left-0 right-0 h-px"
          style={{ background: `linear-gradient(90deg, transparent, ${accentColor}45, transparent)` }} />

        {/* Cursor shine */}
        <div className="absolute inset-0 rounded-2xl pointer-events-none" style={{
          background: shine.show
            ? `radial-gradient(circle at ${shine.x}% ${shine.y}%, ${accentColor}10 0%, transparent 55%)`
            : "transparent",
          transition: "background 0.12s ease",
        }} />

        {children}
      </div>
    </motion.div>
  );
}

// ─── Section ───────────────────────────────────────────────────────────────

export default function Pricing() {
  return (
    <section id="pricing" style={{ padding: "120px 0", position: "relative", overflow: "hidden" }}>
      {/* Background glow */}
      <div className="absolute pointer-events-none" style={{
        top: "40%", left: "50%", transform: "translate(-50%,-50%)",
        width: 800, height: 400, borderRadius: "50%",
        background: "radial-gradient(ellipse, rgba(0,255,136,0.035) 0%, transparent 70%)",
        filter: "blur(60px)",
      }} />

      <Container className="relative">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }} transition={{ duration: 0.5 }}
          style={{ textAlign: "center", marginBottom: 80 }}>
          <div style={{ fontFamily:"monospace", fontSize:11, color:"#00ff88",
            marginBottom:20, letterSpacing:"0.2em", textTransform:"uppercase" }}>Pricing</div>
          <h2 style={{ fontSize:"clamp(2rem, 3.5vw, 3rem)", fontWeight:700, color:"#fff",
            marginBottom:20, lineHeight:1.1, letterSpacing:"-0.02em" }}>
            Free forever.<br />Pro when you need it.
          </h2>
          <p style={{ color:"#4a4a4a", maxWidth:440, margin:"0 auto",
            fontSize:"clamp(0.95rem, 1.4vw, 1.05rem)", lineHeight:1.75 }}>
            The core scanner is free and always will be. Pro unlocks continuous governance
            for enterprise teams.
          </p>
        </motion.div>

        {/* Cards */}
        <div style={{ display:"grid", gridTemplateColumns:"repeat(2, 1fr)", gap:20, maxWidth:900, margin:"0 auto" }}
          className="pricing-grid">

          {/* Free */}
          <PricingCard accentColor="#444" delay={0}>
            <div style={{ marginBottom:36 }}>
              <div style={{ fontFamily:"monospace", fontSize:11, color:"#444",
                marginBottom:14, letterSpacing:"0.18em", textTransform:"uppercase" }}>Free</div>
              <div style={{ display:"flex", alignItems:"flex-end", gap:4, marginBottom:6 }}>
                <span style={{ fontSize:64, fontWeight:700, color:"#fff", lineHeight:1 }}>$0</span>
              </div>
              <div style={{ fontSize:13, color:"#2a2a2a", fontFamily:"monospace" }}>Open source · MIT license</div>
            </div>

            <Link href="https://github.com/Abhiram-ops/agent-sentry" target="_blank"
              style={{ display:"block", width:"100%", padding:"14px 20px",
                border:"1px solid rgba(255,255,255,0.09)", color:"#fff", fontSize:14,
                fontWeight:600, borderRadius:12, textAlign:"center",
                textDecoration:"none", marginBottom:32,
                transition:"all 0.2s ease", background:"transparent" }}
              onMouseEnter={e=>{(e.currentTarget as HTMLElement).style.background="rgba(255,255,255,0.04)";(e.currentTarget as HTMLElement).style.borderColor="rgba(255,255,255,0.16)";}}
              onMouseLeave={e=>{(e.currentTarget as HTMLElement).style.background="transparent";(e.currentTarget as HTMLElement).style.borderColor="rgba(255,255,255,0.09)";}}>
              Clone on GitHub
            </Link>

            <ul style={{ listStyle:"none", display:"flex", flexDirection:"column", gap:16 }}>
              {FREE.map((f, i) => (
                <li key={i} style={{ display:"flex", alignItems:"flex-start", gap:12, fontSize:14, color:"#4a4a4a" }}>
                  <Check style={{ width:15, height:15, color:"#00ff88", marginTop:1, flexShrink:0 }} />
                  {f}
                </li>
              ))}
            </ul>
          </PricingCard>

          {/* Pro */}
          <PricingCard accentColor="#00ff88" delay={0.1}>
            {/* Badge */}
            <div style={{ position:"absolute", top:24, right:24,
              padding:"4px 12px", borderRadius:8,
              background:"rgba(0,255,136,0.07)", border:"1px solid rgba(0,255,136,0.15)",
              fontSize:11, fontFamily:"monospace", color:"#00ff88" }}>
              Coming soon
            </div>

            <div style={{ marginBottom:36 }}>
              <div style={{ fontFamily:"monospace", fontSize:11, color:"#00ff88",
                marginBottom:14, letterSpacing:"0.18em", textTransform:"uppercase" }}>Pro</div>
              <div style={{ display:"flex", alignItems:"flex-end", gap:4, marginBottom:6 }}>
                <span style={{ fontSize:64, fontWeight:700, color:"#fff", lineHeight:1 }}>$49</span>
                <span style={{ fontSize:20, color:"#333", marginBottom:8 }}>/mo</span>
              </div>
              <div style={{ fontSize:13, color:"#2a2a2a", fontFamily:"monospace" }}>Per workspace · cancel anytime</div>
            </div>

            <button disabled style={{ display:"block", width:"100%", padding:"14px 20px",
              background:"rgba(0,255,136,0.06)", color:"rgba(0,255,136,0.3)", fontSize:14,
              fontWeight:600, borderRadius:12, textAlign:"center", cursor:"not-allowed",
              border:"1px solid rgba(0,255,136,0.08)", marginBottom:32 }}>
              Join waitlist
            </button>

            <ul style={{ listStyle:"none", display:"flex", flexDirection:"column", gap:16 }}>
              {PRO.map((f, i) => {
                const locked = typeof f === "object";
                const text = locked ? (f as { locked: true; text: string }).text : f as string;
                return (
                  <li key={i} style={{ display:"flex", alignItems:"flex-start", gap:12,
                    fontSize:14, color: locked ? "#2a2a2a" : "#4a4a4a" }}>
                    {locked
                      ? <Lock style={{ width:15, height:15, color:"#1e1e1e", marginTop:1, flexShrink:0 }} />
                      : <Check style={{ width:15, height:15, color:"#00ff88", marginTop:1, flexShrink:0 }} />}
                    <span>
                      {text}
                      {locked && (
                        <span style={{ marginLeft:8, fontSize:10, padding:"2px 6px",
                          borderRadius:4, background:"#0e0e0e", color:"#2a2a2a",
                          fontFamily:"monospace", letterSpacing:"0.1em", textTransform:"uppercase" }}>
                          pro
                        </span>
                      )}
                    </span>
                  </li>
                );
              })}
            </ul>
          </PricingCard>
        </div>
      </Container>

      <style>{`
        @media (max-width: 720px) {
          .pricing-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </section>
  );
}
