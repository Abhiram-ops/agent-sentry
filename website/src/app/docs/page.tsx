"use client";

import React from "react";
import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { motion } from "framer-motion";

const SECTIONS = [
  { id:"quick-start",    label:"Quick Start" },
  { id:"installation",   label:"Installation" },
  { id:"providers",      label:"Providers" },
  { id:"cli",            label:"CLI Reference" },
  { id:"risk-model",     label:"Risk Model (P×R×E×A)" },
  { id:"findings",       label:"Common Findings & Fixes" },
  { id:"faq",            label:"FAQ" },
];

function Code({ children }: { children: React.ReactNode }) {
  return (
    <pre style={{
      background:"#080808", border:"1px solid rgba(255,255,255,0.07)",
      borderRadius:10, padding:"16px 20px", overflowX:"auto",
      fontFamily:"monospace", fontSize:13, color:"#00ff88", lineHeight:1.7,
      margin:"12px 0",
    }}>
      {children}
    </pre>
  );
}

function Callout({ color="#00ff88", children }: { color?:string; children:React.ReactNode }) {
  return (
    <div style={{
      padding:"14px 18px", borderRadius:10, margin:"16px 0",
      background:`rgba(${color==="#00ff88"?"0,255,136":color==="#ffcc00"?"255,204,0":"255,51,102"},0.07)`,
      border:`1px solid ${color}25`, color:"#666", fontSize:14, lineHeight:1.7,
    }}>
      {children}
    </div>
  );
}

function H2({ id, children }: { id:string; children:React.ReactNode }) {
  return (
    <h2 id={id} style={{ fontSize:"clamp(1.4rem,2.5vw,1.9rem)", fontWeight:700, color:"#fff",
      letterSpacing:"-0.02em", lineHeight:1.2, marginTop:56, marginBottom:20, scrollMarginTop:88 }}>
      {children}
    </h2>
  );
}
function H3({ children }: { children:React.ReactNode }) {
  return <h3 style={{ fontSize:16, fontWeight:600, color:"#ccc", marginTop:28, marginBottom:10 }}>{children}</h3>;
}
function P({ children }: { children:React.ReactNode }) {
  return <p style={{ color:"#555", lineHeight:1.8, marginBottom:12 }}>{children}</p>;
}
function IL({ children }: { children:React.ReactNode }) {
  return <code style={{ fontFamily:"monospace", fontSize:"0.85em", background:"rgba(0,255,136,0.08)", padding:"2px 6px", borderRadius:4, color:"#00ff88" }}>{children}</code>;
}

