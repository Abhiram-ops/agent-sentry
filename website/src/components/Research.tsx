"use client";

import { motion } from "framer-motion";
import { BookOpen, ArrowRight, FileText, Award } from "lucide-react";
import Link from "next/link";
import Container from "./Container";

const HIGHLIGHTS = [
  { icon: Award,    label: "Novel contribution",   text: "AI-Amplification Factor — no prior paper defines this metric" },
  { icon: FileText, label: "IEEE format, 4 pages", text: "Mathematical framework, real AWS scan results as validation" },
  { icon: BookOpen, label: "PXRXA scoring model",  text: "First model to account for autonomous AI agent blast radius" },
];

export default function Research() {
  return (
    <section id="research" style={{ padding: "120px 0", position: "relative", overflow: "hidden" }}>
      {/* Background glow */}
      <div className="absolute pointer-events-none" style={{
        bottom:"-10%", left:"50%", transform:"translateX(-50%)",
        width:700, height:350, borderRadius:"50%",
        background:"radial-gradient(ellipse, rgba(0,153,255,0.04) 0%, transparent 70%)",
        filter:"blur(60px)",
      }} />
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/[0.04] to-transparent" />

      <Container className="relative">
        {/* Header */}
        <motion.div initial={{ opacity:0, y:20 }} whileInView={{ opacity:1, y:0 }}
          viewport={{ once:true, margin:"-80px" }} transition={{ duration:0.5 }}
          style={{ textAlign:"center", marginBottom:72 }}>
          <div style={{ fontFamily:"monospace", fontSize:11, color:"#0099ff",
            marginBottom:20, letterSpacing:"0.2em", textTransform:"uppercase" }}>Research</div>
          <h2 style={{ fontSize:"clamp(2rem, 3.5vw, 3rem)", fontWeight:700, color:"#fff",
            marginBottom:20, lineHeight:1.1, letterSpacing:"-0.02em" }}>
            Peer-reviewed.<br />Production-validated.
          </h2>
          <p style={{ color:"#4a4a4a", maxWidth:480, margin:"0 auto",
            fontSize:"clamp(0.95rem, 1.4vw, 1.05rem)", lineHeight:1.75 }}>
            The mathematical model behind AgentSentry is published as a research paper.
            Real scan results. Real AWS environments. Novel metric introduced.
          </p>
        </motion.div>

        {/* Paper card */}
        <motion.div initial={{ opacity:0, y:28 }} whileInView={{ opacity:1, y:0 }}
          viewport={{ once:true, margin:"-60px" }} transition={{ duration:0.6, delay:0.1 }}
          style={{ maxWidth:820, margin:"0 auto" }}>
          <div style={{
            border:"1px solid rgba(0,153,255,0.14)",
            background:"linear-gradient(160deg, #070707 0%, #050505 100%)",
            borderRadius:20, overflow:"hidden",
            boxShadow:"0 40px 80px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.04)",
          }}>
            {/* Top accent */}
            <div style={{ height:2, background:"linear-gradient(90deg, transparent, rgba(0,153,255,0.5), transparent)" }} />

            <div style={{ padding:"48px 48px 40px" }}>
              <div style={{ display:"flex", alignItems:"flex-start", gap:20, marginBottom:40, flexWrap:"wrap" }}>
                {/* Paper icon */}
                <div style={{
                  width:52, height:52, borderRadius:14, flexShrink:0,
                  background:"rgba(0,153,255,0.08)", border:"1px solid rgba(0,153,255,0.18)",
                  display:"flex", alignItems:"center", justifyContent:"center",
                }}>
                  <BookOpen style={{ width:22, height:22, color:"#0099ff" }} />
                </div>

                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontFamily:"monospace", fontSize:11, color:"#0099ff",
                    marginBottom:10, letterSpacing:"0.14em", textTransform:"uppercase" }}>
                    IEEE Format · 2026 · Research Preview
                  </div>
                  <h3 style={{ color:"#fff", fontWeight:700, fontSize:"clamp(1.05rem, 2vw, 1.35rem)",
                    lineHeight:1.35, letterSpacing:"-0.01em", marginBottom:12 }}>
                    AgentSentry: A Risk Quantification Framework for Non-Human Identities and AI Agents in Cloud Environments
                  </h3>
                  <p style={{ color:"#3a3a3a", fontSize:13, fontFamily:"monospace" }}>Abhiram Lanka · 2026</p>
                </div>
              </div>

              {/* Highlights */}
              <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:20, marginBottom:40 }} className="research-grid">
                {HIGHLIGHTS.map((h, i) => {
                  const Icon = h.icon;
                  return (
                    <div key={i} style={{
                      padding:"20px 20px", borderRadius:12,
                      border:"1px solid rgba(255,255,255,0.05)",
                      background:"rgba(255,255,255,0.015)",
                    }}>
                      <Icon style={{ width:16, height:16, color:"#0099ff", marginBottom:10 }} />
                      <div style={{ color:"#888", fontSize:11, fontFamily:"monospace",
                        marginBottom:6, textTransform:"uppercase", letterSpacing:"0.1em" }}>{h.label}</div>
                      <div style={{ color:"#4a4a4a", fontSize:13, lineHeight:1.65 }}>{h.text}</div>
                    </div>
                  );
                })}
              </div>

              {/* Formula callout */}
              <div style={{
                padding:"20px 24px", borderRadius:12,
                border:"1px solid rgba(0,153,255,0.10)",
                background:"rgba(0,153,255,0.04)", marginBottom:40,
                fontFamily:"monospace",
              }}>
                <div style={{ fontSize:11, color:"#0099ff", marginBottom:8, letterSpacing:"0.1em", textTransform:"uppercase" }}>
                  Core formula
                </div>
                <div style={{ color:"#777", fontSize:15, letterSpacing:"0.06em" }}>
                  Risk Score = <span style={{ color:"#fff" }}>P</span>
                  <span style={{ color:"#555" }}> × </span>
                  <span style={{ color:"#fff" }}>R</span>
                  <span style={{ color:"#555" }}> × </span>
                  <span style={{ color:"#fff" }}>E</span>
                  <span style={{ color:"#555" }}> × </span>
                  <span style={{ color:"#0099ff" }}>A</span>
                </div>
                <div style={{ fontSize:12, color:"#333", marginTop:8, lineHeight:1.8 }}>
                  Privilege × Reachability × Exposure × <span style={{ color:"#0099ff" }}>AI-Amplification Factor</span>
                </div>
              </div>

              {/* CTAs */}
              <div style={{ display:"flex", gap:14, flexWrap:"wrap" }}>
                <Link href="https://github.com/Abhiram-ops/agent-sentry" target="_blank"
                  style={{ display:"flex", alignItems:"center", gap:8,
                    padding:"12px 24px", background:"rgba(0,153,255,0.10)",
                    border:"1px solid rgba(0,153,255,0.20)", color:"#0099ff",
                    fontSize:14, fontWeight:600, borderRadius:10, textDecoration:"none",
                    transition:"all 0.2s ease" }}
                  onMouseEnter={e=>{(e.currentTarget as HTMLElement).style.background="rgba(0,153,255,0.16)";}}
                  onMouseLeave={e=>{(e.currentTarget as HTMLElement).style.background="rgba(0,153,255,0.10)";}}>
                  <BookOpen style={{ width:15, height:15 }} />
                  View on GitHub
                  <ArrowRight style={{ width:14, height:14 }} />
                </Link>
                <div style={{ display:"flex", alignItems:"center", gap:8,
                  padding:"12px 20px", border:"1px solid rgba(255,255,255,0.06)",
                  color:"#2a2a2a", fontSize:14, borderRadius:10, fontFamily:"monospace" }}>
                  arXiv submission — coming soon
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </Container>

      <style>{`
        @media (max-width: 640px) {
          .research-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </section>
  );
}
