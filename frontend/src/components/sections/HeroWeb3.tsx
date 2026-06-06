'use client';

import Link from 'next/link';
import { GithubIcon } from '@/components/ui/GithubIcon';

const GITHUB_URL = 'https://github.com/Abhiram-ops/agent-sentry';

/* ── Primary pill CTA (white / inverted) ─────────────────── */
function PrimaryPill({
  href,
  external,
  children,
}: {
  href: string;
  external?: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      target={external ? '_blank' : undefined}
      rel={external ? 'noopener noreferrer' : undefined}
      style={{ textDecoration: 'none', display: 'inline-block', position: 'relative', borderRadius: '999px', border: '0.6px solid rgba(255,255,255,1)', padding: '1.5px' }}
    >
      {/* Glow streak */}
      <span
        aria-hidden="true"
        style={{
          position: 'absolute',
          top: '-1px',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '55%',
          height: '10px',
          background: 'radial-gradient(ellipse at 50% 0%, rgba(255,255,255,0.65) 0%, transparent 75%)',
          filter: 'blur(3px)',
          borderRadius: '50%',
          pointerEvents: 'none',
          zIndex: 2,
          display: 'block',
        }}
      />
      <span
        style={{
          position: 'relative',
          zIndex: 1,
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          borderRadius: '999px',
          background: '#fff',
          color: '#000',
          fontSize: '14px',
          fontWeight: 500,
          padding: '11px 29px',
          fontFamily: "'General Sans', sans-serif",
          whiteSpace: 'nowrap',
          letterSpacing: '-0.01em',
        }}
      >
        {children}
      </span>
    </Link>
  );
}

/* ── Secondary pill CTA (ghost / outlined) ───────────────── */
function SecondaryPill({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      style={{
        textDecoration: 'none',
        display: 'inline-flex',
        alignItems: 'center',
        gap: '8px',
        borderRadius: '999px',
        border: '0.6px solid rgba(255,255,255,0.35)',
        background: 'rgba(255,255,255,0.06)',
        color: 'rgba(255,255,255,0.85)',
        fontSize: '14px',
        fontWeight: 500,
        padding: '11px 29px',
        fontFamily: "'General Sans', sans-serif",
        whiteSpace: 'nowrap',
        letterSpacing: '-0.01em',
        transition: 'border-color 0.15s ease, background 0.15s ease',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.borderColor = 'rgba(255,255,255,0.65)';
        e.currentTarget.style.background  = 'rgba(255,255,255,0.10)';
      }}
      onMouseLeave={e => {
        e.currentTarget.style.borderColor = 'rgba(255,255,255,0.35)';
        e.currentTarget.style.background  = 'rgba(255,255,255,0.06)';
      }}
    >
      {children}
    </Link>
  );
}

/* ── Component ──────────────────────────────────────────── */
export function HeroWeb3() {
  return (
    <section
      style={{
        position: 'relative',
        width: '100%',
        minHeight: '100vh',
        background: 'transparent',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Hero content */}
      <div
        className="hero-web3-content"
        style={{
          position: 'relative',
          zIndex: 2,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          paddingTop: '280px',
          paddingBottom: '102px',
          paddingLeft: '24px',
          paddingRight: '24px',
        }}
      >
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '40px',
            width: '100%',
          }}
        >
          {/* Badge */}
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              background: 'rgba(255,255,255,0.08)',
              border: '1px solid rgba(255,255,255,0.18)',
              borderRadius: '20px',
              padding: '6px 14px',
              fontFamily: "'General Sans', sans-serif",
            }}
          >
            <div
              style={{
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                background: 'var(--green)',
                flexShrink: 0,
                boxShadow: '0 0 6px var(--green)',
              }}
            />
            <span style={{ fontSize: '13px', fontWeight: 500 }}>
              <span style={{ color: 'rgba(255,255,255,0.55)' }}>Open source ·</span>
              <span style={{ color: '#fff' }}> v0.1.0</span>
            </span>
          </div>

          {/* Heading + Subtitle */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '24px',
            }}
          >
            <h1
              className="hero-web3-heading"
              style={{
                fontSize: '56px',
                fontWeight: 500,
                lineHeight: 1.28,
                maxWidth: '680px',
                textAlign: 'center',
                margin: 0,
                fontFamily: "'General Sans', sans-serif",
                background: 'linear-gradient(144.5deg, #ffffff 28%, rgba(255,255,255,0.2) 115%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              Find every Machine&apos;s Identity before they do.
            </h1>

            <p
              style={{
                fontSize: '15px',
                fontWeight: 400,
                color: 'rgba(255,255,255,0.70)',
                maxWidth: '580px',
                textAlign: 'center',
                margin: 0,
                lineHeight: 1.6,
                fontFamily: "'General Sans', sans-serif",
              }}
            >
              Discover ungoverned AI agents and non-human identities in your
              cloud. Score attack risk. Fix it before attackers do.
            </p>
          </div>

          {/* CTA row */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '16px',
              flexWrap: 'wrap',
              justifyContent: 'center',
            }}
          >
            <PrimaryPill href={GITHUB_URL} external>
              <GithubIcon size={15} color="#000" />
              Get Started on GitHub
            </PrimaryPill>

            <SecondaryPill href="#research">
              Read the Paper
            </SecondaryPill>
          </div>
        </div>
      </div>
    </section>
  );
}
