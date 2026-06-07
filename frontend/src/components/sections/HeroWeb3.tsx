'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { GithubIcon } from '@/components/ui/GithubIcon';

const GITHUB_URL = 'https://github.com/Abhiram-ops/agent-sentry';

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.12, delayChildren: 0.1 } },
};
const fadeUp = {
  hidden: { opacity: 0, y: 28, filter: 'blur(4px)' },
  show: { opacity: 1, y: 0, filter: 'blur(0px)', transition: { duration: 0.65, ease: [0.16, 0.77, 0.32, 1] as [number,number,number,number] } },
};

// Animated SVG circuit-line paths — adapted from Background Paths by Kokonut UI (21st.dev)
function FloatingPaths({ position }: { position: number }) {
  const paths = Array.from({ length: 36 }, (_, i) => ({
    id: i,
    d: `M-${380 - i * 5 * position} -${189 + i * 6}C-${
      380 - i * 5 * position
    } -${189 + i * 6} -${312 - i * 5 * position} ${216 - i * 6} ${
      152 - i * 5 * position
    } ${343 - i * 6}C${616 - i * 5 * position} ${470 - i * 6} ${
      684 - i * 5 * position
    } ${875 - i * 6} ${684 - i * 5 * position} ${875 - i * 6}`,
    stroke: i % 4 === 0
      ? `rgba(0,255,136,${0.04 + i * 0.006})`
      : `rgba(255,255,255,${0.02 + i * 0.004})`,
    width: 0.5 + i * 0.03,
    duration: 20 + (i * 7) % 10,
  }));

  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
      <svg
        style={{ width: '100%', height: '100%' }}
        viewBox="0 0 696 316"
        fill="none"
        preserveAspectRatio="xMidYMid slice"
      >
        {paths.map((path) => (
          <motion.path
            key={path.id}
            d={path.d}
            stroke={path.stroke}
            strokeWidth={path.width}
            initial={{ pathLength: 0.3, opacity: 0.6 }}
            animate={{
              pathLength: 1,
              opacity: [0.3, 0.6, 0.3],
              pathOffset: [0, 1, 0],
            }}
            transition={{
              duration: path.duration,
              repeat: Infinity,
              ease: 'linear',
            }}
          />
        ))}
      </svg>
    </div>
  );
}

function FloatingOrb({ style, delay }: { style: React.CSSProperties; delay: number }) {
  return (
    <motion.div
      style={{ position: 'absolute', borderRadius: '50%', filter: 'blur(80px)', pointerEvents: 'none', ...style }}
      animate={{ y: [0, -30, 0], scale: [1, 1.08, 1], opacity: [0.3, 0.5, 0.3] }}
      transition={{ duration: 8, delay, repeat: Infinity, ease: 'easeInOut' }}
    />
  );
}

function LiveBadge() {
  const [tick, setTick] = useState(true);
  useEffect(() => {
    const id = setInterval(() => setTick(t => !t), 1200);
    return () => clearInterval(id);
  }, []);
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.85 }} animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5, delay: 0.3 }}
      style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.18)', borderRadius: '20px', padding: '6px 14px' }}
    >
      <motion.div
        animate={{ scale: tick ? [1, 1.5, 1] : 1 }}
        transition={{ duration: 0.4 }}
        style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#00ff88', flexShrink: 0, boxShadow: '0 0 6px #00ff88' }}
      />
      <span style={{ fontSize: '13px', fontWeight: 500, fontFamily: "'General Sans', sans-serif" }}>
        <span style={{ color: 'rgba(255,255,255,0.55)' }}>Open source ·</span>
        <span style={{ color: '#fff' }}> v0.1.0</span>
      </span>
    </motion.div>
  );
}

