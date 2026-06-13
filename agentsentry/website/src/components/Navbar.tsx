"use client";

import { useEffect, useRef, useState } from "react";

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [stars, setStars] = useState<string>("GitHub");
  const [activeSection, setActiveSection] = useState<string>("");

  useEffect(() => {
    const onScroll = () => {
      setScrolled(window.scrollY > 80);
      if (window.scrollY > 400 && mobileOpen) setMobileOpen(false);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [mobileOpen]);

  useEffect(() => {
    fetch("https://api.github.com/repos/Abhiram-ops/agent-sentry")
      .then(r => r.json())
      .then(d => {
        if (d.stargazers_count !== undefined)
          setStars("★ " + d.stargazers_count.toLocaleString());
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const secs = ["how-it-works", "providers", "pricing", "research"];
    const els = secs.map(id => document.getElementById(id)).filter(Boolean) as HTMLElement[];
    const obs = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (e.isIntersecting) setActiveSection(e.target.id);
      });
    }, { rootMargin: "-20% 0px -60% 0px" });
    els.forEach(el => obs.observe(el));
    return () => obs.disconnect();
  }, []);

  const closeMobile = () => {
    setMobileOpen(false);
    document.body.style.overflow = "";
  };
  const toggleMobile = () => {
    const next = !mobileOpen;
    setMobileOpen(next);
    document.body.style.overflow = next ? "hidden" : "";
  };

  const links = [
    { href: "#how-it-works", label: "How it works", id: "how-it-works" },
    { href: "#providers",    label: "Providers",    id: "providers" },
    { href: "#pricing",      label: "Pricing",      id: "pricing" },
    { href: "#research",     label: "Research",     id: "research" },
  ];

  return (
    <>
      <nav className={`nav${scrolled ? " scrolled" : ""}`}>
        <div className="nav-inner">
          <a href="#top" className="nav-logo">
            <span className="mark" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="#00ff88" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                <path d="M9 12l2 2 4-4"/>
              </svg>
            </span>
            Agent<span className="ac">Sentry</span>
          </a>

          <ul className="nav-links">
            {links.map(l => (
              <li key={l.id}>
                <a href={l.href} className={activeSection === l.id ? "active" : ""}>{l.label}</a>
              </li>
            ))}
          </ul>

          <div className="nav-right">
            <a className="gh-badge" href="https://github.com/Abhiram-ops/agent-sentry"
               target="_blank" rel="noopener" aria-label="GitHub stars">
              <svg viewBox="0 0 24 24" fill="currentColor" width="14" height="14">
                <path d="M12 .5C5.7.5.5 5.7.5 12c0 5.1 3.3 9.4 7.9 10.9.6.1.8-.2.8-.5v-2c-3.2.7-3.9-1.4-3.9-1.4-.5-1.3-1.3-1.7-1.3-1.7-1-.7.1-.7.1-.7 1.2.1 1.8 1.2 1.8 1.2 1 1.8 2.7 1.3 3.4 1 .1-.8.4-1.3.7-1.6-2.6-.3-5.3-1.3-5.3-5.7 0-1.3.5-2.3 1.2-3.1-.1-.3-.5-1.5.1-3.1 0 0 1-.3 3.3 1.2a11.5 11.5 0 0 1 6 0c2.3-1.5 3.3-1.2 3.3-1.2.6 1.6.2 2.8.1 3.1.8.8 1.2 1.8 1.2 3.1 0 4.4-2.7 5.4-5.3 5.7.4.4.8 1.1.8 2.2v3.3c0 .3.2.6.8.5A11.5 11.5 0 0 0 23.5 12C23.5 5.7 18.3.5 12 .5z"/>
              </svg>
              <span>{stars}</span>
            </a>
            <a className="btn-ghost" href="https://github.com/Abhiram-ops/agent-sentry"
               target="_blank" rel="noopener">
              GitHub
            </a>
            <a className="btn-green" href="#pricing">Get free key</a>
          </div>

          <button className={`nav-tog${mobileOpen ? " open" : ""}`} onClick={toggleMobile}
            aria-label="Toggle menu" aria-expanded={mobileOpen}>
            <span/><span/><span/>
          </button>
        </div>
      </nav>

      <div className={`nav-mob${mobileOpen ? " open" : ""}`} id="nav-mob">
        {links.map(l => (
          <a key={l.id} href={l.href} onClick={closeMobile}>{l.label}</a>
        ))}
        <div className="ctas">
          <a className="btn-ghost" href="https://github.com/Abhiram-ops/agent-sentry"
             target="_blank" rel="noopener" onClick={closeMobile}>GitHub</a>
          <a className="btn-green" href="#pricing" onClick={closeMobile}>Get free key</a>
        </div>
      </div>
    </>
  );
}
