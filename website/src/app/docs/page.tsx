"use client";
import { useState } from "react";

const NAV = [
  { id: "quickstart",   label: "Quick Start" },
  { id: "install",      label: "Installation" },
  { id: "providers",    label: "Provider Setup" },
  { id: "commands",     label: "All Commands" },
  { id: "scoring",      label: "Risk Scoring" },
  { id: "interactive",  label: "Interactive Mode" },
  { id: "executable",   label: "Standalone Exe" },
  { id: "findings",     label: "Common Findings" },
  { id: "faq",          label: "FAQ" },
];

const S = {
  page:    { minHeight: "100vh", background: "#000", color: "#fff", fontFamily: "var(--font-geist-sans)" } as React.CSSProperties,
  wrap:    { maxWidth: 1100, margin: "0 auto", padding: "0 24px", display: "flex", gap: 48, paddingTop: 80, paddingBottom: 80 } as React.CSSProperties,
  sidebar: { width: 200, flexShrink: 0 } as React.CSSProperties,
  sticky:  { position: "sticky", top: 80 } as React.CSSProperties,
  main:    { flex: 1, minWidth: 0 } as React.CSSProperties,
  h1:      { fontSize: 36, fontWeight: 800, marginBottom: 8, color: "#fff" } as React.CSSProperties,
  h2:      { fontSize: 22, fontWeight: 700, marginTop: 56, marginBottom: 16, color: "#fff", borderBottom: "1px solid #111", paddingBottom: 10 } as React.CSSProperties,
  h3:      { fontSize: 16, fontWeight: 600, marginTop: 28, marginBottom: 10, color: "#ccc" } as React.CSSProperties,
  p:       { color: "#888", lineHeight: 1.75, marginBottom: 16, fontSize: 15 } as React.CSSProperties,
  pre:     { background: "#0a0a0a", border: "1px solid #1a1a1a", borderRadius: 10, padding: "16px 20px", overflowX: "auto", marginBottom: 20, fontSize: 13, lineHeight: 1.7, color: "#00ff88" } as React.CSSProperties,
  badge:   { display: "inline-block", padding: "2px 10px", borderRadius: 20, fontSize: 12, fontWeight: 600, marginRight: 6, marginBottom: 6 } as React.CSSProperties,
  table:   { width: "100%", borderCollapse: "collapse" as const, marginBottom: 20, fontSize: 14 },
  th:      { textAlign: "left" as const, padding: "10px 14px", borderBottom: "1px solid #1a1a1a", color: "#555", fontWeight: 600, fontSize: 12, textTransform: "uppercase" as const },
  td:      { padding: "10px 14px", borderBottom: "1px solid #0f0f0f", color: "#aaa", verticalAlign: "top" as const },
  navLink: (active: boolean) => ({ display: "block", padding: "6px 12px", borderRadius: 8, marginBottom: 2, color: active ? "#00ff88" : "#555", background: active ? "rgba(0,255,136,0.06)" : "transparent", cursor: "pointer", fontSize: 13, fontWeight: active ? 600 : 400, transition: "all 0.15s", textDecoration: "none" }) as React.CSSProperties,
  tip:     { background: "rgba(0,255,136,0.04)", border: "1px solid rgba(0,255,136,0.15)", borderRadius: 10, padding: "14px 18px", marginBottom: 20, color: "#aaa", fontSize: 14 } as React.CSSProperties,
  warn:    { background: "rgba(255,51,102,0.04)", border: "1px solid rgba(255,51,102,0.15)", borderRadius: 10, padding: "14px 18px", marginBottom: 20, color: "#aaa", fontSize: 14 } as React.CSSProperties,
};

function Code({ children }: { children: string }) {
  return <code style={{ fontFamily: "var(--font-geist-mono)", fontSize: "0.85em", background: "rgba(0,255,136,0.08)", padding: "2px 6px", borderRadius: 4, color: "#00ff88" }}>{children}</code>;
}

function FAQ({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ borderBottom: "1px solid #111", paddingBottom: 16, marginBottom: 16 }}>
      <div onClick={() => setOpen(o => !o)} style={{ cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center", paddingBottom: 8 }}>
        <span style={{ color: "#ddd", fontWeight: 500, fontSize: 15 }}>{q}</span>
        <span style={{ color: "#444", fontSize: 18 }}>{open ? "−" : "+"}</span>
      </div>
      {open && <p style={{ ...S.p, marginBottom: 0 }}>{a}</p>}
    </div>
  );
}

