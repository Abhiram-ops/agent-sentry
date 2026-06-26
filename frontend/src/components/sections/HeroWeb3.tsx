'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { GithubIcon } from '@/components/ui/GithubIcon';
import HeroTerminal from './HeroTerminal';

const GITHUB_URL = 'https://github.com/Abhiram-ops/agent-sentry';

function Counter({ target, suffix = '' }: { target: number; suffix?: string }) {
  const [value, setValue] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const startedRef = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver((entries) => {
      if (entries[0]?.isIntersecting && !startedRef.current) {
        startedRef.current = true;
        const dur = 1800;
        const start = performance.now();
        const tick = (now: number) => {
          const t = Math.min((now - start) / dur, 1);
          const ease = 1 - Math.pow(1 - t, 3);
          setValue(Math.floor(ease * target));
          if (t < 1) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
        io.unobserve(el);
      }
    }, { threshold: 0.6 });
    io.observe(el);
    return () => io.disconnect();
  }, [target]);

  return <div ref={ref} className="hero-stat-value">{value.toLocaleString()}{suffix}</div>;
}

export function HeroWeb3() {
  return (
    <section className="hero" aria-label="Introduction">
      <div className="hero-bg-grid" />
      <div className="hero-bg-glow" />
      <div className="container hero-inner">
        <div>
          <motion.div className="hero-badge badge badge-blue"
            initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45 }}>
            <span className="badge-dot" />
            Open source · v0.2.0
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}>
            One tool. Every API key, agent, and service account mapped. <em>See your complete attack surface before attackers do.</em>
          </motion.h1>
          <motion.p className="hero-desc"
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}>
            AI agents and service accounts are the new attack surface — ungoverned, under-monitored, and multiplying fast.
            AgentSentry discovers every non-human identity in your cloud, scores each one with a provable risk formula,
            and gives you a fix-it checklist before attackers find what you haven&apos;t.
          </motion.p>
          <motion.div className="hero-cta"
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}>
            <Link href="/signup" className="btn btn-primary btn-lg">Get started free</Link>
            <Link href={GITHUB_URL} target="_blank" rel="noopener noreferrer" className="btn btn-outline btn-lg" style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
              <GithubIcon size={16} color="currentColor" />
              Star on GitHub
            </Link>
          </motion.div>
          <motion.div className="hero-stats"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.5 }}>
            <div className="hero-stat">
              <Counter target={1610} suffix="+" />
              <div className="hero-stat-label">Active CVEs tracked</div>
            </div>
            <div className="hero-stat">
              <Counter target={45} suffix=":1" />
              <div className="hero-stat-label">Machine / human ratio</div>
            </div>
            <div className="hero-stat">
              <div className="hero-stat-value is-compact">AGPL-3.0</div>
              <div className="hero-stat-label">Open source license</div>
            </div>
          </motion.div>
        </div>
        <motion.div
          initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}>
          <HeroTerminal />
        </motion.div>
      </div>
    </section>
  );
}