function AgentSentryLogo() {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.7, y: -10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ duration: 0.6, ease: [0.16, 0.77, 0.32, 1] as [number,number,number,number] }}
      style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 14, marginBottom: 8 }}
    >
      <motion.div
        animate={{ boxShadow: ['0 0 20px rgba(0,255,136,0.25)', '0 0 40px rgba(0,255,136,0.5)', '0 0 20px rgba(0,255,136,0.25)'] }}
        transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
        style={{ width: 52, height: 52, borderRadius: 14, background: 'linear-gradient(135deg, rgba(0,255,136,0.15), rgba(0,204,106,0.08))', border: '1px solid rgba(0,255,136,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      >
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#00ff88" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          <path d="M9 12l2 2 4-4" />
        </svg>
      </motion.div>
      <div style={{ textAlign: 'left' }}>
        <div style={{ fontSize: 22, fontWeight: 700, color: '#fff', fontFamily: "'General Sans', sans-serif", letterSpacing: '-0.02em', lineHeight: 1.1 }}>
          Agent<span style={{ color: '#00ff88' }}>Sentry</span>
        </div>
        <div style={{ fontSize: 11, color: '#444', fontFamily: 'monospace', letterSpacing: '0.08em', marginTop: 2 }}>
          NHI · AI AGENT SECURITY
        </div>
      </div>
    </motion.div>
  );
}

function PrimaryPill({ href, external, children }: { href: string; external?: boolean; children: React.ReactNode }) {
  return (
    <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}>
      <Link href={href} target={external ? '_blank' : undefined} rel={external ? 'noopener noreferrer' : undefined}
        style={{ textDecoration: 'none', display: 'inline-block', position: 'relative', borderRadius: '999px', border: '0.6px solid rgba(255,255,255,1)', padding: '1.5px' }}>
        <span aria-hidden="true" style={{ position: 'absolute', top: '-1px', left: '50%', transform: 'translateX(-50%)', width: '55%', height: '10px', background: 'radial-gradient(ellipse at 50% 0%, rgba(255,255,255,0.65) 0%, transparent 75%)', filter: 'blur(3px)', borderRadius: '50%', pointerEvents: 'none', zIndex: 2, display: 'block' }} />
        <span style={{ position: 'relative', zIndex: 1, display: 'inline-flex', alignItems: 'center', gap: '8px', borderRadius: '999px', background: '#fff', color: '#000', fontSize: '14px', fontWeight: 500, padding: '11px 29px', fontFamily: "'General Sans', sans-serif", whiteSpace: 'nowrap', letterSpacing: '-0.01em' }}>
          {children}
        </span>
      </Link>
    </motion.div>
  );
}

function SecondaryPill({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}>
      <Link href={href}
        style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '8px', borderRadius: '999px', border: '0.6px solid rgba(255,255,255,0.35)', background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.85)', fontSize: '14px', fontWeight: 500, padding: '11px 29px', fontFamily: "'General Sans', sans-serif", whiteSpace: 'nowrap', letterSpacing: '-0.01em', transition: 'border-color 0.15s, background 0.15s' }}
        onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.65)'; e.currentTarget.style.background = 'rgba(255,255,255,0.10)'; }}
        onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.35)'; e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; }}>
        {children}
      </Link>
    </motion.div>
  );
}

function ScrollCaret() {
  return (
    <motion.div
      style={{ position: 'absolute', bottom: 32, left: '50%', transform: 'translateX(-50%)', zIndex: 3, display: 'flex', flexDirection: 'column', alignItems: 'center' }}
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 2, duration: 0.8 }}
    >
      <motion.div animate={{ y: [0, 8, 0] }} transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
        style={{ width: 1, height: 40, background: 'linear-gradient(180deg, rgba(255,255,255,0.5), transparent)' }} />
    </motion.div>
  );
}