export default function DocsPage() {
  const [active, setActive] = useState("quickstart");

  return (
    <div style={S.page}>
      {/* Top bar */}
      <div style={{ position: "fixed", top: 0, left: 0, right: 0, zIndex: 100, background: "rgba(0,0,0,0.85)", backdropFilter: "blur(12px)", borderBottom: "1px solid #111", padding: "0 24px", height: 56, display: "flex", alignItems: "center", gap: 24 }}>
        <a href="/" style={{ color: "#00ff88", fontWeight: 700, fontSize: 15, textDecoration: "none" }}>⬡ AgentSentry</a>
        <span style={{ color: "#222" }}>|</span>
        <span style={{ color: "#555", fontSize: 14 }}>Documentation</span>
        <div style={{ marginLeft: "auto", display: "flex", gap: 16 }}>
          <a href="https://github.com/Abhiram-ops/agent-sentry" target="_blank" rel="noreferrer" style={{ color: "#555", fontSize: 13, textDecoration: "none" }}>GitHub</a>
          <a href="https://pypi.org/project/nhi-audit/" target="_blank" rel="noreferrer" style={{ color: "#555", fontSize: 13, textDecoration: "none" }}>PyPI</a>
        </div>
      </div>

      <div style={S.wrap}>
        {/* Sidebar */}
        <div style={S.sidebar}>
          <div style={S.sticky as React.CSSProperties}>
            <div style={{ fontSize: 11, color: "#333", fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, marginBottom: 12 }}>On this page</div>
            {NAV.map(n => (
              <a key={n.id} href={`#${n.id}`} style={S.navLink(active === n.id)}
                onClick={() => setActive(n.id)}>{n.label}</a>
            ))}
            <div style={{ marginTop: 32, padding: "14px 12px", background: "rgba(0,255,136,0.04)", border: "1px solid rgba(0,255,136,0.1)", borderRadius: 10 }}>
              <div style={{ color: "#00ff88", fontSize: 12, fontWeight: 600, marginBottom: 6 }}>Install now</div>
              <code style={{ fontSize: 11, color: "#aaa", fontFamily: "monospace" }}>pip install nhi-audit</code>
            </div>
          </div>
        </div>

        {/* Content */}
        <main style={S.main}>
          <div style={{ marginBottom: 8, display: "flex", gap: 8, flexWrap: "wrap" }}>
            {[["PyPI", "#00ff88"], ["AGPL-3.0", "#00cc6a"], ["Python 3.10+", "#3b82f6"]].map(([label, color]) => (
              <span key={label} style={{ ...S.badge, background: `${color}18`, color, border: `1px solid ${color}33` }}>{label}</span>
            ))}
          </div>
          <h1 style={S.h1}>AgentSentry Docs</h1>
          <p style={S.p}>Open-source NHI &amp; AI agent risk scanner. Discovers every machine identity across AWS, Azure, GCP, GitHub, Kubernetes, and your local machine — scores blast radius with P×R×E×A.</p>

          {/* Quick Start */}
          <h2 id="quickstart" style={S.h2}>Quick Start</h2>
          <div style={S.tip}>⚡ No cloud credentials needed to try it — <Code>agentsentry scan mock</Code> runs a full multi-cloud demo instantly.</div>
          <pre style={S.pre}>{`pip install nhi-audit

# Fix PATH on Windows (run once)
python -m agentsentry --install-path

# Recommended for first-time users
agentsentry interactive

# Or go straight to scanning
agentsentry scan mock          # full demo, no credentials
agentsentry scan local         # scan this machine now`}</pre>

          {/* Installation */}
          <h2 id="install" style={S.h2}>Installation</h2>
          <h3 style={S.h3}>Core package</h3>
          <pre style={S.pre}>{`pip install nhi-audit`}</pre>
          <p style={S.p}>Includes the local scanner, mock demo, and AI agent code scanner. No cloud credentials needed.</p>

          <h3 style={S.h3}>With cloud providers</h3>
          <pre style={S.pre}>{`pip install nhi-audit[aws]          # AWS IAM, Lambda, S3, Secrets Manager
pip install nhi-audit[azure]        # Managed Identities, Service Principals
pip install nhi-audit[gcp]          # Service Accounts, SA Keys
pip install nhi-audit[github]       # PATs, Deploy Keys, Actions Secrets
pip install nhi-audit[k8s]          # ServiceAccounts, ClusterRoleBindings
pip install nhi-audit[all-clouds]   # everything at once`}</pre>

          {/* Provider Setup */}
          <h2 id="providers" style={S.h2}>Provider Setup</h2>

          <h3 style={S.h3}>🖥️ Local (no setup)</h3>
          <pre style={S.pre}>{`agentsentry scan local
agentsentry scan local --path ./my-project   # specific directory`}</pre>
          <p style={S.p}>Scans env vars, SSH keys, .env files, cloud credential files, and source code for hardcoded secrets. No credentials required.</p>

          <h3 style={S.h3}>☁️ AWS</h3>
          <pre style={S.pre}>{`aws configure                              # enter Access Key + Secret
agentsentry scan aws
agentsentry scan aws --region eu-west-1    # specific region
agentsentry scan aws --profile myprofile   # named profile`}</pre>
          <p style={S.p}>Minimum IAM permissions: <Code>iam:List*</Code>, <Code>iam:Get*</Code>, <Code>sts:GetCallerIdentity</Code>, <Code>lambda:ListFunctions</Code>, <Code>s3:ListAllMyBuckets</Code></p>

          <h3 style={S.h3}>🔷 Azure</h3>
          <pre style={S.pre}>{`az login                                   # browser opens, sign in
agentsentry scan azure`}</pre>
          <p style={S.p}>Or with a service principal:</p>
          <pre style={S.pre}>{`set AZURE_TENANT_ID=<tenant>
set AZURE_CLIENT_ID=<client>
set AZURE_CLIENT_SECRET=<secret>
agentsentry scan azure`}</pre>

          <h3 style={S.h3}>🟡 GCP</h3>
          <pre style={S.pre}>{`gcloud auth application-default login      # browser opens
agentsentry scan gcp`}</pre>
          <p style={S.p}>Or with a service account key file:</p>
          <pre style={S.pre}>{`set GOOGLE_APPLICATION_CREDENTIALS=C:\path\to\key.json
agentsentry scan gcp`}</pre>

          <h3 style={S.h3}>🐙 GitHub</h3>
          <pre style={S.pre}>{`# Create token at: github.com/settings/tokens
# Scopes: repo, read:org, read:user
set GITHUB_TOKEN=ghp_your_token_here
agentsentry scan github
agentsentry scan github --org myorganisation`}</pre>

          <h3 style={S.h3}>☸️ Kubernetes</h3>
          <pre style={S.pre}>{`kubectl config use-context my-cluster
agentsentry scan k8s
agentsentry scan k8s --namespace production
agentsentry scan k8s --context prod-cluster`}</pre>

          <h3 style={S.h3}>🤖 AI Agent Code</h3>
          <pre style={S.pre}>{`agentsentry scan agents --path ./my-project
# Scans LangChain / CrewAI / AutoGen Python files`}</pre>

          {/* All Commands */}
          <h2 id="commands" style={S.h2}>All Commands</h2>
          <pre style={S.pre}>{`# Scanning
agentsentry scan mock
agentsentry scan local --path ./myproject
agentsentry scan aws
agentsentry scan azure
agentsentry scan gcp
agentsentry scan github --org myorg
agentsentry scan k8s --namespace production --context prod
agentsentry scan agents --path .
agentsentry scan all                    # auto-detect + scan all ready

# Flags (work on any scan command)
agentsentry scan aws --visualize        # interactive HTML attack graph
agentsentry scan aws --enrich           # + CISA KEV threat intel
agentsentry scan aws --json             # JSON output

# Provider info
agentsentry providers                   # list all + readiness
agentsentry permissions aws             # exact permissions needed

# Analysis
agentsentry blast "ml-pipeline"         # blast radius for one NHI

# Guided mode
agentsentry interactive                 # numbered provider picker

# Utilities
agentsentry --version
python -m agentsentry --install-path    # fix Windows PATH`}</pre>

          {/* Risk Scoring */}
          <h2 id="scoring" style={S.h2}>Risk Scoring: P×R×E×A</h2>
          <pre style={S.pre}>{`Risk = P × R × E × A

P  Privilege Score      1–10    What can this identity DO?
R  Reachability Score   1–3     How accessible is it to attackers?
E  Exposure Score       1–5     How poor is the credential lifecycle?
A  AI-Amplification     1–60    Does autonomous AI multiply blast radius?

CRITICAL ≥ 100  |  HIGH ≥ 50  |  MEDIUM ≥ 20  |  LOW < 20`}</pre>
          <table style={S.table}>
            <thead><tr><th style={S.th}>Factor</th><th style={S.th}>Example (low)</th><th style={S.th}>Example (high)</th></tr></thead>
            <tbody>
              {[
                ["P — Privilege","ReadOnly role (1.0)","AdministratorAccess (10.0)"],
                ["R — Reachability","Internal only (1.0)","Internet-facing (3.0)"],
                ["E — Exposure","Rotated 7 days ago (1.0)","Never rotated (5.0)"],
                ["A — AI-Amplification","Read-only bot (1.0)","Autonomous agent with delete tools (60.0)"],
              ].map(([f,lo,hi]) => (
                <tr key={f}><td style={S.td}><Code>{f}</Code></td><td style={S.td}>{lo}</td><td style={S.td}>{hi}</td></tr>
              ))}
            </tbody>
          </table>

          {/* Interactive Mode */}
          <h2 id="interactive" style={S.h2}>Interactive Mode</h2>
          <p style={S.p}>Run <Code>agentsentry interactive</Code> for a guided experience — no flags needed.</p>
          <pre style={S.pre}>{`agentsentry interactive

# Shows a numbered menu:
#   1  ● local    ready          This machine — env vars, SSH keys, files
#   2  ● aws      ready          Amazon Web Services
#   3  ● azure    no sdk         pip install nhi-audit[azure]
#   4  ● github   no creds       set GITHUB_TOKEN=...
#   ...
# Enter numbers to scan (e.g. 1,2 or all): 1,2
# Directory to scan [.]: ./my-project`}</pre>
          <p style={S.p}>If a provider SDK is missing, it offers to install it inline. If credentials are missing, it shows exactly what command to run.</p>

          {/* Standalone Exe */}
          <h2 id="executable" style={S.h2}>Standalone Executable</h2>
          <p style={S.p}>No Python installation required. Download a pre-built binary from <a href="https://github.com/Abhiram-ops/agent-sentry/releases" style={{ color: "#00ff88" }}>GitHub Releases</a>.</p>
          <table style={S.table}>
            <thead><tr><th style={S.th}>Platform</th><th style={S.th}>File</th></tr></thead>
            <tbody>
              {[["Windows","agentsentry-windows.exe"],["macOS","agentsentry-macos"],["Linux","agentsentry-linux"]].map(([p,f]) => (
                <tr key={p}><td style={S.td}>{p}</td><td style={S.td}><Code>{f}</Code></td></tr>
              ))}
            </tbody>
          </table>
          <pre style={S.pre}>{`# Windows — run directly
agentsentry-windows.exe interactive

# macOS / Linux
chmod +x agentsentry-macos
./agentsentry-macos interactive`}</pre>

          {/* Common Findings */}
          <h2 id="findings" style={S.h2}>Common Findings & Fixes</h2>
          {[
            ["AdministratorAccess on IAM role","Apply least-privilege. Use CloudTrail access advisor to see what the role actually uses, then replace AdministratorAccess with a specific policy.","agentsentry scan aws"],
            ["Unrotated access key > 90 days","Rotate immediately: create a new key, update all consumers, deactivate the old key, delete after 7 days.","aws iam create-access-key"],
            ["Fully autonomous AI agent with irreversible tools","Add a human-in-the-loop approval callback for all irreversible tools (send_email, delete_record). Set max_iterations cap.","agentsentry scan agents --path ."],
            ["cluster-admin ClusterRoleBinding","Scope to a specific namespace with a Role instead of ClusterRole. Never give cluster-admin to a ServiceAccount.","agentsentry scan k8s"],
            ["Unencrypted SSH private key","Add passphrase: ssh-keygen -p -f ~/.ssh/id_rsa","agentsentry scan local"],
            [".env file with secrets","Add .env to .gitignore. Move secrets to a secrets manager. Rotate any that were ever committed.","agentsentry scan local --path ."],
          ].map(([title, fix, cmd]) => (
            <div key={title} style={{ background: "#080808", border: "1px solid #111", borderRadius: 12, padding: "18px 20px", marginBottom: 14 }}>
              <div style={{ color: "#ff3366", fontWeight: 600, fontSize: 14, marginBottom: 8 }}>⚠ {title}</div>
              <p style={{ ...S.p, marginBottom: 10 }}>{fix}</p>
              <pre style={{ ...S.pre, marginBottom: 0, padding: "8px 14px", fontSize: 12 }}>{cmd}</pre>
            </div>
          ))}

          {/* FAQ */}
          <h2 id="faq" style={S.h2}>FAQ</h2>
          {[
            ["Does AgentSentry store my credentials or scan data?","No. Everything runs locally on your machine. No data is sent anywhere. The tool reads your cloud credentials only to make API calls directly to your cloud provider."],
            ["What permissions does AgentSentry need?","Read-only permissions only. It never creates, modifies, or deletes anything. The exact list per provider is shown by: agentsentry permissions <provider>"],
            ["Can I use it in CI/CD?","Yes — use --json flag for machine-readable output and pipe it to your alerting system. agentsentry scan aws --json | jq '.[] | select(.risk_level == \"CRITICAL\")'"],
            ["The agentsentry command isn't found on Windows.","Run: python -m agentsentry --install-path — this permanently adds the Scripts folder to your PATH. Reopen your terminal after."],
            ["How is this different from tools like Wiz or Orca?","Those are paid SaaS products requiring cloud connectors and agent installation. AgentSentry is 100% free, open-source, runs locally, and is the only tool that includes an AI-Amplification Factor for autonomous AI agents."],
            ["Can I add my own provider?","Yes — implement BaseProvider in providers/, register in providers/__init__.py, add to PROVIDER_CHOICES in cli.py. See CONTRIBUTING.md."],
          ].map(([q, a]) => <FAQ key={q} q={q} a={a} />)}
        </main>
      </div>
    </div>
  );
}
