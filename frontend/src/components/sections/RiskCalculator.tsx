"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Container } from "@/components/ui/Container";

const PRESETS = [
  { label: "ML Pipeline (Admin)",  p:9, r:8, e:3, a:1.0, note:"IAM role with AdministratorAccess" },
  { label: "AI CRM Agent",         p:6, r:7, e:3, a:2.8, note:"LangChain agent with irreversible tools" },
  { label: "K8s cluster-admin SA", p:9, r:9, e:2, a:1.0, note:"ServiceAccount bound to cluster-admin" },
  { label: "GitHub Deploy Key",    p:5, r:4, e:4, a:1.0, note:"Read/write deploy key, internet-facing" },
  { label: "Monitoring SA (safe)", p:1, r:3, e:1, a:1.0, note:"Read-only, internal-only service account" },
];

function riskLevel(score: number) {
  if (score > 100) return { label:"CRITICAL", color:"#ff3366", bg:"rgba(255,51,102,0.10)" };
  if (score > 50)  return { label:"HIGH",     color:"#ffcc00", bg:"rgba(255,204,0,0.10)" };
  if (score > 20)  return { label:"MEDIUM",   color:"#ff8800", bg:"rgba(255,136,0,0.10)" };
  return             { label:"LOW",      color:"#00cc66", bg:"rgba(0,204,102,0.10)" };
}

function Slider({ label, desc, value, min, max, step = 1, onChange, color }: {
  label: string; desc: string; value: number; min: number; max: number; step?: number;
  onChange: (v: number) => void; color: string;
}) {
  return (
    <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"baseline" }}>
        <div>
          <span style={{ color:"#fff", fontWeight:600, fontSize:14 }}>{label}</span>
          <span style={{ color:"#3a3a3a", fontSize:12, marginLeft:8 }}>{desc}</span>
        </div>
        <span style={{ fontFamily:"monospace", fontSize:20, fontWeight:700, color, minWidth:40, textAlign:"right" }}>{value}</span>
      </div>
      <div style={{ position:"relative", height:6 }}>
        <div style={{ position:"absolute", inset:0, borderRadius:3, background:"rgba(255,255,255,0.06)" }} />
        <div style={{ position:"absolute", left:0, top:0, bottom:0, borderRadius:3, background:color, width:`${((value-min)/(max-min))*100}%`, transition:"width 0.1s" }} />
        <input type="range" min={min} max={max} step={step} value={value}
          onChange={e => onChange(parseFloat(e.target.value))}
          style={{ position:"absolute", inset:0, width:"100%", opacity:0, cursor:"pointer", height:6, margin:0 }} />
        <div style={{
          position:"absolute", top:"50%", transform:"translate(-50%,-50%)",
          left:`${((value-min)/(max-min))*100}%`,
          width:16, height:16, borderRadius:"50%", background:color,
          border:"2px solid #000", boxShadow:`0 0 8px ${color}80`,
          pointerEvents:"none", transition:"left 0.1s",
        }} />
      </div>
    </div>
  );
}

