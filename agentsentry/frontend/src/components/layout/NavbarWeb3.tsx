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

function LogoMark() {
  return (
    <svg width="30" height="30" viewBox="0 0 100 100" fill="none" aria-hidden="true">
      <polygon points="50,12 82.9,31 82.9,69 50,88 17.1,69 17.1,31" fill="none" stroke="#1e293b" strokeWidth="2.5" strokeLinejoin="round" />
      <circle cx="50" cy="12" r="2.8" fill="var(--accent)" />
      <circle cx="82.9" cy="31" r="2.8" fill="var(--accent)" />
      <circle cx="82.9" cy="69" r="2.8" fill="var(--accent)" />
      <circle cx="50" cy="88" r="2.8" fill="var(--accent)" />
      <circle cx="17.1" cy="69" r="2.8" fill="var(--accent)" />
      <circle cx="17.1" cy="31" r="2.8" fill="var(--accent)" />
      <path d="M 68.7,48.09 A 19,11 0 1,0 68.7,51.91" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" />
      <circle cx="69" cy="50" r="3" fill="var(--accent)" />
      <circle cx="50" cy="50" r="6.5" fill="var(--accent)" />
      <circle cx="47.5" cy="47.5" r="2.2" fill="rgba(255,255,255,0.9)" />
    </svg>
  );
}

type AuthState =
  | { status: 'loading' }
  | { status: 'authed'; email: string }
  | { status: 'guest' };

export function NavbarWeb3() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [auth, setAuth] = useState<AuthState>({ status: 'loading' });

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 16);
    window.addEventListener('scroll', handler, { passive: true });
    return () => window.removeEventListener('scroll', handler);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/user/profile', { cache: 'no-store' });
        if (cancelled) return;
        if (res.ok) {
          const json = (await res.json()) as { email: string };
          setAuth({ status: 'authed', email: json.email });
        } else {
          setAuth({ status: 'guest' });
        }
      } catch {
        if (!cancelled) setAuth({ status: 'guest' });
      }
    })();
    return () => { cancelled = true; };
  }, []);

  async function handleLogout() {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch {
      // ignore — clear client state regardless
    }
    window.location.assign('/');
  }

  return (
    <header id="main-nav" className={`nav${scrolled ? ' scrolled' : ''}`}>
      <div className="container nav-inner">
        <Link href="/" className="nav-logo">
          <LogoMark />
          <span className="nav-logo-text">AgentSentry</span>
        </Link>

        <nav className="nav-links" aria-label="Primary">
          {NAV_LINKS.map((link) => (
            <Link key={link.href} href={link.href}>{link.label}</Link>
          ))}
        </nav>

        <div className="nav-sep" />

        <div className="nav-actions">
          <Link href={GITHUB_URL} target="_blank" rel="noopener noreferrer" className="nav-ghost" style={{ display: 'inline-flex', alignItems: 'center', gap: 7 }}>
            <GithubIcon size={15} color="currentColor" />
            GitHub
          </Link>

          {auth.status === 'authed' ? (
            <>
              <Link href="/dashboard" className="nav-ghost">Dashboard</Link>
              <button onClick={handleLogout} className="btn btn-outline">Log out</button>
            </>
          ) : (
            <>
              <Link href="/login" className="nav-ghost">Log in</Link>
              <Link href="/signup" className="btn btn-primary">Get started free</Link>
            </>
          )}
        </div>

        <button onClick={() => setMenuOpen((o) => !o)} className="nav-burger" aria-label="Toggle menu">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            {menuOpen ? (
              <>
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </>
            ) : (
              <>
                <line x1="3" y1="6" x2="21" y2="6" />
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="18" x2="21" y2="18" />
              </>
            )}
          </svg>
        </button>
      </div>

      <div className={`container nav-mobile-menu${menuOpen ? ' open' : ''}`}>
        {NAV_LINKS.map((link) => (
          <Link key={link.href} href={link.href} onClick={() => setMenuOpen(false)}>{link.label}</Link>
        ))}
        <Link href={GITHUB_URL} target="_blank" rel="noopener noreferrer" onClick={() => setMenuOpen(false)} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <GithubIcon size={15} color="currentColor" />
          GitHub
        </Link>
        {auth.status === 'authed' ? (
          <>
            <Link href="/dashboard" onClick={() => setMenuOpen(false)}>Dashboard</Link>
            <button onClick={() => { setMenuOpen(false); void handleLogout(); }} className="btn btn-outline" style={{ marginTop: 8 }}>Log out</button>
          </>
        ) : (
          <>
            <Link href="/login" onClick={() => setMenuOpen(false)}>Log in</Link>
            <Link href="/signup" onClick={() => setMenuOpen(false)} className="btn btn-primary" style={{ marginTop: 8, justifyContent: 'center' }}>Get started free</Link>
          </>
        )}
      </div>
    </header>
  );
}
