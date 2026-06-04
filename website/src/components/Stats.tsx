"use client";

import React from "react";
import { useEffect, useRef, useState } from "react";
import { motion, useMotionValue, useSpring, useTransform, useInView } from "framer-motion";
import Container from "./Container";

// ─── Animated counter ──────────────────────────────────────────────────────

function Counter({ target, suffix = "" }: { target: number; suffix?: string }) {
  const [count, setCount] = useState(0);
  const ref = useRef(null);
  const inView = useInView(ref, { once: true });

  useEffect(() => {
    if (!inView) return;
    let v = 0;
    const duration = 1800, step = 16;
    const inc = target / (duration / step);
    const t = setInterval(() => {
      v += inc;
      if (v >= target) { setCount(target); clearInterval(t); }
      else setCount(Math.floor(v));
    }, step);
    return () => clearInterval(t);
  }, [inView, target]);

  return <span ref={ref}>{count.toLocaleString()}{suffix}</span>;
}

// ─── 3D tilt stat card ─────────────────────────────────────────────────────

function StatCard({
  value, suffix, label, sub, accentColor, index,
}: {
  value: number; suffix: string; label: string; sub: string;
  accentColor: string; index: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const springX = useSpring(mx, { stiffness: 350, damping: 28 });
  const springY = useSpring(my, { stiffness: 350, damping: 28 });
  const rotX = useTransform(springY, [-0.5, 0.5], [10, -10]);
  const rotY = useTransform(springX, [-0.5, 0.5], [-10, 10]);
  const [shine, setShine] = useState({ x: 50, y: 50 });

  const onMove = (e: React.MouseEvent) => {
    const r = ref.current?.getBoundingClientRect();
    if (!r) return;
    const nx = (e.clientX - r.left) / r.width - 0.5;
    const ny = (e.clientY - r.top) / r.height - 0.5;
    mx.set(nx); my.set(ny);
    setShine({ x: ((e.clientX - r.left) / r.width) * 100, y: ((e.clientY - r.top) / r.height) * 100 });
  };
  const onLeave = () => { mx.set(0); my.set(0); };

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.55, delay: index * 0.12 }}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      style={{
        rotateX: rotX, rotateY: rotY,
        transformPerspective: 900,
        transformStyle: "preserve-3d",
      }}
      className="relative flex flex-col items-center text-center rounded-2xl cursor-default"
      whileHover={{ scale: 1.02 }}
    >
      {/* Card face */}
      <div className="relative w-full rounded-2xl overflow-hidden" style={{
        padding: "40px 32px",
        border: "1px solid rgba(255,255,255,0.06)",
        background: "linear-gradient(145deg, #070707 0%, #050505 100%)",
        boxShadow: "0 20px 60px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.04)",
      }}>
        {/* Top accent line */}
        <div className="absolute top-0 left-0 right-0 h-px"
          style={{ background: `linear-gradient(90deg, transparent, ${accentColor}50, transparent)` }} />

        {/* Cursor shine */}
        <div className="absolute inset-0 rounded-2xl pointer-events-none" style={{
          background: `radial-gradient(circle at ${shine.x}% ${shine.y}%, ${accentColor}14 0%, transparent 55%)`,
          transition: "background 0.1s ease",
        }} />

        {/* Z-depth shadow layer */}
        <div className="absolute inset-0 rounded-2xl pointer-events-none" style={{
          transform: "translateZ(-24px)",
          background: `radial-gradient(ellipse at 50% 100%, ${accentColor}10 0%, transparent 70%)`,
          filter: "blur(20px)",
        }} />

        {/* Icon glow dot */}
        <div className="mx-auto mb-5 w-2 h-2 rounded-full" style={{
          background: accentColor,
          boxShadow: `0 0 12px ${accentColor}, 0 0 28px ${accentColor}60`,
        }} />

        <div className="font-mono font-bold text-white mb-3" style={{ fontSize: "clamp(2.4rem, 4vw, 3.2rem)", letterSpacing: "-0.02em" }}>
          <Counter target={value} suffix={suffix} />
        </div>
        <div className="font-medium mb-2" style={{ color: "#666", fontSize: 14 }}>{label}</div>
        <div className="font-mono" style={{ color: accentColor, fontSize: 11, opacity: 0.7 }}>{sub}</div>
      </div>
    </motion.div>
  );
}

// ─── Stats section ─────────────────────────────────────────────────────────

const DATA = [
  { value: 1610, suffix: "+", label: "CVEs in CISA KEV catalog",           sub: "Updated daily. Free.",            color: "#00ff88" },
  { value: 45,   suffix: ":1", label: "Machine to human identity ratio",   sub: "Almost none governed.",           color: "#ff3366" },
  { value: 325,  suffix: "+", label: "KEV entries linked to ransomware",    sub: "Active campaigns. Right now.",    color: "#ffcc00" },
];

export default function Stats() {
  return (
    <section className="relative overflow-hidden" style={{ padding: "96px 0", borderTop: "1px solid rgba(255,255,255,0.05)" }}>
      {/* Background */}
      <div className="absolute inset-0" style={{ background: "linear-gradient(180deg, #000 0%, #030303 100%)" }} />
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#00ff88]/15 to-transparent" />

      <Container className="relative">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {DATA.map((d, i) => (
            <StatCard key={i} index={i} value={d.value} suffix={d.suffix}
              label={d.label} sub={d.sub} accentColor={d.color} />
          ))}
        </div>
      </Container>

      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/[0.04] to-transparent" />
    </section>
  );
}
