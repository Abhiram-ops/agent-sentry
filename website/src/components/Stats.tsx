"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useInView } from "framer-motion";

function Counter({ target, suffix = "" }: { target: number; suffix?: string }) {
  const [count, setCount] = useState(0);
  const ref = useRef(null);
  const inView = useInView(ref, { once: true });

  useEffect(() => {
    if (!inView) return;
    let start = 0;
    const duration = 1800;
    const step = 16;
    const increment = target / (duration / step);
    const timer = setInterval(() => {
      start += increment;
      if (start >= target) {
        setCount(target);
        clearInterval(timer);
      } else {
        setCount(Math.floor(start));
      }
    }, step);
    return () => clearInterval(timer);
  }, [inView, target]);

  return (
    <span ref={ref}>
      {count.toLocaleString()}{suffix}
    </span>
  );
}

const STATS = [
  {
    value: 1610,
    suffix: "+",
    label: "CVEs in CISA KEV catalog",
    sub: "Updated daily. Free."
  },
  {
    value: 45,
    suffix: ":1",
    label: "Machine to human identity ratio",
    sub: "Almost none governed."
  },
  {
    value: 325,
    suffix: "+",
    label: "KEV entries linked to ransomware",
    sub: "Active campaigns. Right now."
  },
];

export default function Stats() {
  return (
    <section className="border-y border-[#1f1f1f] bg-[#0d0d0d]">
      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {STATS.map((stat, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.5, delay: i * 0.08 }}
              className="text-center"
            >
              <div className="text-4xl font-bold text-white mb-1 font-mono">
                <Counter target={stat.value} suffix={stat.suffix} />
              </div>
              <div className="text-sm text-[#888] mb-0.5">{stat.label}</div>
              <div className="text-xs text-[#444]">{stat.sub}</div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
