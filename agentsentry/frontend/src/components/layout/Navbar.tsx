"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { Container } from "@/components/ui/Container";
import { Button } from "@/components/ui/Button";
import { GithubIcon } from "@/components/ui/GithubIcon";

const NAV_LINKS = [
  { label: "Features",  href: "#features" },
  { label: "Research",  href: "#research" },
  { label: "Pricing",   href: "#pricing" },
];

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

export function Navbar() {
  const [scrolled,  setScrolled]  = useState(false);
  const [menuOpen,  setMenuOpen]  = useState(false);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 24);
    window.addEventListener("scroll", handler, { passive: true });
    return () => window.removeEventListener("scroll", handler);
  }, []);

  return (
    <>
      <motion.header
        initial={{ y: -16, opacity: 0 }}
        animate={{ y: 0,   opacity: 1 }}
        transition={{ duration: 0.45, ease: [0.21, 0.47, 0.32, 0.98] }}
        style={{
          position:   "fixed",
          top:         0,
          left:        0,
          right:       0,
          zIndex:      100,
          transition:  "background 0.3s ease, border-color 0.3s ease",
          background:  scrolled ? "rgba(0,0,0,0.80)" : "transparent",
          backdropFilter: scrolled ? "blur(20px) saturate(1.4)" : "none",
          WebkitBackdropFilter: scrolled ? "blur(20px) saturate(1.4)" : "none",
          borderBottom: scrolled ? "1px solid var(--border)" : "1px solid transparent",
        }}
      >
        <Container>
          <div style={{
            height:         64,
            display:        "flex",
            alignItems:     "center",
            justifyContent: "space-between",
          }}>

            {/* Logo */}
            <Link href="/" style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none" }}>
              <div style={{
                width:        32,
                height:       32,
                borderRadius: 8,
                background:   "rgba(0,255,136,0.08)",
                border:       "1px solid rgba(0,255,136,0.18)",
                display:      "flex",
                alignItems:   "center",
                justifyContent: "center",
              }}>
                <ShieldIcon />
              </div>
              <span style={{ fontWeight: 600, fontSize: 15, color: "#fff", letterSpacing: "-0.01em" }}>
                Agent<span style={{ color: "var(--green)" }}>Sentry</span>
              </span>
            </Link>

            {/* Desktop nav links */}
            <nav style={{ display: "flex", alignItems: "center", gap: 32 }} className="hidden-mobile">
              {NAV_LINKS.map(link => (
                <Link
                  key={link.href}
                  href={link.href}
                  style={{
                    fontSize:       14,
                    color:          "var(--text-3)",
                    textDecoration: "none",
                    transition:     "color 0.15s ease",
                  }}
                  onMouseEnter={e => (e.currentTarget.style.color = "#fff")}
                  onMouseLeave={e => (e.currentTarget.style.color = "var(--text-3)")}
                >
                  {link.label}
                </Link>
              ))}
            </nav>

            {/* Desktop CTAs */}
            <div style={{ display: "flex", alignItems: "center", gap: 16 }} className="hidden-mobile">
              <Link
                href="https://github.com/Abhiram-ops/agent-sentry"
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display:        "flex",
                  alignItems:     "center",
                  gap:            7,
                  fontSize:       14,
                  color:          "var(--text-3)",
                  textDecoration: "none",
                  transition:     "color 0.15s ease",
                }}
                onMouseEnter={e => (e.currentTarget.style.color = "#fff")}
                onMouseLeave={e => (e.currentTarget.style.color = "var(--text-3)")}
              >
                <GithubIcon size={15} />
                GitHub
              </Link>
              <Button asChild size="sm"><Link href="#pricing">Get started free</Link></Button>
            </div>

            {/* Mobile hamburger */}
            <button
              onClick={() => setMenuOpen(o => !o)}
              className="show-mobile"
              style={{
                background: "none",
                border:     "none",
                color:      "var(--text-2)",
                cursor:     "pointer",
                padding:    4,
              }}
              aria-label="Toggle menu"
            >
              {menuOpen ? <CloseIcon /> : <MenuIcon />}
            </button>
          </div>
        </Container>
      </motion.header>

      {/* Mobile drawer */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            key="mobile-menu"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1,  y:  0 }}
            exit={{    opacity: 0,  y: -8 }}
            transition={{ duration: 0.2 }}
            style={{
              position:   "fixed",
              top:         64,
              left:        0,
              right:       0,
              zIndex:      99,
              background:  "rgba(0,0,0,0.95)",
              backdropFilter: "blur(20px)",
              borderBottom: "1px solid var(--border)",
              padding:     "24px var(--container-px-sm)",
            }}
          >
            <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
              {NAV_LINKS.map(link => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMenuOpen(false)}
                  style={{ fontSize: 16, color: "var(--text-2)", textDecoration: "none" }}
                >
                  {link.label}
                </Link>
              ))}
              <div style={{ paddingTop: 8 }}>
                <Button asChild className="w-full" onClick={() => setMenuOpen(false)}>
                  <Link href="#pricing">Get started free</Link>
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Responsive helpers — inline so no Tailwind dependency */}
      <style>{`
        .hidden-mobile { display: flex; }
        .show-mobile   { display: none; }
        @media (max-width: 768px) {
          .hidden-mobile { display: none !important; }
          .show-mobile   { display: flex !important; }
        }
      `}</style>
    </>
  );
}
