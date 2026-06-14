"use client";

import { useState } from "react";
import { motion } from "framer-motion";

const PRESETS = [
  { label: "ML Pipeline (Admin)",  p:9, r:8, e:3, a:1.0, note:"IAM role with AdministratorAccess" },
  { label: "AI CRM Agent",         p:6, r:7, e:3, a:2.8, note:"LangChain agent with irreversible tools" },
  { label: "K8s cluster-admin SA", p:9, r:9, e:2, a:1.0, note:"ServiceAccount bound to cluster-admin" },
  { label: "GitHub Deploy Key",    p:5, r:4, e:4, a:1.0, note:"Read/write deploy key, internet-facing" },
  { label: "Monitoring SA (safe)", p:1, r:3, e:1, a:1.0, note:"Read-only, internal-only service account" },
];

const GAUGE_MAX = 1500; // 10 × 10 × 5 × 3

function severity(score: number) {
  if (score > 100) return { label: "CRITICAL", cls: "sev-critical", color: "#f87171" };
  if (score > 50)  return { label: "HIGH",     cls: "sev-high",     color: "#fb923c" };
  if (score > 20)  return { label: "MEDIUM",   cls: "sev-medium",   color: "#fbbf24" };
  return               { label: "LOW",      cls: "sev-low",      color: "#4ade80" };
}

function trackStyle(value: number, min: number, max: number) {
  const pct = ((value - min) / (max - min)) * 100;
  return { background: `linear-gradient(to right, #1d4ed8 ${pct}%, #1a2540 ${pct}%)` };
}

function Slider({ k, label, desc, value, min, max, step = 1, onChange }: {
  k: string; label: string; desc: string; value: number; min: number; max: number; step?: number;
  onChange: (v: number) => void;
}) {
  return (
    <div>
      <div className="slider-header">
        <div className="slider-label-wrap">
          <span className="slider-key">{k}</span>
          <span className="slider-name">{label}</span>
          <span className="slider-desc">{desc}</span>
        </div>
        <span className="slider-val">{value.toFixed(1)}</span>
      </div>
      <input
        type="range" className="prea-slider"
        min={min} max={max} step={step} value={value}
        style={trackStyle(value, min, max)}
        onChange={(e) => onChange(parseFloat(e.target.value))}
      />
    </div>
  );
}

export default function RiskCalculator() {
  const [p, setP] = useState(7);
  const [r, setR] = useState(6);
  const [e, setE] = useState(3);
  const [a, setA] = useState(1.5);

  const score = p * r * e * a;
  const sev = severity(score);
  const pct = Math.min(100, (score / GAUGE_MAX) * 100);

  const apply = (preset: typeof PRESETS[0]) => {
    setP(preset.p); setR(preset.r); setE(preset.e); setA(preset.a);
  };

  return (
    <section id="calculator" className="section section-dark">
      <div className="container">
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }} transition={{ duration: 0.5 }}
          className="section-header centered">
          <div className="section-label" style={{ justifyContent: "center" }}>P×R×E×A Calculator</div>
          <h2>Compute any NHI&apos;s risk score.</h2>
          <p>
            Drag the sliders or pick a preset to see how Privilege, Reachability, Exposure,
            and AI-Amplification combine into a real risk score.
          </p>
        </motion.div>

        <div className="prea-layout">
          <motion.div initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }} transition={{ duration: 0.5 }}
            className="prea-sliders">
            <Slider k="P" label="Privilege" desc="(0–10)" value={p} min={0} max={10} onChange={setP} />
            <Slider k="R" label="Reachability" desc="(0–10)" value={r} min={0} max={10} onChange={setR} />
            <Slider k="E" label="Exposure" desc="(0–5)" value={e} min={0} max={5} onChange={setE} />
            <Slider k="A" label="AI-Amplification" desc="(1–3×)" value={a} min={1} max={3} step={0.1} onChange={setA} />
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }} transition={{ duration: 0.5, delay: 0.08 }}
            className="prea-card">
            <div className="prea-formula-bar">
              <span>{p.toFixed(1)}</span> × <span>{r.toFixed(1)}</span> × <span>{e.toFixed(1)}</span> × <span>{a.toFixed(1)}</span> = <strong style={{ color: "white" }}>{score.toFixed(1)}</strong>
            </div>

            <div className="prea-score-area">
              <div className="prea-score-num" style={{ color: sev.color }}>{score % 1 === 0 ? score.toFixed(0) : score.toFixed(1)}</div>
              <div className={`prea-sev-badge ${sev.cls}`}>{sev.label}</div>
              <div className="prea-gauge-track">
                <div className="prea-gauge-fill" style={{ width: `${pct}%`, backgroundColor: sev.color }} />
              </div>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "#475569" }}>
                threshold: &gt;100 CRITICAL · &gt;50 HIGH · &gt;20 MEDIUM
              </div>
            </div>

            <div className="prea-breakdown">
              <div className="breakdown-cell"><div className="breakdown-key">P</div><div className="breakdown-value">{p.toFixed(1)}</div></div>
              <div className="breakdown-cell"><div className="breakdown-key">R</div><div className="breakdown-value">{r.toFixed(1)}</div></div>
              <div className="breakdown-cell"><div className="breakdown-key">E</div><div className="breakdown-value">{e.toFixed(1)}</div></div>
              <div className="breakdown-cell"><div className="breakdown-key">A</div><div className="breakdown-value">{a.toFixed(1)}</div></div>
            </div>

            <div className="presets-label">Real-world presets</div>
            <div className="presets-list">
              {PRESETS.map((preset) => {
                const presetScore = preset.p * preset.r * preset.e * preset.a;
                return (
                  <button key={preset.label} className="preset-btn" onClick={() => apply(preset)}>
                    <span className="preset-btn-name">{preset.label}</span>
                    <span className="preset-btn-score" style={{ color: severity(presetScore).color }}>
                      {presetScore.toFixed(0)}
                    </span>
                  </button>
                );
              })}
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
