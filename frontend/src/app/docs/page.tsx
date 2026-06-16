"use client";

import { useState } from "react";
import type { ReactNode, ElementType } from "react";
import { NavbarWeb3 as Navbar } from "@/components/layout/NavbarWeb3";
import Footer from "@/components/layout/Footer";
import { motion } from "framer-motion";
import { Copy, Check, Terminal, Package, Cpu, Cloud, Layers, Key, Sparkles } from "lucide-react";

/* ── Copy button ────────────────────────────────────────────────── */
function CopyBtn({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1800); }}
      className={`docs-copy-btn ${copied ? "copied" : ""}`}
      title="Copy"
    >
      {copied ? <Check style={{ width: 14, height: 14 }} /> : <Copy style={{ width: 14, height: 14 }} />}
    </button>
  );
}

/* ── Code block ─────────────────────────────────────────────────── */
function CodeBlock({ lines, lang = "bash" }: { lines: string[]; lang?: string }) {
  const text = lines.join("\n");
  return (
    <div className="code-block" style={{ padding: 0, margin: "20px 0" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 16px", borderBottom: "1px solid #21262d" }}>
        <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "#7d8590", letterSpacing: "0.05em" }}>{lang}</span>
        <CopyBtn text={text} />
      </div>
      <pre style={{ margin: 0, padding: "16px 20px", fontFamily: "var(--font-mono)", fontSize: 13, lineHeight: 1.8, overflowX: "auto" }}>
        {lines.map((line, i) => {
          const isComment = line.trim().startsWith("#");
          const isPrompt = line.startsWith("$") || line.startsWith(">") || line.startsWith("PS>");
          return (
            <div key={i} style={{ color: isComment ? "#3fb950" : isPrompt ? "#79c0ff" : "#e6edf3" }}>
              {line || " "}
            </div>
          );
        })}
      </pre>
    </div>
  );
}

/* ── OS Tab switcher ────────────────────────────────────────────── */
type OsTabsProps = { tabs: string[]; renderTab: (os: string) => ReactNode };
function OsTabs({ tabs, renderTab }: OsTabsProps) {
  const [active, setActive] = useState(tabs[0]);
  return (
    <div>
      <div className="docs-tabs">
        {tabs.map(t => (
          <button key={t} onClick={() => setActive(t)} className={`docs-tab ${active === t ? "active" : ""}`}>
            {t}
          </button>
        ))}
      </div>
      {renderTab(active)}
    </div>
  );
}

/* ── Section card ───────────────────────────────────────────────── */
type SectionProps = { id: string; icon: ElementType; accent: string; title: string; children: ReactNode };
function Section({ id, icon: Icon, accent, title, children }: SectionProps) {
  return (
    <motion.section id={id} className="docs-section" initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }} transition={{ duration: 0.5 }}>
      <div className="docs-section-head">
        <div className="docs-section-icon" style={{ background: `${accent}14`, border: `1px solid ${accent}33` }}>
          <Icon style={{ width: 16, height: 16, color: accent }} />
        </div>
        <h2 style={{ margin: 0 }}>{title}</h2>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        {children}
      </div>
    </motion.section>
  );
}

const OS_TABS = ["Linux / macOS", "Windows", "Windows (PowerShell)"];
function prompt(os: string): string {
  return os === "Linux / macOS" ? "$" : os === "Windows" ? ">" : "PS>";
}