export default function RiskCalculator() {
  const [p, setP] = useState(7);
  const [r, setR] = useState(6);
  const [e, setE] = useState(3);
  const [a, setA] = useState(1.5);

  const score = p * r * e * a;
  const lvl   = riskLevel(score);
  const pct   = Math.min(100, (score / 500) * 100);

  const apply = (preset: typeof PRESETS[0]) => {
    setP(preset.p); setR(preset.r); setE(preset.e); setA(preset.a);
  };

  return (
    <section style={{ padding:"120px 0", position:"relative", overflow:"hidden" }}>
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/[0.04] to-transparent" />

      <Container>
        <motion.div initial={{ opacity:0, y:20 }} whileInView={{ opacity:1, y:0 }}
          viewport={{ once:true, margin:"-80px" }} transition={{ duration:0.5 }}
          style={{ textAlign:"center", marginBottom:64 }}>
          <div style={{ fontFamily:"monospace", fontSize:11, color:"#00ff88", marginBottom:16, letterSpacing:"0.2em", textTransform:"uppercase" }}>P×R×E×A Calculator</div>
          <h2 style={{ fontSize:"clamp(2rem,3.5vw,3rem)", fontWeight:700, color:"#fff", marginBottom:16, lineHeight:1.1, letterSpacing:"-0.02em" }}>
            Compute any NHI&apos;s risk score.
          </h2>
          <p style={{ color:"#4a4a4a", maxWidth:480, margin:"0 auto", fontSize:"clamp(0.95rem,1.4vw,1.05rem)", lineHeight:1.75 }}>
            Drag the sliders or pick a preset to see how Privilege, Reachability, Exposure,
            and AI-Amplification combine into a real risk score.
          </p>
        </motion.div>

        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:20, maxWidth:960, margin:"0 auto" }} className="calc-grid">
          {/* Sliders */}
          <motion.div initial={{ opacity:0, y:24 }} whileInView={{ opacity:1, y:0 }}
            viewport={{ once:true }} transition={{ duration:0.5 }}
            style={{ padding:"36px 32px", borderRadius:20, border:"1px solid rgba(255,255,255,0.06)", background:"linear-gradient(145deg,#070707,#050505)", display:"flex", flexDirection:"column", gap:28 }}>

            <Slider label="P" desc="Privilege (0–10)"         value={p} min={0} max={10} onChange={setP} color="#ff3366" />
            <Slider label="R" desc="Reachability (0–10)"      value={r} min={0} max={10} onChange={setR} color="#ff8800" />
            <Slider label="E" desc="Exposure (0–5)"           value={e} min={0} max={5}  onChange={setE} color="#ffcc00" />
            <Slider label="A" desc="AI-Amplification (1–3×)"  value={a} min={1} max={3}  step={0.1} onChange={setA} color="#0099ff" />

            {/* Formula */}
            <div style={{ padding:"14px 16px", borderRadius:10, background:"rgba(255,255,255,0.02)", border:"1px solid rgba(255,255,255,0.05)", fontFamily:"monospace", fontSize:14, color:"#333", display:"flex", alignItems:"center", gap:8, flexWrap:"wrap" }}>
              <span style={{ color:"#ff3366" }}>{p}</span>
              <span>×</span>
              <span style={{ color:"#ff8800" }}>{r}</span>
              <span>×</span>
              <span style={{ color:"#ffcc00" }}>{e}</span>
              <span>×</span>
              <span style={{ color:"#0099ff" }}>{a.toFixed(1)}</span>
              <span>=</span>
              <span style={{ color:"#fff", fontWeight:700, fontSize:16 }}>{score.toFixed(1)}</span>
            </div>
          </motion.div>

          {/* Score display */}
          <motion.div initial={{ opacity:0, y:24 }} whileInView={{ opacity:1, y:0 }}
            viewport={{ once:true }} transition={{ duration:0.5, delay:0.08 }}
            style={{ display:"flex", flexDirection:"column", gap:16 }}>

            {/* Big score */}
            <div style={{ padding:"32px 28px", borderRadius:20, border:`1px solid ${lvl.color}25`, background:`linear-gradient(145deg, #070707, #050505)`, flex:1, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:12, position:"relative", overflow:"hidden" }}>
              <div style={{ height:2, position:"absolute", top:0, left:0, right:0, background:`linear-gradient(90deg, transparent, ${lvl.color}50, transparent)` }} />
              <motion.div key={lvl.label} initial={{ scale:0.85, opacity:0 }} animate={{ scale:1, opacity:1 }} transition={{ duration:0.25 }}
                style={{ padding:"6px 18px", borderRadius:20, background:lvl.bg, color:lvl.color, border:`1px solid ${lvl.color}30`, fontFamily:"monospace", fontWeight:700, fontSize:13, letterSpacing:"0.12em" }}>
                {lvl.label}
              </motion.div>
              <motion.div key={score.toFixed(0)} initial={{ y:10, opacity:0 }} animate={{ y:0, opacity:1 }} transition={{ duration:0.2 }}
                style={{ fontSize:"clamp(3rem,6vw,5rem)", fontWeight:700, fontFamily:"monospace", color:lvl.color, lineHeight:1, letterSpacing:"-0.03em" }}>
                {score.toFixed(1)}
              </motion.div>
              {/* Progress bar */}
              <div style={{ width:"100%", height:6, borderRadius:3, background:"rgba(255,255,255,0.05)", overflow:"hidden" }}>
                <motion.div layout style={{ height:"100%", borderRadius:3, background:lvl.color, width:`${pct}%` }} transition={{ duration:0.3 }} />
              </div>
              <div style={{ fontSize:12, color:"#2a2a2a", fontFamily:"monospace" }}>
                threshold: &gt;100 CRITICAL · &gt;50 HIGH · &gt;20 MEDIUM
              </div>
            </div>

            {/* Presets */}
            <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
              <div style={{ fontSize:11, fontFamily:"monospace", color:"#2a2a2a", letterSpacing:"0.1em", textTransform:"uppercase", marginBottom:4 }}>Real-world presets</div>
              {PRESETS.map(preset => (
                <button key={preset.label} onClick={() => apply(preset)}
                  style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"9px 14px", borderRadius:10, border:"1px solid rgba(255,255,255,0.05)", background:"rgba(255,255,255,0.02)", cursor:"pointer", textAlign:"left", transition:"all 0.15s" }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.05)"; (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.10)"; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.02)"; (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.05)"; }}>
                  <div>
                    <div style={{ color:"#888", fontSize:13 }}>{preset.label}</div>
                    <div style={{ color:"#2a2a2a", fontSize:11, fontFamily:"monospace", marginTop:2 }}>{preset.note}</div>
                  </div>
                  <div style={{ fontFamily:"monospace", fontSize:14, fontWeight:700, color: riskLevel(preset.p*preset.r*preset.e*preset.a).color }}>
                    {(preset.p*preset.r*preset.e*preset.a).toFixed(0)}
                  </div>
                </button>
              ))}
            </div>
          </motion.div>
        </div>
      </Container>

      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/[0.04] to-transparent" />
      <style>{`
        @media (max-width: 720px) { .calc-grid { grid-template-columns: 1fr !important; } }
      `}</style>
    </section>
  );
}