export default function DocsPage() {
  const [active, setActive] = useState("quick-start");
  const obs = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    obs.current = new IntersectionObserver(
      entries => { entries.forEach(e => { if (e.isIntersecting) setActive(e.target.id); }); },
      { rootMargin:"-20% 0px -70% 0px" }
    );
    SECTIONS.forEach(s => {
      const el = document.getElementById(s.id);
      if (el) obs.current?.observe(el);
    });
    return () => obs.current?.disconnect();
  }, []);

  return (
    <div style={{ background:"#000", minHeight:"100vh", color:"#fff" }}>
      {/* Nav */}
      <div style={{ position:"fixed", top:0, left:0, right:0, zIndex:100, borderBottom:"1px solid rgba(255,255,255,0.05)", background:"rgba(0,0,0,0.85)", backdropFilter:"blur(20px)", padding:"0 32px", height:60, display:"flex", alignItems:"center", gap:24 }}>
        <Link href="/" style={{ fontWeight:700, color:"#fff", textDecoration:"none", fontSize:15 }}>
          Agent<span style={{ color:"#00ff88" }}>Sentry</span>
        </Link>
        <span style={{ color:"#1e1e1e" }}>/</span>
        <span style={{ color:"#444", fontSize:14 }}>Documentation</span>
        <Link href="/" style={{ marginLeft:"auto", fontSize:13, color:"#333", textDecoration:"none", transition:"color 0.15s" }}
          onMouseEnter={e=>{(e.target as HTMLElement).style.color="#fff"}}
          onMouseLeave={e=>{(e.target as HTMLElement).style.color="#333"}}>
          ← Back to site
        </Link>
      </div>

      <div style={{ maxWidth:1100, margin:"0 auto", padding:"80px 24px 0", display:"grid", gridTemplateColumns:"220px 1fr", gap:48 }} className="docs-layout">
        {/* Sidebar */}
        <aside style={{ position:"sticky", top:80, height:"calc(100vh - 100px)", overflowY:"auto", paddingTop:32 }}>
          <div style={{ fontSize:10, fontFamily:"monospace", color:"#2a2a2a", letterSpacing:"0.15em", textTransform:"uppercase", marginBottom:16 }}>Contents</div>
          {SECTIONS.map(s => (
            <a key={s.id} href={`#${s.id}`}
              style={{ display:"block", padding:"7px 12px", borderRadius:8, marginBottom:2, fontSize:13, color:active===s.id?"#00ff88":"#333", background:active===s.id?"rgba(0,255,136,0.07)":"transparent", textDecoration:"none", borderLeft:`2px solid ${active===s.id?"#00ff88":"transparent"}`, transition:"all 0.15s" }}>
              {s.label}
            </a>
          ))}
          <div style={{ marginTop:28, paddingTop:24, borderTop:"1px solid rgba(255,255,255,0.05)" }}>
            <a href="https://github.com/Abhiram-ops/agent-sentry" target="_blank" style={{ display:"flex", alignItems:"center", gap:8, fontSize:12, color:"#2a2a2a", textDecoration:"none" }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 00-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0020 4.77 5.07 5.07 0 0019.91 1S18.73.65 16 2.48a13.38 13.38 0 00-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 005 4.77a5.44 5.44 0 00-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 009 18.13V22" strokeLinecap="round" strokeLinejoin="round"/></svg>
              GitHub
            </a>
          </div>
        </aside>

        {/* Content */}
        <main style={{ paddingTop:32, paddingBottom:120 }}>
          {/* Quick Start */}
          <H2 id="quick-start">Quick Start</H2>
          <P>Get your first scan running in under 2 minutes. No cloud credentials needed — start with the local scanner.</P>
          <Code>{`# 1. Install
pip install agentsentry

# 2. Scan your local machine (no credentials needed)
agentsentry scan local

# 3. See what providers are available
agentsentry providers`}</Code>
          <Callout>The <IL>local</IL> scanner finds exposed env vars, .env files, unencrypted SSH keys, cloud credential files, and Docker socket exposure — with zero setup.</Callout>

          {/* Installation */}
          <H2 id="installation">Installation</H2>
          <P>AgentSentry uses optional dependency groups so you only install what you need.</P>
          <H3>Core (includes local scanner)</H3>
          <Code>{`pip install agentsentry`}</Code>
          <H3>Per-provider SDKs</H3>
          <Code>{`pip install agentsentry[aws]         # Amazon Web Services
pip install agentsentry[azure]       # Microsoft Azure
pip install agentsentry[gcp]         # Google Cloud Platform
pip install agentsentry[k8s]         # Kubernetes
pip install agentsentry[all-clouds]  # Everything at once`}</Code>
          <Callout color="#ffcc00">Python 3.10+ required. We recommend a virtual environment: <IL>python -m venv .venv && source .venv/bin/activate</IL></Callout>

          {/* Providers */}
          <H2 id="providers">Providers</H2>

          {[
            { name:"AWS", color:"#FF9900", setup:`aws configure
# OR set environment variables:
export AWS_ACCESS_KEY_ID=AKIA...
export AWS_SECRET_ACCESS_KEY=...
export AWS_DEFAULT_REGION=us-east-1`, cmd:"agentsentry scan aws",
              discovers:["IAM Roles and their attached policies","IAM Users with programmatic access keys","Lambda execution roles","S3 buckets and public access status","Secrets Manager entries"] },
            { name:"Azure", color:"#0089D6", setup:`az login
# OR service principal:
export AZURE_TENANT_ID=...
export AZURE_CLIENT_ID=...
export AZURE_CLIENT_SECRET=...`, cmd:"agentsentry scan azure",
              discovers:["Managed Identities (user-assigned and system-assigned)","Service Principals and their role assignments","Subscriptions where Owner/Contributor is granted","Resource groups as attack surface inventory"] },
            { name:"GCP", color:"#4285F4", setup:`gcloud auth application-default login
# OR service account key file:
export GOOGLE_APPLICATION_CREDENTIALS=/path/to/key.json
export GOOGLE_CLOUD_PROJECT=my-project`, cmd:"agentsentry scan gcp",
              discovers:["Service Accounts across the project","User-managed SA keys (long-lived, high risk)","IAM policy bindings at project level","GCS buckets"] },
            { name:"GitHub", color:"#58a6ff", setup:`export GITHUB_TOKEN=ghp_...
# Required scopes: repo, read:org
# Create at: github.com/settings/tokens`, cmd:"agentsentry scan github --org myorg",
              discovers:["Personal Access Token scopes (admin:org is critical)","SSH and deploy keys across repos","Read/write vs read-only deploy key configuration","Org-level Actions secrets"] },
            { name:"Kubernetes", color:"#326CE5", setup:`# Uses kubeconfig automatically
kubectl config use-context prod-cluster
# OR specify:
# KUBECONTEXT env var`, cmd:"agentsentry scan k8s --namespace production",
              discovers:["ServiceAccounts across all namespaces","ClusterRoleBindings (cluster-admin is critical)","automountServiceAccountToken exposure","Namespace inventory for crown jewel tagging"] },
            { name:"Local", color:"#00ff88", setup:"No credentials needed — runs anywhere.", cmd:"agentsentry scan local",
              discovers:["Environment variables matching secret patterns","`.env` files in current directory tree","SSH private keys (unencrypted, bad permissions)","Cloud credential files (~/.aws, ~/.kube, ~/.config/gcloud)","Docker socket exposure","Git credential store (~/.git-credentials)"] },
          ].map(p => (
            <div key={p.name} style={{ marginBottom:40, padding:"24px", borderRadius:14, border:"1px solid rgba(255,255,255,0.06)", background:"rgba(255,255,255,0.01)" }}>
              <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:16 }}>
                <div style={{ width:8, height:8, borderRadius:"50%", background:p.color }} />
                <h3 style={{ color:p.color, fontWeight:600, fontSize:16, margin:0 }}>{p.name}</h3>
              </div>
              <P>Discovers: {p.discovers.join(", ")}.</P>
              <Code>{`# Setup\n${p.setup}\n\n# Run\n${p.cmd}`}</Code>
            </div>
          ))}

          {/* CLI */}
          <H2 id="cli">CLI Reference</H2>
          {[
            { cmd:"agentsentry scan <provider>",       desc:"Scan a specific environment. Runs a permission check first unless --force is passed." },
            { cmd:"agentsentry scan all",               desc:"Auto-detect all configured providers and scan them sequentially. Produces an aggregated NHI inventory." },
            { cmd:"agentsentry providers",              desc:"List all providers with their readiness status, credentials state, and detected account info." },
            { cmd:"agentsentry permissions <provider>",desc:"Show the exact permissions required by a provider before touching any API." },
            { cmd:"agentsentry blast <nhi-name>",       desc:"Compute the blast radius for a specific NHI — how many nodes are reachable, which crown jewels are at risk." },
            { cmd:"agentsentry scan agents --path .",   desc:"Statically analyze Python files for LangChain, CrewAI, and AutoGen agent definitions. Extracts tool permissions and computes AI-Amplification Factor." },
          ].map(c => (
            <div key={c.cmd} style={{ marginBottom:20, padding:"16px 20px", borderRadius:10, border:"1px solid rgba(255,255,255,0.05)", background:"rgba(255,255,255,0.01)" }}>
              <div style={{ fontFamily:"monospace", fontSize:13, color:"#00ff88", marginBottom:8 }}>{c.cmd}</div>
              <div style={{ fontSize:13, color:"#4a4a4a", lineHeight:1.65 }}>{c.desc}</div>
            </div>
          ))}
          <H3>Common flags</H3>
          <Code>{`--enrich       Enrich findings with CISA KEV threat intel (requires internet)
--visualize    Generate interactive HTML attack graph
--output PATH  Path for HTML output (default: agentsentry_graph.html)
--json         Output findings as JSON instead of terminal table
--force        Skip permission pre-check
--profile      AWS credential profile
--region       AWS region (default: us-east-1)
--org          GitHub organisation name
--namespace    Kubernetes namespace (default: all)
--context      Kubernetes kubeconfig context`}</Code>

          {/* Risk model */}
          <H2 id="risk-model">Risk Model: P×R×E×A</H2>
          <P>AgentSentry scores every NHI using a four-factor formula. The AI-Amplification Factor (A) is a novel academic contribution — no prior framework accounts for autonomous agent blast radius.</P>
          <Code>{`Risk Score = P × R × E × A

P  Privilege       0–10   What can this identity DO?
                          10 = AdministratorAccess / cluster-admin
                          7  = High-privilege (IAMFullAccess, Contributor)
                          3  = Moderate write (s3:PutObject, lambda:InvokeFunction)
                          1  = Read-only

R  Reachability    0–10   How many nodes reachable if compromised?
                          Computed from the attack graph (NetworkX BFS)

E  Exposure        0–5    How accessible is this identity from outside?
                          5 = Internet-facing
                          3 = Cross-account / cross-tenant
                          2 = Internal but widely trusted
                          1 = Internal, single service

A  AI-Amplification 1.0–3.0  Is this an autonomous AI agent?
                          3.0 = Fully autonomous, irreversible tools, no human gate
                          2.0 = Semi-autonomous, some approval
                          1.0 = Not an AI agent

Thresholds:  > 100 → CRITICAL  |  > 50 → HIGH  |  > 20 → MEDIUM  |  ≤ 20 → LOW`}</Code>

          {/* Findings */}
          <H2 id="findings">Common Findings &amp; Fixes</H2>
          {[
            { title:"AdministratorAccess on IAM Role", risk:"CRITICAL", fix:`aws iam detach-role-policy --role-name <role> --policy-arn arn:aws:iam::aws:policy/AdministratorAccess
# Then attach a custom least-privilege policy` },
            { title:"AI Agent with irreversible tools + no human gate", risk:"CRITICAL", fix:`# In your LangChain agent, add a confirmation callback:
agent = initialize_agent(tools, llm, 
  callbacks=[HumanApprovalCallbackHandler()])` },
            { title:"ServiceAccount bound to cluster-admin", risk:"CRITICAL", fix:`kubectl delete clusterrolebinding <binding-name>
kubectl create rolebinding <name> --role=<scoped-role> \\
  --serviceaccount=<namespace>:<sa-name> -n <namespace>` },
            { title:"Unencrypted SSH private key", risk:"HIGH", fix:`ssh-keygen -p -f ~/.ssh/id_rsa   # Add passphrase
chmod 600 ~/.ssh/id_rsa           # Fix permissions` },
            { title:"Access key not rotated in 90+ days", risk:"HIGH", fix:`aws iam create-access-key --user-name <user>
# Test new key, then:
aws iam delete-access-key --access-key-id <old-key> --user-name <user>` },
            { title:"Secrets in .env file", risk:"HIGH", fix:`# 1. Add to .gitignore immediately
echo ".env" >> .gitignore
# 2. Rotate any secrets that may have been committed
# 3. Move to secrets manager (AWS, HashiCorp Vault, etc.)` },
          ].map(f => (
            <div key={f.title} style={{ marginBottom:28 }}>
              <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:8 }}>
                <span style={{ padding:"2px 8px", borderRadius:4, fontSize:11, fontFamily:"monospace", fontWeight:700, background:f.risk==="CRITICAL"?"rgba(255,51,102,0.12)":"rgba(255,204,0,0.10)", color:f.risk==="CRITICAL"?"#ff3366":"#ffcc00" }}>{f.risk}</span>
                <span style={{ color:"#ccc", fontWeight:600, fontSize:14 }}>{f.title}</span>
              </div>
              <Code>{f.fix}</Code>
            </div>
          ))}

          {/* FAQ */}
          <H2 id="faq">FAQ</H2>
          {[
            { q:"Does AgentSentry send my data anywhere?", a:"No. AgentSentry runs entirely locally. Scan results never leave your machine unless you explicitly use --json to export them. The only external call is the optional CISA KEV enrichment (--enrich flag), which fetches a public threat intelligence feed." },
            { q:"What permissions does the AWS scanner need?", a:"Read-only IAM, STS, S3, Lambda, and Secrets Manager. Run agentsentry permissions aws for the exact policy document." },
            { q:"Can I scan a production environment safely?", a:"Yes — all scans are read-only. No changes are made to your environment. AgentSentry only calls List* and Get* APIs." },
            { q:"What is the AI-Amplification Factor?", a:"A novel metric from the AgentSentry research paper. Autonomous AI agents (LangChain, CrewAI, AutoGen) multiply blast radius because they can act without human approval. A fully autonomous agent with irreversible tools gets A=3.0, tripling its risk score." },
            { q:"How do I add a custom provider?", a:"Subclass BaseProvider from agentsentry.providers.base, implement check_permissions() and scan(), then register it: registry.register('myenv', MyProvider). See providers/local.py for a simple reference implementation." },
            { q:"How do I run AgentSentry in CI/CD?", a:"Use agentsentry scan aws --json to get machine-readable output. You can fail the pipeline if critical findings are present: agentsentry scan aws --json | python -c \"import json,sys; d=json.load(sys.stdin); sys.exit(1 if any(n['risk_level']=='CRITICAL' for n in d) else 0)\"" },
          ].map(item => (
            <details key={item.q} style={{ marginBottom:12, borderRadius:10, border:"1px solid rgba(255,255,255,0.06)", overflow:"hidden" }}>
              <summary style={{ padding:"14px 18px", cursor:"pointer", color:"#888", fontWeight:500, fontSize:14, listStyle:"none", display:"flex", justifyContent:"space-between" }}>
                {item.q}
                <span style={{ color:"#2a2a2a" }}>+</span>
              </summary>
              <div style={{ padding:"0 18px 16px", color:"#4a4a4a", fontSize:14, lineHeight:1.75 }}>{item.a}</div>
            </details>
          ))}
        </main>
      </div>

      <style>{`
        @media (max-width: 768px) { .docs-layout { grid-template-columns: 1fr !important; } .docs-layout aside { display: none; } }
        details summary::-webkit-details-marker { display: none; }
      `}</style>
    </div>
  );
}
