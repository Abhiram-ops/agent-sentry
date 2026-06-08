"use client";

import { useEffect, useRef } from "react";

const PROVIDERS = [
  {
    name: "Amazon Web Services", cmd: "scan aws", coverage: 94,
    features: ["IAM roles and access keys", "Lambda execution roles", "Secrets Manager credentials"],
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="#FF9900" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17.5 19a4.5 4.5 0 1 0 0-9h-1.8A7 7 0 1 0 4 15.7"/>
        <path d="M8 16l4 4 4-4M12 12v8"/>
      </svg>
    ),
  },
  {
    name: "Google Cloud", cmd: "scan gcp", coverage: 72,
    features: ["Service Accounts", "User-managed SA keys", "Project IAM bindings"],
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="#5B9DF5" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17.5 19a4.5 4.5 0 1 0 0-9h-1.8A7 7 0 1 0 4 15.7"/>
        <circle cx="12" cy="13" r="2.5"/>
      </svg>
    ),
  },
  {
    name: "GitHub", cmd: "scan github", coverage: 91,
    features: ["Personal Access Tokens", "Deploy Keys and SSH Keys", "Actions Secrets"],
    icon: (
      <svg viewBox="0 0 24 24" fill="#d0dbd7">
        <path d="M12 .5C5.7.5.5 5.7.5 12c0 5.1 3.3 9.4 7.9 10.9.6.1.8-.2.8-.5v-2c-3.2.7-3.9-1.4-3.9-1.4-.5-1.3-1.3-1.7-1.3-1.7-1-.7.1-.7.1-.7 1.2.1 1.8 1.2 1.8 1.2 1 1.8 2.7 1.3 3.4 1 .1-.8.4-1.3.7-1.6-2.6-.3-5.3-1.3-5.3-5.7 0-1.3.5-2.3 1.2-3.1-.1-.3-.5-1.5.1-3.1 0 0 1-.3 3.3 1.2a11.5 11.5 0 0 1 6 0c2.3-1.5 3.3-1.2 3.3-1.2.6 1.6.2 2.8.1 3.1.8.8 1.2 1.8 1.2 3.1 0 4.4-2.7 5.4-5.3 5.7.4.4.8 1.1.8 2.2v3.3c0 .3.2.6.8.5A11.5 11.5 0 0 0 23.5 12C23.5 5.7 18.3.5 12 .5z"/>
      </svg>
    ),
  },
  {
    name: "Microsoft Azure", cmd: "scan azure", coverage: 68,
    features: ["Managed Identities", "Service Principals", "Owner and Contributor roles"],
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="#3C9BE0" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 4 3 18h4l3-7"/><path d="M11 9l4 9H8"/><path d="M13 4h4l4 14"/>
      </svg>
    ),
  },
  {
    name: "Kubernetes", cmd: "scan k8s", coverage: 79,
    features: ["ServiceAccounts and RBAC", "ClusterRoleBindings", "Automount token exposure"],
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="#5B7FE0" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2 21 7v10l-9 5-9-5V7z"/>
        <path d="M12 8v4l3 2M12 12l-3 2"/>
      </svg>
    ),
  },
  {
    name: "Local Environment", cmd: "scan local", coverage: 88, featured: true,
    features: ["Env vars and .env files", "SSH keys and credential files", "Docker socket and git tokens"],
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="#00ff88" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="4" width="20" height="14" rx="2"/>
        <path d="m6 8 3 3-3 3M12 14h5"/>
      </svg>
    ),
  },
];

function ProviderCard({ p, delay }: { p: typeof PROVIDERS[0]; delay: string }) {
  const barRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = barRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting) {
        el.style.width = p.coverage + "%";
        obs.unobserve(el);
      }
    }, { threshold: 0.4 });
    obs.observe(el);
    return () => obs.disconnect();
  }, [p.coverage]);

  return (
    <div className={`prov-card reveal${p.featured ? " featured" : ""}`} style={{ transitionDelay: delay }}>
      {p.featured && <span className="prov-tag">No credentials needed</span>}
      <div className="prov-head" style={p.featured ? { marginTop: "var(--u1)" } : undefined}>
        <span className="prov-ico" style={p.featured ? { background: "rgba(0,255,136,.1)", borderColor: "rgba(0,255,136,.25)" } : undefined}>
          {p.icon}
        </span>
        <div>
          <div className="prov-name">{p.name}</div>
          <div className="prov-cmd">{p.cmd}</div>
        </div>
      </div>
      <ul className="prov-feats">
        {p.features.map((f, i) => <li key={i}>{f}</li>)}
      </ul>
      <div className="prov-bar">
        <div className="prov-bar-track">
          <div ref={barRef} className="prov-bar-fill" style={{ width: 0 }}/>
        </div>
        <span className="prov-bar-lbl mono">{p.coverage}% coverage</span>
      </div>
    </div>
  );
}

export default function Providers() {
  return (
    <section className="sec" id="providers" style={{ paddingTop: 0 }}>
      <hr className="hairline"/>
      <div className="w" style={{ paddingTop: "var(--u16)" }}>
        <div className="sec-head reveal">
          <div className="kicker">Providers</div>
          <h2 className="sec-h">Not just AWS. Everywhere you deploy.</h2>
          <p className="sec-sub">
            Six independent providers, each checking its own permissions before touching a single API.
            Install only what you need.
          </p>
        </div>

        <div className="prov-grid">
          {PROVIDERS.map((p, i) => (
            <ProviderCard key={p.name} p={p} delay={`${i * 0.05}s`}/>
          ))}
        </div>

        <div className="prov-ai-card reveal" style={{ transitionDelay: ".1s" }}>
          <div className="prov-ai-ico">
            <svg viewBox="0 0 24 24" fill="none" stroke="#00ff88" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
              <rect x="4" y="4" width="16" height="16" rx="2"/>
              <path d="M9 9h6v6H9zM2 9h2M2 15h2M20 9h2M20 15h2M9 2v2M15 2v2M9 20v2M15 20v2"/>
            </svg>
          </div>
          <div>
            <div className="prov-ai-title">AI Agent Scanner</div>
            <div className="prov-ai-sub">
              Static analysis of LangChain, CrewAI, and AutoGen codebases. Extracts tool permissions
              and computes the AI-Amplification Factor. No runtime required.
            </div>
          </div>
          <div className="prov-ai-badges">
            <span className="agent-badge">LangChain</span>
            <span className="agent-badge">CrewAI</span>
            <span className="agent-badge">AutoGen</span>
          </div>
          <div className="prov-ai-note">Static analysis &nbsp;·&nbsp; no runtime needed</div>
        </div>
      </div>
    </section>
  );
}
