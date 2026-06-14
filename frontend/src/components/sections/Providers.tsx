"use client";

import { motion } from "framer-motion";

const PROVIDERS = [
  {
    name: "Amazon Web Services",
    key: "aws",
    color: "#FF9900",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" style={{ width: 20, height: 20 }}>
        <path d="M6.76 16.45c-.34.1-.71.16-1.1.16-1.88 0-3.4-1.52-3.4-3.4s1.52-3.4 3.4-3.4c.18 0 .36.01.53.04" stroke="#FF9900" strokeWidth="1.5" strokeLinecap="round"/>
        <path d="M18 10.26C17.45 7.84 15.3 6 12.74 6c-1.96 0-3.7.96-4.77 2.43" stroke="#FF9900" strokeWidth="1.5" strokeLinecap="round"/>
        <path d="M19.5 10.5a4 4 0 010 8H7" stroke="#FF9900" strokeWidth="1.5" strokeLinecap="round"/>
        <path d="M9 19l-2-2 2-2M15 19l2-2-2-2" stroke="#FF9900" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
    discovers: ["IAM Roles & Access Keys", "Lambda execution roles", "S3, RDS, Secrets Manager"],
    install: "pip install agentsentry[aws]",
    setup: "aws configure",
    badge: null,
  },
  {
    name: "Microsoft Azure",
    key: "azure",
    color: "#0089D6",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" style={{ width: 20, height: 20 }}>
        <path d="M12 3L3 17h4l2-3.5L14 20h7L12 3z" stroke="#0089D6" strokeWidth="1.5" strokeLinejoin="round"/>
      </svg>
    ),
    discovers: ["Managed Identities", "Service Principals", "Role assignments (Owner/Contributor)"],
    install: "pip install agentsentry[azure]",
    setup: "az login",
    badge: null,
  },
  {
    name: "Google Cloud",
    key: "gcp",
    color: "#4285F4",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" style={{ width: 20, height: 20 }}>
        <circle cx="12" cy="12" r="4" stroke="#4285F4" strokeWidth="1.5"/>
        <path d="M12 2v3M12 19v3M2 12h3M19 12h3" stroke="#4285F4" strokeWidth="1.5" strokeLinecap="round"/>
        <path d="M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1" stroke="#4285F4" strokeWidth="1.3" strokeLinecap="round"/>
      </svg>
    ),
    discovers: ["Service Accounts", "User-managed SA keys", "Project IAM bindings"],
    install: "pip install agentsentry[gcp]",
    setup: "gcloud auth application-default login",
    badge: null,
  },
  {
    name: "GitHub",
    key: "github",
    color: "#58a6ff",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" style={{ width: 20, height: 20 }}>
        <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 00-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0020 4.77 5.07 5.07 0 0019.91 1S18.73.65 16 2.48a13.38 13.38 0 00-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 005 4.77a5.44 5.44 0 00-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 009 18.13V22" stroke="#58a6ff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
    discovers: ["Personal Access Tokens", "Deploy Keys & SSH Keys", "Actions Secrets"],
    install: null,
    setup: "export GITHUB_TOKEN=<pat>",
    badge: null,
  },
  {
    name: "Kubernetes",
    key: "k8s",
    color: "#326CE5",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" style={{ width: 20, height: 20 }}>
        <circle cx="12" cy="12" r="9" stroke="#326CE5" strokeWidth="1.5"/>
        <circle cx="12" cy="12" r="3" stroke="#326CE5" strokeWidth="1.5"/>
        <path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1" stroke="#326CE5" strokeWidth="1.3" strokeLinecap="round"/>
      </svg>
    ),
    discovers: ["ServiceAccounts & RBAC", "ClusterRoleBindings", "Automount token exposure"],
    install: "pip install agentsentry[k8s]",
    setup: "kubectl config use-context <cluster>",
    badge: null,
  },
  {
    name: "Local Environment",
    key: "local",
    color: "#1d4ed8",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" style={{ width: 20, height: 20 }}>
        <rect x="2" y="3" width="20" height="14" rx="2" stroke="#1d4ed8" strokeWidth="1.5"/>
        <path d="M8 21h8M12 17v4" stroke="#1d4ed8" strokeWidth="1.5" strokeLinecap="round"/>
        <path d="M7 8l3 3-3 3M13 14h4" stroke="#1d4ed8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
    discovers: ["Env vars & .env files", "SSH keys & credential files", "Docker socket & git tokens"],
    install: null,
    setup: null,
    badge: "No credentials needed",
  },
];

export default function Providers() {
  return (
    <section id="providers" className="section section-alt">
      <div className="container">
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }} transition={{ duration: 0.5 }}
          className="section-header">
          <div className="section-label">Providers</div>
          <h2>Not just AWS. Everywhere you deploy.</h2>
          <p>
            Six independent providers — install only what you need. Each one checks its own
            permissions before touching a single API. Start with <code style={{ color: "var(--accent)" }}>local</code> — it
            needs nothing and finds more than you expect.
          </p>
        </motion.div>

        <div className="providers-grid">
          {PROVIDERS.map((p, i) => (
            <motion.div key={p.key} initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-40px" }} transition={{ duration: 0.45, delay: i * 0.06 }}
              className={`provider-card${p.badge ? " special" : ""}`}>
              <div className="provider-top">
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ width: 36, height: 36, borderRadius: 8, background: `${p.color}14`, border: `1px solid ${p.color}30`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    {p.icon}
                  </div>
                  <div className="provider-name">{p.name}</div>
                </div>
                {p.badge && <div className="provider-tag">{p.badge}</div>}
              </div>
              <div className="provider-cmd">agentsentry scan {p.key}</div>
              <ul className="provider-features">
                {p.discovers.map((d) => <li key={d}>{d}</li>)}
              </ul>
              {p.install ? (
                <div className="provider-install"><code>$ {p.install}</code></div>
              ) : p.setup ? (
                <div className="provider-install"><code>$ {p.setup}</code></div>
              ) : null}
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
