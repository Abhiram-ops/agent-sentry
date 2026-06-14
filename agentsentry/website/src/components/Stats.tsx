"use client";

import { useEffect, useRef } from "react";
import { motion } from "framer-motion";

const FU = { hidden: { opacity: 0, y: 22 }, visible: { opacity: 1, y: 0 } };
const TR = { duration: 0.55, ease: [0.4, 0, 0.2, 1] as [number, number, number, number] };
const VP = { once: true, margin: "0px 0px -6% 0px" };

const STATS = [
  { micro: "NHI Ratio",     count: 45,   suffix: ":1",  label: "Machine to human identities in the average cloud environment" },
  { micro: "KEV CVEs",      count: 1610, suffix: "+",   label: "Actively exploited CVEs cross-referenced from CISA" },
  { micro: "Cost",          count: null, display: "$0", label: "Free forever. AGPL-3.0 license. No account needed." },
  { micro: "Time to scan",  count: null, display: "< 3 min", label: "Average time to first result on a fresh environment" },
];

function CountUp({ end, suffix }: { end: number; suffix: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(entries => {
      if (!entries[0].isIntersecting) return;
      obs.unobserve(el);
      const dur = 1400, t0 = performance.now();
      const tick = (now: number) => {
        const p = Math.min(1, (now - t0) / dur);
        const ease = 1 - Math.pow(1 - p, 3);
        const v = end * ease;
        el.textContent = (end >= 100 ? Math.round(v).toLocaleString() : Math.round(v * 10) / 10) + suffix;
        if (p < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    }, { threshold: 0.5 });
    obs.observe(el);
    return () => obs.disconnect();
  }, [end, suffix]);
  return <span ref={ref} className="stat-num mono">0{suffix}</span>;
}

export default function Stats() {
  return (
    <div className="stats">
      <div className="stats-inner">
        {STATS.map((s, i) => (
          <motion.div
            key={i}
            className="stat"
            variants={FU} initial="hidden" whileInView="visible"
            viewport={VP} transition={{ ...TR, delay: i * 0.07 }}
          >
            <span className="stat-micro mono">{s.micro}</span>
            {s.count !== null
              ? <CountUp end={s.count!} suffix={s.suffix!} />
              : <span className="stat-num mono">{s.display}</span>
            }
            <span className="stat-lbl">{s.label}</span>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
