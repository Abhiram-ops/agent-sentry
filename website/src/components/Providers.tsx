"use client";

import { useRef, useState } from "react";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import Container from "./Container";

const PROVIDERS = [
  {
    name: "Amazon Web Services",
    key: "aws",
    color: "#FF9900",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" style={{ width: 22, height: 22 }}>
        <path d="M6.76 16.45c-.34.1-.71.16-1.1.16-1.88 0-3.4-1.52-3.4-3.4s1.52-3.4 3.4-3.4c.18 0 .36.01.53.04" stroke="#FF9900" strokeWidth="1.5" strokeLinecap="round"/>
        <path d="M18 10.26C17.45 7.84 15.3 6 12.74 6c-1.96 0-3.7.96-4.77 2.43" stroke="#FF9900" strokeWidth="1.5" strokeLinecap="round"/>
        <path d="M19.5 10.5a4 4 0 010 8H7" stroke="#FF9900" strokeWidth="1.5" strokeLinecap="round"/>
        <path d="M9 19l-2-2 2-2M15 19l2-2-2-2" stroke="#FF9900" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
    discovers: ["IAM Roles & Access Keys", "Lambda execution roles", "S3, RDS, Secrets Manager"],
    install: "pip install agentsentry[aws]",
    setup: "aws configure",
    badge: null,
  },
  {
    name: "Microsoft Azure",
    key: "azure",
    color: "#0089D6",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" style={{ width: 22, height: 22 }}>
        <path d="M12 3L3 17h4l2-3.5L14 20h7L12 3z" stroke="#0089D6" strokeWidth="1.5" strokeLinejoin="round"/>
      </svg>
    ),
    discovers: ["Managed Identities", "Service Principals", "Role assignments (Owner/Contributor)"],
    install: "pip install agentsentry[azure]",
    setup: "az login",
    badge: null,
  },
  {
    name: "Google Cloud",
    key: "gcp",
    color: "#4285F4",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" style={{ width: 22, height: 22 }}>
        <circle cx="12" cy="12" r="4" stroke="#4285F4" strokeWidth="1.5"/>
        <path d="M12 2v3M12 19v3M2 12h3M19 12h3" stroke="#4285F4" strokeWidth="1.5" strokeLinecap="round"/>
        <path d="M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1" stroke="#4285F4" strokeWidth="1.3" strokeLinecap="round"/>
      </svg>
    ),
    discovers: ["Service Accounts", "User-managed SA keys", "Project IAM bindings"],
    install: "pip install agentsentry[gcp]",
    setup: "gcloud auth application-default login",
    badge: null,
  },
  {
    name: "GitHub",
    key: "github",
    color: "#58a6ff",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" style={{ width: 22, height: 22 }}>
        <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 00-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0020 4.77 5.07 5.07 0 0019.91 1S18.73.65 16 2.48a13.38 13.38 0 00-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 005 4.77a5.44 5.44 0 00-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 009 18.13V22" stroke="#58a6ff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
    discovers: ["Personal Access Tokens", "Deploy Keys & SSH Keys", "Actions Secrets"],
    install: null,
    setup: "export GITHUB_TOKEN=<pat>",
    badge: null,
  },
  {
    name: "Kubernetes",
    key: "k8s",
    color: "#326CE5",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" style={{ width: 22, height: 22 }}>
        <circle cx="12" cy="12" r="9" stroke="#326CE5" strokeWidth="1.5"/>
        <circle cx="12" cy="12" r="3" stroke="#326CE5" strokeWidth="1.5"/>
        <path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1" stroke="#326CE5" strokeWidth="1.3" strokeLinecap="round"/>
      </svg>
    ),
    discovers: ["ServiceAccounts & RBAC", "ClusterRoleBindings", "Automount token exposure"],
    install: "pip install agentsentry[k8s]",
    setup: "kubectl config use-context <cluster>",
    badge: null,
  },
  {
    name: "Local Environment",
    key: "local",
    color: "#00ff88",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" style={{ width: 22, height: 22 }}>
        <rect x="2" y="3" width="20" height="14" rx="2" stroke="#00ff88" strokeWidth="1.5"/>
        <path d="M8 21h8M12 17v4" stroke="#00ff88" strokeWidth="1.5" strokeLinecap="round"/>
        <path d="M7 8l3 3-3 3M13 14h4" stroke="#00ff88" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
    discovers: ["Env vars & .env files", "SSH keys & credential files", "Docker socket & git tokens"],
    install: null,
    setup: null,
    badge: "No credentials needed",
  },
];

