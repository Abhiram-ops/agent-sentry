'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
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
          <div className="hero-badge badge badge-blue">
            <span className="badge-dot" />
            Open source · v0.2.0
          </div>
          <h1>
            Find every <em>Machine&apos;s Identity</em> before they do.
          </h1>
          <p className="hero-desc">
            AI agents and service accounts are the new attack surface — ungoverned, under-monitored, and multiplying fast.
            AgentSentry discovers every non-human identity in your cloud, scores each one with a provable risk formula,
            and gives you a fix-it checklist before attackers find what you haven&apos;t.
          </p>
          <div className="hero-cta">
            <Link href="/signup" className="btn btn-primary btn-lg">Get started free</Link>
            <Link href={GITHUB_URL} target="_blank" rel="noopener noreferrer" className="btn btn-outline btn-lg" style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
              <GithubIcon size={16} color="currentColor" />
              Star on GitHub
            </Link>
          </div>
          <div className="hero-stats">
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
          </div>
        </div>
        <HeroTerminal />
      </div>
    </section>
  );
}
