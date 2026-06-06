'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion, useScroll, useTransform, AnimatePresence } from 'framer-motion';
import { GithubIcon } from '@/components/ui/GithubIcon';

const GITHUB_URL = 'https://github.com/Abhiram-ops/agent-sentry';

/* ── Stagger container ─────────────────────────────────────────── */
const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.12, delayChildren: 0.1 } },
};
const fadeUp = {
  hidden: { opacity: 0, y: 28, filter: 'blur(4px)' },
  show:   { opacity: 1, y: 0,  filter: 'blur(0px)', transition: { duration: 0.65, ease: [0.16, 0.77, 0.32, 1] } },
};

/* ── Floating orbs ─────────────────────────────────────────────── */
function FloatingOrb({ style, delay }: { style: React.CSSProperties; delay: number }) {
  return (
    <motion.div
      style={{ position: 'absolute', borderRadius: '50%', filter: 'blur(80px)', pointerEvents: 'none', ...style }}
      animate={{ y: [0, -30, 0], scale: [1, 1.08, 1], opacity: [0.3, 0.5, 0.3] }}
      transition={{ duration: 8, delay, repeat: Infinity, ease: 'easeInOut' }}
    />
  );
}

/* ── Glitching text badge ──────────────────────────────────────── */
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
        animate={{ scale: tick ? [1, 1.5, 1] : 1, boxShadow: tick ? '0 0 10px #00ff88, 0 0 20px #00ff88' : '0 0 6px #00ff88' }}
        transition={{ duration: 0.4 }}
        style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#00ff88', flexShrink: 0 }}
      />
      <span style={{ fontSize: '13px', fontWeight: 500, fontFamily: "'General Sans', sans-serif" }}>
        <span style={{ color: 'rgba(255,255,255,0.55)' }}>Open source ·</span>
        <span style={{ color: '#fff' }}> v0.1.0</span>
      </span>
    </motion.div>
  );
}

/* ── Primary pill ──────────────────────────────────────────────── */
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

/* ── Secondary pill ────────────────────────────────────────────── */
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

/* ── Scroll indicator ──────────────────────────────────────────── */
function ScrollCaret() {
  return (
    <motion.div
      style={{ position: 'absolute', bottom: 32, left: '50%', transform: 'translateX(-50%)', zIndex: 3, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 2, duration: 0.8 }}
    >
      <motion.div animate={{ y: [0, 8, 0] }} transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
        style={{ width: 1, height: 40, background: 'linear-gradient(180deg, rgba(255,255,255,0.5), transparent)' }} />
    </motion.div>
  );
}

/* ── Component ─────────────────────────────────────────────────── */
export function HeroWeb3() {
  return (
    <section style={{ position: 'relative', width: '100%', minHeight: '100vh', background: 'transparent', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>

      {/* Atmospheric orbs */}
      <FloatingOrb delay={0}   style={{ width: 600, height: 600, background: 'radial-gradient(circle, rgba(0,255,136,0.12), transparent 70%)', top: '10%',  left: '60%' }} />
      <FloatingOrb delay={3}   style={{ width: 400, height: 400, background: 'radial-gradient(circle, rgba(255,51,102,0.08), transparent 70%)',  top: '40%',  left: '10%' }} />
      <FloatingOrb delay={1.5} style={{ width: 300, height: 300, background: 'radial-gradient(circle, rgba(0,153,255,0.08), transparent 70%)',  top: '70%',  left: '75%' }} />

      {/* Main content — staggered entrance */}
      <motion.div
        className="hero-web3-content"
        variants={stagger} initial="hidden" animate="show"
        style={{ position: 'relative', zIndex: 2, display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: '280px', paddingBottom: '102px', paddingLeft: '24px', paddingRight: '24px' }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '40px', width: '100%' }}>

          {/* Badge */}
          <motion.div variants={fadeUp}>
            <LiveBadge />
          </motion.div>

          {/* Heading */}
          <motion.div variants={fadeUp} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '24px' }}>
            <h1 className="hero-web3-heading"
              style={{ fontSize: '56px', fontWeight: 500, lineHeight: 1.28, maxWidth: '680px', textAlign: 'center', margin: 0, fontFamily: "'General Sans', sans-serif", background: 'linear-gradient(144.5deg, #ffffff 28%, rgba(255,255,255,0.2) 115%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
              Find every Machine&apos;s Identity before they do.
            </h1>
            <motion.p
              style={{ fontSize: '15px', fontWeight: 400, color: 'rgba(255,255,255,0.70)', maxWidth: '580px', textAlign: 'center', margin: 0, lineHeight: 1.6, fontFamily: "'General Sans', sans-serif" }}
              variants={fadeUp}>
              Discover ungoverned AI agents and non-human identities in your cloud. Score attack risk. Fix it before attackers do.
            </motion.p>
          </motion.div>

          {/* CTAs */}
          <motion.div variants={fadeUp}
            style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap', justifyContent: 'center' }}>
            <PrimaryPill href={GITHUB_URL} external>
              <GithubIcon size={15} color="#000" />
              Get Started on GitHub
            </PrimaryPill>
            <SecondaryPill href="#research">Read the Paper</SecondaryPill>
          </motion.div>

          {/* Floating stats row */}
          <motion.div variants={fadeUp}
            style={{ display: 'flex', gap: '32px', flexWrap: 'wrap', justifyContent: 'center', marginTop: 8 }}>
            {[['1,610+', 'Active CVEs'], ['45:1', 'Machine/human ratio'], ['Open Source', 'MIT Licensed']].map(([val, lbl], i) => (
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
    </section>
  );
      }
