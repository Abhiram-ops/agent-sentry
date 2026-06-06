"use client";

import React from "react";
import { useRef, useState } from "react";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { Check, Lock, Zap } from "lucide-react";
import Link from "next/link";
import { Container } from "@/components/ui/Container";

// Free tier: what the open-source CLI gives you out of the box
const FREE = [
  "AWS, Azure, GCP, GitHub & K8s scanners",
  "LangChain / CrewAI / AutoGen agent scanner",
  "P×R×E×A risk scoring engine",
  "MITRE ATT&CK technique mapping",
  "Blast radius analysis",
  "CLI — runs locally, no data leaves you",
  "Open source — MIT license",
];

// Pro tier: what you unlock with a license key
type ProItem = { locked?: true; text: string };
const PRO: ProItem[] = [
  { text: "Everything in Free" },
  { text: "--visualize: interactive HTML attack graph" },
  { text: "--enrich: CISA KEV threat intel enrichment" },
  { text: "--json: JSON output for pipelines & CI" },
  { text: "Interactive multi-cloud scan mode" },
  { text: "One-time purchase — license key, yours forever" },
  { text: "Priority email support" },
];

// ─── 3D pricing card ───────────────────────────────────────────────

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
      {/* Deep shadow */}
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

// ─── Section ────────────────────────────────────────────────────────────

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
            Free forever.<br />Pay once for Pro.
          </h2>
          <p style={{ color:"#a0a0a0", maxWidth:480, margin:"0 auto",
            fontSize:"clamp(0.95rem, 1.4vw, 1.05rem)", lineHeight:1.75 }}>
            The scanner is open source and always will be. Pro unlocks reports,
            enrichment, and JSON output — one payment, lifetime license.
          </p>
        </motion.div>

        {/* Cards */}
        <div style={{ display:"grid", gridTemplateColumns:"repeat(2, 1fr)", gap:20, maxWidth:900, margin:"0 auto" }}
          className="pricing-grid">

          {/* Free */}
          <PricingCard accentColor="#444" delay={0}>
            <div style={{ marginBottom:36 }}>
              <div style={{ fontFamily:"monospace", fontSize:11, color:"#888",
                marginBottom:14, letterSpacing:"0.18em", textTransform:"uppercase" }}>Community</div>
              <div style={{ display:"flex", alignItems:"flex-end", gap:4, marginBottom:6 }}>
                <span style={{ fontSize:64, fontWeight:700, color:"#fff", lineHeight:1 }}>$0</span>
              </div>
              <div style={{ fontSize:13, color:"#777777", fontFamily:"monospace" }}>Open source · MIT · free forever</div>
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
                <li key={i} style={{ display:"flex", alignItems:"flex-start", gap:12, fontSize:14, color:"#a0a0a0" }}>
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
              display:"flex", alignItems:"center", gap:6,
              padding:"4px 12px", borderRadius:8,
              background:"rgba(0,255,136,0.07)", border:"1px solid rgba(0,255,136,0.20)",
              fontSize:11, fontFamily:"monospace", color:"#00ff88" }}>
              <Zap style={{ width:10, height:10 }} />
              Available now
            </div>

            <div style={{ marginBottom:36 }}>
              <div style={{ fontFamily:"monospace", fontSize:11, color:"#00ff88",
                marginBottom:14, letterSpacing:"0.18em", textTransform:"uppercase" }}>Pro</div>
              <div style={{ display:"flex", alignItems:"flex-end", gap:4, marginBottom:6 }}>
                <span style={{ fontSize:64, fontWeight:700, color:"#fff", lineHeight:1 }}>$49</span>
              </div>
              <div style={{ fontSize:13, color:"#777777", fontFamily:"monospace" }}>One-time · license key · no subscription</div>
            </div>

            {/* Gumroad buy button — replace YOUR_GUMROAD_PRODUCT_ID with your actual Gumroad product URL */}
            <Link
              href="https://sentryagent.gumroad.com/l/eawugx"
              target="_blank"
              style={{ display:"block", width:"100%", padding:"14px 20px",
                background:"linear-gradient(135deg, #00ff88, #00cc6a)",
                color:"#000", fontSize:14, fontWeight:700, borderRadius:12,
                textAlign:"center", textDecoration:"none", marginBottom:32,
                transition:"all 0.2s ease",
                boxShadow:"0 0 32px rgba(0,255,136,0.25)" }}
              onMouseEnter={e=>{(e.currentTarget as HTMLElement).style.boxShadow="0 0 48px rgba(0,255,136,0.4)";(e.currentTarget as HTMLElement).style.transform="translateY(-1px)";}}
              onMouseLeave={e=>{(e.currentTarget as HTMLElement).style.boxShadow="0 0 32px rgba(0,255,136,0.25)";(e.currentTarget as HTMLElement).style.transform="translateY(0)";}}>
              Buy Pro — $49
            </Link>

            <ul style={{ listStyle:"none", display:"flex", flexDirection:"column", gap:16 }}>
              {PRO.map((f, i) => (
                <li key={i} style={{ display:"flex", alignItems:"flex-start", gap:12,
                  fontSize:14, color:"#a0a0a0" }}>
                  <Check style={{ width:15, height:15, color:"#00ff88", marginTop:1, flexShrink:0 }} />
                  <span>{f.text}</span>
                </li>
              ))}
            </ul>

            {/* Activate hint */}
            <div style={{ marginTop:28, padding:"12px 16px", borderRadius:10,
              background:"rgba(0,255,136,0.04)", border:"1px solid rgba(0,255,136,0.08)" }}>
              <div style={{ fontFamily:"monospace", fontSize:12, color:"#555", marginBottom:4 }}>After purchase:</div>
              <div style={{ fontFamily:"monospace", fontSize:12, color:"#00ff88" }}>
                agentsentry activate AS-XXXX-XXXX-XXXX-XXXX
              </div>
            </div>
          </PricingCard>
        </div>

        {/* Bottom note */}
        <motion.p initial={{ opacity: 0 }} whileInView={{ opacity: 1 }}
          viewport={{ once: true }} transition={{ duration: 0.5, delay: 0.3 }}
          style={{ textAlign:"center", marginTop:48, fontSize:13, color:"#555", fontFamily:"monospace" }}>
          Key delivered instantly by email · Works offline · No account required
        </motion.p>
      </Container>

      <style>{`
        @media (max-width: 720px) {
          .pricing-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </section>
  );
}