export function HeroWeb3() {
  return (
    <section style={{ position: 'relative', width: '100%', minHeight: '100vh', background: 'transparent', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>

      {/* Layer 1: Animated circuit-line paths (Background Paths by Kokonut UI / 21st.dev) */}
      <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', zIndex: 0 }}>
        <FloatingPaths position={1} />
        <FloatingPaths position={-1} />
      </div>

      {/* Layer 2: Soft glowing orbs */}
      <FloatingOrb delay={0} style={{ width: 600, height: 600, background: 'radial-gradient(circle, rgba(0,255,136,0.12), transparent 70%)', top: '10%', left: '60%', zIndex: 1 }} />
      <FloatingOrb delay={3} style={{ width: 400, height: 400, background: 'radial-gradient(circle, rgba(255,51,102,0.08), transparent 70%)', top: '40%', left: '10%', zIndex: 1 }} />
      <FloatingOrb delay={1.5} style={{ width: 300, height: 300, background: 'radial-gradient(circle, rgba(0,153,255,0.08), transparent 70%)', top: '70%', left: '75%', zIndex: 1 }} />

      {/* Layer 3: Hero content */}
      <motion.div
        className="hero-web3-content"
        variants={stagger} initial="hidden" animate="show"
        style={{ position: 'relative', zIndex: 2, display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: '200px', paddingBottom: '102px', paddingLeft: '24px', paddingRight: '24px' }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '36px', width: '100%' }}>

          <motion.div variants={fadeUp}>
            <AgentSentryLogo />
          </motion.div>

          <motion.div variants={fadeUp}>
            <LiveBadge />
          </motion.div>

          <motion.div variants={fadeUp} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '24px' }}>
            <h1 className="hero-web3-heading"
              style={{ fontSize: '56px', fontWeight: 500, lineHeight: 1.28, maxWidth: '680px', textAlign: 'center', margin: 0, fontFamily: "'General Sans', sans-serif", background: 'linear-gradient(144.5deg, #ffffff 28%, rgba(255,255,255,0.2) 115%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
              Find every Machine&apos;s Identity before they do.
            </h1>
            <motion.p variants={fadeUp}
              style={{ fontSize: '15px', fontWeight: 400, color: 'rgba(255,255,255,0.70)', maxWidth: '600px', textAlign: 'center', margin: 0, lineHeight: 1.75, fontFamily: "'General Sans', sans-serif" }}>
              AI agents and service accounts are the new attack surface — ungoverned, under-monitored, and multiplying fast. AgentSentry discovers every non-human identity in your cloud, scores each one with a provable risk formula, and gives you a fix-it checklist before attackers find what you haven&apos;t.
            </motion.p>
          </motion.div>

          <motion.div variants={fadeUp}
            style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap', justifyContent: 'center' }}>
            <PrimaryPill href={GITHUB_URL} external>
              <GithubIcon size={15} color="#000" />
              Get Started on GitHub
            </PrimaryPill>
            <SecondaryPill href="#research">Read the Paper</SecondaryPill>
          </motion.div>

          <motion.div variants={fadeUp}
            style={{ display: 'flex', gap: '32px', flexWrap: 'wrap', justifyContent: 'center', marginTop: 8 }}>
            {([['1,610+', 'Active CVEs'], ['45:1', 'Machine/human ratio'], ['Open Source', 'MIT Licensed']] as [string,string][]).map(([val, lbl], i) => (
              <motion.div key={i} whileHover={{ y: -3 }} transition={{ type: 'spring', stiffness: 300 }}
                style={{ textAlign: 'center', padding: '12px 20px', borderRadius: 12, border: '1px solid rgba(255,255,255,0.07)', background: 'rgba(255,255,255,0.03)', cursor: 'default' }}>
                <div style={{ fontSize: 18, fontWeight: 700, color: '#fff', fontFamily: 'monospace', letterSpacing: '-0.02em' }}>{val}</div>
                <div style={{ fontSize: 11, color: '#444', marginTop: 2, fontFamily: "'General Sans', sans-serif" }}>{lbl}</div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </motion.div>

      <ScrollCaret />
      <style>{`
        @media (max-width: 768px) {
          .hero-web3-heading { font-size: 2rem !important; line-height: 1.25 !important; }
          .hero-web3-content { padding-top: 120px !important; padding-bottom: 64px !important; }
        }
        @media (max-width: 480px) {
          .hero-web3-heading { font-size: 1.75rem !important; }
        }
      `}</style>
    </section>
  );
}
