"use client";

import { motion } from "framer-motion";
import { Search, BarChart2, Map } from "lucide-react";
import Container from "./Container";

const STEPS = [
  {
    n: "01",
    icon: Search,
    title: "Discover",
    color: "#00ff88",
    desc: "Point AgentSentry at your AWS account. It enumerates every IAM role, access key, service account, OAuth token, and AI agent in minutes — including ones you forgot existed.",
  },
  {
    n: "02",
    icon: BarChart2,
    title: "Score",
    color: "#0099ff",
    desc: "Each identity gets a P×R×E×A risk score: Privilege × Reachability × Exposure × AI-Amplification. Critical identities surface immediately. CISA KEV enrichment flags active CVEs.",
  },
  {
    n: "03",
    icon: Map,
    title: "Visualize",
    color: "#ff3366",
    desc: "An interactive attack graph shows every identity and the access paths between them. See exactly what an attacker could reach if any given identity is compromised.",
  },
];

export default function HowItWorks() {
  return (
    <section id="how-it-works" style={{ padding: "120px 0", position: "relative", overflow: "hidden" }}>
      {/* Subtle grid bg */}
      <div className="absolute inset-0 pointer-events-none" style={{
        backgroundImage: "linear-gradient(rgba(255,255,255,0.018) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.018) 1px, transparent 1px)",
        backgroundSize: "72px 72px",
      }} />
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/[0.04] to-transparent" />

      <Container className="relative">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }} transition={{ duration: 0.5 }}
          style={{ textAlign: "center", marginBottom: 80 }}>
          <div style={{ fontFamily:"monospace", fontSize:11, color:"#00ff88",
            marginBottom:20, letterSpacing:"0.2em", textTransform:"uppercase" }}>How it works</div>
          <h2 style={{ fontSize:"clamp(2rem, 3.5vw, 3rem)", fontWeight:700, color:"#fff",
            marginBottom:20, lineHeight:1.1, letterSpacing:"-0.02em" }}>
            From zero to attack graph<br />in under three minutes.
          </h2>
          <p style={{ color:"#4a4a4a", maxWidth:440, margin:"0 auto",
            fontSize:"clamp(0.95rem, 1.4vw, 1.05rem)", lineHeight:1.75 }}>
            No agents to deploy. No SaaS data upload. Runs entirely local — your cloud
            credentials never leave your machine.
          </p>
        </motion.div>

        {/* Steps */}
        <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:24, position:"relative" }} className="steps-grid">
          {/* Connecting line (desktop only) */}
          <div className="steps-line" style={{
            position:"absolute", top:36, left:"16.5%", right:"16.5%", height:1,
            background:"linear-gradient(90deg, #00ff88, #0099ff, #ff3366)",
            opacity:0.12, pointerEvents:"none",
          }} />

          {STEPS.map((step, i) => {
            const Icon = step.icon;
            return (
              <motion.div key={i}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ duration: 0.5, delay: i * 0.12 }}
                style={{ display:"flex", flexDirection:"column", alignItems:"center", textAlign:"center", gap:24 }}>
                {/* Circle number */}
                <div style={{ position:"relative" }}>
                  <div style={{
                    width:72, height:72, borderRadius:"50%",
                    border:`1px solid ${step.color}28`,
                    background:`${step.color}08`,
                    display:"flex", alignItems:"center", justifyContent:"center",
                    boxShadow:`0 0 32px ${step.color}14`,
                    position:"relative", zIndex:1,
                  }}>
                    <Icon style={{ width:24, height:24, color:step.color }} />
                  </div>
                  {/* Step number */}
                  <div style={{
                    position:"absolute", top:-8, right:-8,
                    width:22, height:22, borderRadius:"50%",
                    background:"#000", border:`1px solid ${step.color}40`,
                    display:"flex", alignItems:"center", justifyContent:"center",
                    fontSize:10, fontFamily:"monospace", color:step.color, fontWeight:700,
                  }}>
                    {step.n}
                  </div>
                </div>

                <div>
                  <h3 style={{ color:"#fff", fontWeight:600, fontSize:18, marginBottom:12, letterSpacing:"-0.01em" }}>
                    {step.title}
                  </h3>
                  <p style={{ color:"#4a4a4a", fontSize:14, lineHeight:1.75, maxWidth:280, margin:"0 auto" }}>
                    {step.desc}
                  </p>
                </div>
              </motion.div>
            );
          })}
        </div>
      </Container>

      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/[0.04] to-transparent" />

      <style>{`
        @media (max-width: 720px) {
          .steps-grid { grid-template-columns: 1fr !important; }
          .steps-line { display: none !important; }
        }
      `}</style>
    </section>
  );
}