/* ── Page ───────────────────────────────────────────────────────── */
export default function DocsPage() {
  return (
    <div className="docs-shell">
      <Navbar />

      <main className="docs-main">

        {/* Hero */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
          className="docs-hero">
          <div className="auth-eyebrow">Documentation</div>
          <h1 style={{ fontFamily: "var(--font-serif)", fontSize: "clamp(2rem, 4vw, 2.75rem)", fontWeight: 700, color: "var(--text)", lineHeight: 1.1, letterSpacing: "-0.02em", marginBottom: 16 }}>
            AgentSentry CLI
          </h1>
          <p style={{ color: "var(--text-muted)", fontSize: "1.05rem", lineHeight: 1.75, maxWidth: 560, margin: "0 auto" }}>
            Open-source NHI scanner — runs locally, zero data upload, one command to audit your entire cloud.
          </p>
          <div className="docs-anchor-nav">
            {[
              ["#whats-new","What's New"],
              ["#install","Installation"],
              ["#quick-start","Quick start"],
              ["#providers","Providers"],
              ["#output","Output formats"],
              ["#advanced","Advanced"],
            ].map(([href, label]) => (
              <a key={href} href={href}>
                {label}
              </a>
            ))}
          </div>
        </motion.div>

        {/* 0. What's New */}
        <Section id="whats-new" icon={Sparkles} accent="#f59e0b" title="What's New">
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

            {/* v0.1.10 */}
            <div style={{ border: "1px solid #21262d", borderRadius: 10, padding: "16px 20px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, fontWeight: 700, background: "var(--accent)", color: "#fff", padding: "2px 10px", borderRadius: 20 }}>v0.1.10</span>
                <span style={{ color: "var(--text-muted)", fontSize: 12 }}>Latest</span>
              </div>
              <ul style={{ margin: 0, paddingLeft: 20, color: "var(--text-muted)", fontSize: 14, lineHeight: 2 }}>
                <li>Fix <code style={{ fontFamily: "var(--font-mono)", fontSize: 12 }}>~/.aws/config</code> being over-scored — it stores profile names, not keys, so it now correctly scores as INFO</li>
                <li>Fix GCP <code style={{ fontFamily: "var(--font-mono)", fontSize: 12 }}>credentials.db</code> showing wrong &quot;Hardcoded secrets&quot; description</li>
                <li>Exclude <code style={{ fontFamily: "var(--font-mono)", fontSize: 12 }}>tests/</code> directories from source scanner to eliminate intentional test-fixture false positives</li>
                <li>Tighten secret regex: now requires 16+ characters with at least one uppercase letter or digit to cut noise from short placeholder values</li>
              </ul>
            </div>

            {/* v0.1.9 */}
            <div style={{ border: "1px solid #21262d", borderRadius: 10, padding: "16px 20px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, fontWeight: 700, background: "#21262d", color: "#e6edf3", padding: "2px 10px", borderRadius: 20 }}>v0.1.9</span>
              </div>
              <ul style={{ margin: 0, paddingLeft: 20, color: "var(--text-muted)", fontSize: 14, lineHeight: 2 }}>
                <li>Fix <code style={{ fontFamily: "var(--font-mono)", fontSize: 12 }}>agentsentry scan local --pro</code> crash on LOW-risk identities (Rich markup typo)</li>
                <li>Block Xbox Live / WindowsLive / MicrosoftAccount consumer tokens from Windows Credential Manager scan (was 22 false positives)</li>
                <li>Cloud credential files now get realistic privilege scores: AWS credentials → HIGH, kubeconfig → CRITICAL</li>
                <li>Escape all credential names in Rich output to prevent markup injection</li>
              </ul>
            </div>

            {/* v0.1.8 */}
            <div style={{ border: "1px solid #21262d", borderRadius: 10, padding: "16px 20px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, fontWeight: 700, background: "#21262d", color: "#e6edf3", padding: "2px 10px", borderRadius: 20 }}>v0.1.8</span>
              </div>
              <ul style={{ margin: 0, paddingLeft: 20, color: "var(--text-muted)", fontSize: 14, lineHeight: 2 }}>
                <li>Windows Credential Manager scan (<code style={{ fontFamily: "var(--font-mono)", fontSize: 12 }}>cmdkey /list</code>) — no admin required</li>
                <li>macOS Keychain scan (<code style={{ fontFamily: "var(--font-mono)", fontSize: 12 }}>security dump-keychain</code>) — metadata only, never reads secret values</li>
                <li>Cross-platform Docker detection via subprocess (fixes Windows named-pipe blind spot)</li>
                <li>Expanded credential file coverage: Azure CLI, GitHub CLI, Terraform Cloud, Windows gcloud path</li>
              </ul>
            </div>

          </div>
        </Section>

        {/* 1. Installation */}
        <Section id="install" icon={Package} accent="var(--accent)" title="Installation">
          <p style={{ margin: 0 }}>
            AgentSentry requires Python 3.10+. The PyPI package is <code style={{ fontFamily: "var(--font-mono)", fontSize: 13 }}>nhi-audit</code>; the CLI command is <code style={{ fontFamily: "var(--font-mono)", fontSize: 13 }}>agentsentry</code>.
          </p>
          <OsTabs tabs={OS_TABS} renderTab={(os) => (
            <CodeBlock lines={[
              "# Base install (local scan, no cloud credentials needed)",
              `${prompt(os)} pip install nhi-audit`,
              "",
              "# With all provider extras",
              os === "Linux / macOS"
                ? `$ pip install 'nhi-audit[aws,azure,gcp,github,k8s]'`
                : os === "Windows"
                ? `> pip install nhi-audit[aws,azure,gcp,github,k8s]`
                : `PS> pip install 'nhi-audit[aws,azure,gcp,github,k8s]'`,
              "",
              "# Verify",
              `${prompt(os)} agentsentry --version`,
            ]} />
          )} />
        </Section>

        {/* 2. Quick start */}
        <Section id="quick-start" icon={Terminal} accent="var(--accent)" title="Quick start">
          <p style={{ margin: 0 }}>
            The fastest way to see AgentSentry in action — scan your local environment. No credentials needed.
          </p>
          <OsTabs tabs={OS_TABS} renderTab={(os) => (
            <CodeBlock lines={[
              "# Scan local environment (no credentials needed)",
              `${prompt(os)} agentsentry scan local`,
              "",
              "# Full analyst report with attack narratives per identity",
              `${prompt(os)} agentsentry scan local --pro`,
              "",
              "# Scan everything configured on this machine",
              `${prompt(os)} agentsentry scan all`,
              "",
              "# Open the interactive attack graph in your browser",
              `${prompt(os)} agentsentry visualize`,
            ]} />
          )} />
        </Section>

        {/* 3. Providers */}
        <Section id="providers" icon={Cloud} accent="#0099ff" title="Provider setup &amp; scan commands">

          {/* Local / Credential Manager */}
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
              <div className="docs-provider-dot" style={{ background: "#3fb950" }} />
              <span style={{ color: "var(--text)", fontWeight: 600, fontSize: 14 }}>Local Machine (free, no credentials)</span>
            </div>
            <p style={{ margin: "0 0 12px", color: "var(--text-muted)", fontSize: 13, lineHeight: 1.7 }}>
              Scans environment variables, .env files, SSH keys, cloud credential files, source code, and OS credential stores.
              On Windows it reads <strong>Windows Credential Manager</strong> (<code style={{ fontFamily: "var(--font-mono)", fontSize: 12 }}>cmdkey /list</code>) — consumer tokens (Xbox Live, MicrosoftAccount) are automatically filtered.
              On macOS it reads <strong>Keychain</strong> metadata (<code style={{ fontFamily: "var(--font-mono)", fontSize: 12 }}>security dump-keychain</code>) — secret values are never read.
            </p>
            <OsTabs tabs={OS_TABS} renderTab={(os) => (
              <CodeBlock lines={[
                "# Quick scan",
                `${prompt(os)} agentsentry scan local`,
                "",
                "# Full analyst report (--pro): attack narratives + MITRE mappings + remediation steps",
                `${prompt(os)} agentsentry scan local --pro`,
              ]} />
            )} />
          </div>

          {/* AWS */}
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
              <div className="docs-provider-dot" style={{ background: "#ff9900" }} />
              <span style={{ color: "var(--text)", fontWeight: 600, fontSize: 14 }}>Amazon Web Services (AWS)</span>
            </div>
            <OsTabs tabs={OS_TABS} renderTab={(os) => (
              <CodeBlock lines={[
                "# Install AWS extra",
                os === "Windows" ? `> pip install nhi-audit[aws]` : `${prompt(os)} pip install 'nhi-audit[aws]'`,
                "",
                "# Configure credentials",
                os === "Linux / macOS" ? "$ export AWS_PROFILE=my-profile" : os === "Windows" ? "> set AWS_PROFILE=my-profile" : "PS> $env:AWS_PROFILE = 'my-profile'",
                "",
                "# Scan",
                `${prompt(os)} agentsentry scan aws`,
              ]} />
            )} />
          </div>

          {/* Azure */}
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
              <div className="docs-provider-dot" style={{ background: "#0078d4" }} />
              <span style={{ color: "var(--text)", fontWeight: 600, fontSize: 14 }}>Microsoft Azure</span>
            </div>
            <OsTabs tabs={OS_TABS} renderTab={(os) => (
              <CodeBlock lines={[
                os === "Windows" ? `> pip install nhi-audit[azure]` : `${prompt(os)} pip install 'nhi-audit[azure]'`,
                `${prompt(os)} az login`,
                `${prompt(os)} agentsentry scan azure`,
              ]} />
            )} />
          </div>

          {/* GCP */}
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
              <div className="docs-provider-dot" style={{ background: "#4285f4" }} />
              <span style={{ color: "var(--text)", fontWeight: 600, fontSize: 14 }}>Google Cloud (GCP)</span>
            </div>
            <OsTabs tabs={OS_TABS} renderTab={(os) => (
              <CodeBlock lines={[
                os === "Windows" ? `> pip install nhi-audit[gcp]` : `${prompt(os)} pip install 'nhi-audit[gcp]'`,
                `${prompt(os)} gcloud auth application-default login`,
                `${prompt(os)} agentsentry scan gcp`,
              ]} />
            )} />
          </div>

          {/* GitHub */}
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
              <div className="docs-provider-dot" style={{ background: "#94a3b8" }} />
              <span style={{ color: "var(--text)", fontWeight: 600, fontSize: 14 }}>GitHub</span>
            </div>
            <OsTabs tabs={OS_TABS} renderTab={(os) => (
              <CodeBlock lines={[
                `${prompt(os)} pip install nhi-audit`,
                os === "Linux / macOS" ? "$ export GITHUB_TOKEN=<your-pat>" : os === "Windows" ? "> set GITHUB_TOKEN=<your-pat>" : "PS> $env:GITHUB_TOKEN = '<your-pat>'",
                `${prompt(os)} agentsentry scan github`,
              ]} />
            )} />
          </div>

          {/* Kubernetes */}
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
              <div className="docs-provider-dot" style={{ background: "#326ce5" }} />
              <span style={{ color: "var(--text)", fontWeight: 600, fontSize: 14 }}>Kubernetes</span>
            </div>
            <OsTabs tabs={OS_TABS} renderTab={(os) => (
              <CodeBlock lines={[
                os === "Windows" ? `> pip install nhi-audit[k8s]` : `${prompt(os)} pip install 'nhi-audit[k8s]'`,
                `${prompt(os)} kubectl config use-context <your-cluster>`,
                `${prompt(os)} agentsentry scan k8s`,
              ]} />
            )} />
          </div>
        </Section>

        {/* 4. Output formats */}
        <Section id="output" icon={Layers} accent="#a855f7" title="Output formats">
          <p style={{ margin: 0 }}>
            Export findings in multiple formats for integration with your existing security toolchain.
          </p>
          <CodeBlock lines={[
            "# Default: rich terminal table",
            "$ agentsentry scan all",
            "",
            "# --pro: full analyst report per identity (attack narrative + MITRE + remediation)",
            "$ agentsentry scan local --pro",
            "",
            "# JSON (for SIEM / automation)",
            "$ agentsentry scan all --output json > findings.json",
            "",
            "# CSV (for spreadsheets)",
            "$ agentsentry scan all --output csv > findings.csv",
            "",
            "# Open attack graph in browser",
            "$ agentsentry visualize",
            "",
            "# Save graph as HTML file",
            "$ agentsentry visualize --save report.html",
          ]} />

          {/* --pro callout */}
          <div style={{ border: "1px solid #a855f733", borderRadius: 10, background: "#a855f708", padding: "16px 20px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
              <Key style={{ width: 15, height: 15, color: "#a855f7" }} />
              <span style={{ color: "#a855f7", fontWeight: 600, fontSize: 14 }}>--pro analyst report</span>
            </div>
            <p style={{ margin: 0, color: "var(--text-muted)", fontSize: 13, lineHeight: 1.7 }}>
              Pass <code style={{ fontFamily: "var(--font-mono)", fontSize: 12 }}>--pro</code> to get a full analyst-grade breakdown for each identity: a plain-English &quot;WHAT IS THIS?&quot; explanation, step-by-step attacker exploit narrative with real commands, MITRE ATT&amp;CK technique mappings, and numbered remediation steps. Works with <code style={{ fontFamily: "var(--font-mono)", fontSize: 12 }}>agentsentry scan local</code> today.
            </p>
          </div>
        </Section>

        {/* 5. Advanced */}
        <Section id="advanced" icon={Cpu} accent="#f59e0b" title="Advanced usage">
          <p style={{ margin: 0 }}>
            Filter by risk threshold, target a specific AWS profile, or run in CI/CD pipelines.
          </p>
          <OsTabs tabs={OS_TABS} renderTab={(os) => (
            <CodeBlock lines={[
              "# Show only CRITICAL and HIGH findings",
              `${prompt(os)} agentsentry scan all --min-risk HIGH`,
              "",
              "# Use a specific AWS profile",
              os === "Linux / macOS" ? "$ export AWS_PROFILE=prod" : os === "Windows" ? "> set AWS_PROFILE=prod" : "PS> $env:AWS_PROFILE = 'prod'",
              `${prompt(os)} agentsentry scan aws`,
              "",
              "# Non-zero exit code on CRITICAL findings (great for CI)",
              `${prompt(os)} agentsentry scan all --fail-on CRITICAL`,
              "",
              "# Scan a specific LangChain / CrewAI project directory",
              `${prompt(os)} agentsentry scan agents ./my-agent-project`,
            ]} />
          )} />

          {/* CI/CD snippet */}
          <div>
            <p style={{ fontSize: 13, marginBottom: 12 }}>GitHub Actions example:</p>
            <CodeBlock lang="yaml" lines={[
              "- name: AgentSentry NHI Scan",
              "  run: |",
              "    pip install nhi-audit[aws]",
              "    agentsentry scan aws --output json --fail-on CRITICAL",
              "  env:",
              "    AWS_ACCESS_KEY_ID: ${{ secrets.AWS_ACCESS_KEY_ID }}",
              "    AWS_SECRET_ACCESS_KEY: ${{ secrets.AWS_SECRET_ACCESS_KEY }}",
            ]} />
          </div>
        </Section>

        {/* Footer nav */}
        <div className="docs-footer-nav">
          <a href="https://github.com/Abhiram-ops/agent-sentry" target="_blank" rel="noopener noreferrer">
            View on GitHub
          </a>
          <a href="/contact">
            Contact us
          </a>
        </div>
      </main>
      <Footer />
    </div>
  );
}