// ─── 3D tilt provider card ─────────────────────────────────────────────────

function ProviderCard({ p, index }: { p: typeof PROVIDERS[0]; index: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const sx = useSpring(mx, { stiffness: 300, damping: 26 });
  const sy = useSpring(my, { stiffness: 300, damping: 26 });
  const rotX = useTransform(sy, [-0.5, 0.5], [8, -8]);
  const rotY = useTransform(sx, [-0.5, 0.5], [-8, 8]);
  const [shine, setShine] = useState({ x: 50, y: 50, on: false });

  const onMove = (e: React.MouseEvent) => {
    const r = ref.current?.getBoundingClientRect();
    if (!r) return;
    mx.set((e.clientX - r.left) / r.width - 0.5);
    my.set((e.clientY - r.top) / r.height - 0.5);
    setShine({ x: ((e.clientX - r.left) / r.width) * 100, y: ((e.clientY - r.top) / r.height) * 100, on: true });
  };
  const onLeave = () => { mx.set(0); my.set(0); setShine(s => ({ ...s, on: false })); };

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.45, delay: index * 0.07 }}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      style={{ rotateX: rotX, rotateY: rotY, transformPerspective: 900, transformStyle: "preserve-3d" }}
      whileHover={{ scale: 1.02, y: -3 }}
      className="relative group cursor-default"
    >
      <div className="relative rounded-2xl overflow-hidden h-full" style={{
        padding: "28px 28px",
        border: `1px solid ${p.color}18`,
        background: "linear-gradient(145deg, #070707 0%, #050505 100%)",
        boxShadow: `0 20px 48px rgba(0,0,0,0.5), 0 0 0 1px ${p.color}08`,
      }}>
        {/* Top line */}
        <div className="absolute top-0 left-0 right-0 h-px"
          style={{ background: `linear-gradient(90deg, transparent, ${p.color}45, transparent)` }} />

        {/* Cursor shine */}
        <div className="absolute inset-0 rounded-2xl pointer-events-none" style={{
          background: shine.on ? `radial-gradient(circle at ${shine.x}% ${shine.y}%, ${p.color}12 0%, transparent 55%)` : "transparent",
          transition: "background 0.12s",
        }} />

        {/* Provider icon + name */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
          <div style={{
            width: 44, height: 44, borderRadius: 12, flexShrink: 0,
            background: `${p.color}10`, border: `1px solid ${p.color}25`,
            display: "flex", alignItems: "center", justifyContent: "center",
            transition: "transform 0.25s ease",
          }} className="prov-icon">
            {p.icon}
          </div>
          <div>
            <div style={{ color: "#fff", fontWeight: 600, fontSize: 15, letterSpacing: "-0.01em" }}>
              {p.name}
            </div>
            <div style={{ fontFamily: "monospace", fontSize: 11, color: p.color, opacity: 0.7, marginTop: 2 }}>
              agentsentry scan {p.key}
            </div>
          </div>
          {p.badge && (
            <div style={{
              marginLeft: "auto", padding: "3px 10px", borderRadius: 20,
              background: `${p.color}10`, border: `1px solid ${p.color}25`,
              fontSize: 10, color: p.color, fontFamily: "monospace", whiteSpace: "nowrap",
            }}>
              {p.badge}
            </div>
          )}
        </div>

        {/* What it discovers */}
        <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: 8, marginBottom: 20 }}>
          {p.discovers.map((d, i) => (
            <li key={i} style={{ display: "flex", alignItems: "flex-start", gap: 8, fontSize: 13, color: "#4a4a4a" }}>
              <span style={{ color: p.color, fontSize: 10, marginTop: 3, flexShrink: 0 }}>▸</span>
              {d}
            </li>
          ))}
        </ul>

        {/* Install / setup */}
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {p.install ? (
            <div style={{
              padding: "7px 12px", borderRadius: 8, fontFamily: "monospace", fontSize: 11,
              border: "1px solid rgba(255,255,255,0.05)", background: "rgba(255,255,255,0.02)",
              color: "#3a3a3a", cursor: "text", userSelect: "all",
            }}>
              <span style={{ color: p.color }}>$</span> {p.install}
            </div>
          ) : (
            <div style={{ height: 30 }} />
          )}
          {p.setup && (
            <div style={{
              padding: "7px 12px", borderRadius: 8, fontFamily: "monospace", fontSize: 11,
              border: "1px solid rgba(255,255,255,0.04)", background: "rgba(255,255,255,0.01)",
              color: "#2a2a2a", cursor: "text", userSelect: "all",
            }}>
              <span style={{ color: "#444" }}>$</span> {p.setup}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

// ─── Section ───────────────────────────────────────────────────────────────

export default function Providers() {
  return (
    <section id="providers" style={{ padding: "120px 0", position: "relative", overflow: "hidden" }}>
      {/* Subtle grid */}
      <div className="absolute inset-0 pointer-events-none" style={{
        backgroundImage: "linear-gradient(rgba(255,255,255,0.015) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.015) 1px, transparent 1px)",
        backgroundSize: "64px 64px",
      }} />
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/[0.04] to-transparent" />

      <Container className="relative">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }} transition={{ duration: 0.5 }}
          style={{ marginBottom: 72 }}>
          <div style={{ fontFamily:"monospace", fontSize:11, color:"#00ff88",
            marginBottom:20, letterSpacing:"0.2em", textTransform:"uppercase" }}>
            Providers
          </div>
          <h2 style={{ fontSize:"clamp(2rem, 3.5vw, 3rem)", fontWeight:700, color:"#fff",
            marginBottom:20, lineHeight:1.1, letterSpacing:"-0.02em" }}>
            Not just AWS.<br />Everywhere you deploy.
          </h2>
          <p style={{ color:"#4a4a4a", maxWidth:520,
            fontSize:"clamp(0.95rem, 1.4vw, 1.05rem)", lineHeight:1.75 }}>
            Six independent providers — install only what you need.
            Each one checks its own permissions before touching a single API.
            Start with <span style={{ color:"#00ff88", fontFamily:"monospace" }}>local</span> — it
            needs nothing and finds more than you expect.
          </p>
        </motion.div>

        {/* Provider grid */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }} className="prov-grid">
          {PROVIDERS.map((p, i) => <ProviderCard key={p.key} p={p} index={i} />)}
        </div>

        {/* scan all hint */}
        <motion.div initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }} transition={{ duration: 0.5, delay: 0.3 }}
          style={{ marginTop: 48, display: "flex", justifyContent: "center" }}>
          <div style={{
            display: "inline-flex", alignItems: "center", gap: 16,
            padding: "16px 28px", borderRadius: 14,
            border: "1px solid rgba(0,255,136,0.12)",
            background: "rgba(0,255,136,0.04)",
          }}>
            <div>
              <div style={{ fontFamily:"monospace", fontSize:11, color:"#00ff88", marginBottom:6, letterSpacing:"0.1em" }}>
                AUTO-DETECT &amp; SCAN EVERYTHING
              </div>
              <div style={{
                fontFamily:"monospace", fontSize:14, color:"#555",
                display:"flex", alignItems:"center", gap:8,
              }}>
                <span style={{ color:"#00ff88" }}>$</span>
                <span>agentsentry scan all</span>
              </div>
            </div>
            <div style={{ width:1, height:36, background:"rgba(255,255,255,0.06)" }} />
            <div style={{ fontSize:13, color:"#3a3a3a", maxWidth:200, lineHeight:1.6 }}>
              Detects which providers are configured and scans them all in one pass.
            </div>
          </div>
        </motion.div>
      </Container>

      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/[0.04] to-transparent" />

      <style>{`
        @media (max-width: 900px) { .prov-grid { grid-template-columns: repeat(2, 1fr) !important; } }
        @media (max-width: 560px) { .prov-grid { grid-template-columns: 1fr !important; } }
        .group:hover .prov-icon { transform: scale(1.08) rotate(-3deg); }
      `}</style>
    </section>
  );
}
