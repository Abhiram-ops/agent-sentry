'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { GithubIcon } from '@/components/ui/GithubIcon';

const NAV_LINKS = [
  { label: 'How it works', href: '#how-it-works' },
  { label: 'Providers',    href: '#providers'    },
  { label: 'Features',     href: '#features'     },
  { label: 'Research',     href: '#research'     },
  { label: 'Pricing',      href: '#pricing'      },
  { label: 'Docs',         href: '/docs'         },
  { label: 'Contact',      href: '/contact'      },
];

const GITHUB_URL = 'https://github.com/Abhiram-ops/agent-sentry';

function ShieldIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--green)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  );
}

function MenuIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="3" y1="6" x2="21" y2="6" />
      <line x1="3" y1="12" x2="21" y2="12" />
      <line x1="3" y1="18" x2="21" y2="18" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

function GetStartedPill() {
  return (
    <Link
      href={GITHUB_URL}
      target="_blank"
      rel="noopener noreferrer"
      style={{ textDecoration: 'none', display: 'inline-block', position: 'relative', borderRadius: '999px', border: '0.6px solid rgba(0,255,136,0.6)', padding: '1.5px' }}
    >
      <span aria-hidden="true" style={{ position: 'absolute', top: '-1px', left: '50%', transform: 'translateX(-50%)', width: '55%', height: '10px', background: 'radial-gradient(ellipse at 50% 0%, rgba(255,255,255,0.6) 0%, transparent 75%)', filter: 'blur(3px)', borderRadius: '50%', pointerEvents: 'none', zIndex: 2, display: 'block' }} />
      <span style={{ position: 'relative', zIndex: 1, display: 'block', borderRadius: '999px', background: 'var(--green)', color: '#000', fontSize: '14px', fontWeight: 600, padding: '11px 24px', fontFamily: "'General Sans', sans-serif", whiteSpace: 'nowrap', letterSpacing: '-0.01em' }}>
        Get started free
      </span>
    </Link>
  );
}

export function NavbarWeb3() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 24);
    window.addEventListener('scroll', handler, { passive: true });
    return () => window.removeEventListener('scroll', handler);
  }, []);

  return (
    <>
      <header
        className="navbar-web3-header"
        style={{
          position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          paddingLeft: '120px', paddingRight: '120px', paddingTop: '20px', paddingBottom: '20px',
          fontFamily: "'General Sans', sans-serif",
          transition: 'background 0.3s ease, backdrop-filter 0.3s ease, border-color 0.3s ease',
          background: scrolled ? 'rgba(0,0,0,0.75)' : 'transparent',
          backdropFilter: scrolled ? 'blur(20px) saturate(1.4)' : 'none',
          WebkitBackdropFilter: scrolled ? 'blur(20px) saturate(1.4)' : 'none',
          borderBottom: scrolled ? '1px solid rgba(255,255,255,0.08)' : '1px solid transparent',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '40px' }}>
          <Link href="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(0,255,136,0.08)', border: '1px solid rgba(0,255,136,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <ShieldIcon />
            </div>
            <span style={{ color: '#fff', fontSize: '15px', fontWeight: 600, letterSpacing: '-0.01em', fontFamily: "'General Sans', sans-serif", lineHeight: 1 }}>
              Agent<span style={{ color: 'var(--green)' }}>Sentry</span>
            </span>
          </Link>

          <nav className="navbar-web3-links" style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                style={{ color: 'rgba(255,255,255,0.75)', fontSize: '13.5px', fontWeight: 500, textDecoration: 'none', fontFamily: "'General Sans', sans-serif", letterSpacing: '-0.01em', transition: 'color 0.15s ease', whiteSpace: 'nowrap' }}
                onMouseEnter={e => (e.currentTarget.style.color = '#fff')}
                onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.75)')}
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="navbar-web3-links" style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <Link href={GITHUB_URL} target="_blank" rel="noopener noreferrer"
            style={{ display: 'flex', alignItems: 'center', gap: '7px', color: 'rgba(255,255,255,0.65)', fontSize: '14px', fontWeight: 500, textDecoration: 'none', fontFamily: "'General Sans', sans-serif", transition: 'color 0.15s ease' }}
            onMouseEnter={e => (e.currentTarget.style.color = '#fff')}
            onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.65)')}>
            <GithubIcon size={15} color="currentColor" />
            GitHub
          </Link>
          <GetStartedPill />
        </div>

        <button onClick={() => setMenuOpen((o) => !o)} className="navbar-web3-hamburger"
          style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.8)', cursor: 'pointer', padding: '4px', display: 'none' }}
          aria-label="Toggle menu">
          {menuOpen ? <CloseIcon /> : <MenuIcon />}
        </button>
      </header>

      {menuOpen && (
        <div style={{ position: 'fixed', top: 68, left: 0, right: 0, zIndex: 99, background: 'rgba(0,0,0,0.95)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(255,255,255,0.08)', padding: '24px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {NAV_LINKS.map((link) => (
              <Link key={link.href} href={link.href} onClick={() => setMenuOpen(false)}
                style={{ fontSize: '16px', color: 'rgba(255,255,255,0.8)', textDecoration: 'none', fontFamily: "'General Sans', sans-serif", fontWeight: 500 }}>
                {link.label}
              </Link>
            ))}
            <Link href={GITHUB_URL} target="_blank" rel="noopener noreferrer" onClick={() => setMenuOpen(false)}
              style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '16px', color: 'rgba(255,255,255,0.8)', textDecoration: 'none', fontFamily: "'General Sans', sans-serif", fontWeight: 500 }}>
              <GithubIcon size={16} color="currentColor" />
              GitHub
            </Link>
            <div style={{ paddingTop: '8px' }}>
              <Link href={GITHUB_URL} target="_blank" rel="noopener noreferrer" onClick={() => setMenuOpen(false)}
                style={{ display: 'block', textAlign: 'center', borderRadius: '999px', border: '0.6px solid rgba(255,255,255,1)', color: '#fff', fontSize: '14px', fontWeight: 500, padding: '12px 29px', textDecoration: 'none', fontFamily: "'General Sans', sans-serif" }}>
                Get Started Free
              </Link>
            </div>
          </div>
        </div>
      )}
    </>
  );
            }
