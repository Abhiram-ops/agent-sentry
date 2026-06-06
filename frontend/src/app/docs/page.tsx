"use client";

import { useState } from "react";
import type { ReactNode, ElementType } from "react";
import { NavbarWeb3 as Navbar } from "@/components/layout/NavbarWeb3";
import Footer from "@/components/layout/Footer";
import { motion } from "framer-motion";
import { Copy, Check, Terminal, Package, Cpu, Cloud, Layers } from "lucide-react";

/* ── Copy button ────────────────────────────────────────────────── */
function CopyBtn({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1800); }}
      style={{ background: "none", border: "none", cursor: "pointer", color: copied ? "#00ff88" : "#555", transition: "color 0.2s", padding: "4px", display: "flex", alignItems: "center" }}
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
    <div style={{ position: "relative", borderRadius: 10, border: "1px solid rgba(255,255,255,0.07)", background: "rgba(0,0,0,0.6)", overflow: "hidden" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 16px", borderBottom: "1px solid rgba(255,255,255,0.05)", background: "rgba(255,255,255,0.02)" }}>
        <span style={{ fontFamily: "monospace", fontSize: 11, color: "#555", letterSpacing: "0.05em" }}>{lang}</span>
        <CopyBtn text={text} />
      </div>
      <pre style={{ margin: 0, padding: "16px 20px", fontFamily: "monospace", fontSize: 13, lineHeight: 1.8, overflowX: "auto" }}>
        {lines.map((line, i) => {
          const isComment = line.trim().startsWith("#");
          const isPrompt  = line.startsWith("$") || line.startsWith(">") || line.startsWith("PS>");
          return (
            <div key={i} style={{ color: isComment ? "#555" : isPrompt ? "#a0a0a0" : "#e0e0e0" }}>
              {line || " "}
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
      <div style={{ display: "flex", gap: 4, marginBottom: 12 }}>
        {tabs.map(t => (
          <button key={t} onClick={() => setActive(t)}
            style={{
              padding: "6px 14px", borderRadius: 6, border: "1px solid",
              borderColor: active === t ? "rgba(0,255,136,0.4)" : "rgba(255,255,255,0.06)",
              background: active === t ? "rgba(0,255,136,0.08)" : "transparent",
              color: active === t ? "#00ff88" : "#666", fontSize: 12,
              fontFamily: "monospace", cursor: "pointer", transition: "all 0.15s ease",
            }}>
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
    <motion.section id={id} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }} transition={{ duration: 0.5 }}
      style={{ marginBottom: 64 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
        <div style={{ width: 36, height: 36, borderRadius: 10, background: `${accent}12`, border: `1px solid ${accent}28`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <Icon style={{ width: 16, height: 16, color: accent }} />
        </div>
        <h2 style={{ fontSize: "1.25rem", fontWeight: 700, color: "#fff", margin: 0 }}>{title}</h2>
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
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", background: "#030303", color: "#fff" }}>
      <Navbar />

      <div style={{ position: "fixed", top: "30%", left: "50%", transform: "translateX(-50%)", width: 600, height: 300, borderRadius: "50%", background: "radial-gradient(ellipse, rgba(0,255,136,0.03) 0%, transparent 70%)", filter: "blur(60px)", pointerEvents: "none", zIndex: 0 }} />

      <main style={{ flex: 1, maxWidth: 840, margin: "0 auto", width: "100%", padding: "120px 24px 80px", position: "relative", zIndex: 1 }}>

        {/* Hero */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
          style={{ marginBottom: 72 }}>
          <div style={{ fontFamily: "monospace", fontSize: 11, color: "#00ff88", marginBottom: 16, letterSpacing: "0.2em", textTransform: "uppercase" }}>Documentation</div>
          <h1 style={{ fontSize: "clamp(2rem, 4vw, 2.75rem)", fontWeight: 700, color: "#fff", lineHeight: 1.1, letterSpacing: "-0.02em", marginBottom: 16 }}>
            AgentSentry CLI
          </h1>
          <p style={{ color: "#a0a0a0", fontSize: "1.05rem", lineHeight: 1.75, maxWidth: 560, margin: "0 0 24px" }}>
            Open-source NHI scanner — runs locally, zero data upload, one command to audit your entire cloud.
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {[["#install","Installation"],["#quick-start","Quick start"],["#providers","Providers"],["#output","Output formats"],["#advanced","Advanced"]].map(([href, label]) => (
              <a key={href} href={href} style={{ padding: "5px 12px", borderRadius: 6, border: "1px solid rgba(255,255,255,0.07)", color: "#888", fontSize: 12, textDecoration: "none", fontFamily: "monospace" }}>
                {label}
              </a>
            ))}
          </div>
        </motion.div>

        {/* 1. Installation */}
        <Section id="install" icon={Package} accent="#00ff88" title="Installation">
          <p style={{ color: "#a0a0a0", margin: 0, lineHeight: 1.75 }}>
            AgentSentry requires Python 3.9+. Install the base package, then add provider extras for each cloud you want to scan.
          </p>
          <OsTabs tabs={OS_TABS} renderTab={(os) => (
            <CodeBlock lines={[
              "# Base install",
              `${prompt(os)} pip install agentsentry`,
              "",
              "# With all provider extras",
              os === "Linux / macOS"
                ? `$ pip install 'agentsentry[aws,azure,gcp,github,k8s]'`
                : os === "Windows"
                ? `> pip install agentsentry[aws,azure,gcp,github,k8s]`
                : `PS> pip install 'agentsentry[aws,azure,gcp,github,k8s]'`,
              "",
              "# Verify",
              `${prompt(os)} agentsentry --version`,
            ]} />
          )} />
        </Section>

        {/* 2. Quick start */}
        <Section id="quick-start" icon={Terminal} accent="#00ff88" title="Quick start">
          <p style={{ color: "#a0a0a0", margin: 0, lineHeight: 1.75 }}>
            The fastest way to see AgentSentry in action — scan your local environment. No credentials needed.
          </p>
          <OsTabs tabs={OS_TABS} renderTab={(os) => (
            <CodeBlock lines={[
              "# Scan local environment (no credentials needed)",
              `${prompt(os)} agentsentry scan local`,
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

          {/* AWS */}
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
              <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#ff9900" }} />
              <span style={{ color: "#ccc", fontWeight: 600, fontSize: 14 }}>Amazon Web Services (AWS)</span>
            </div>
            <OsTabs tabs={OS_TABS} renderTab={(os) => (
              <CodeBlock lines={[
                "# Install AWS extra",
                os === "Windows" ? `> pip install agentsentry[aws]` : `${prompt(os)} pip install 'agentsentry[aws]'`,
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
              <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#0078d4" }} />
              <span style={{ color: "#ccc", fontWeight: 600, fontSize: 14 }}>Microsoft Azure</span>
            </div>
            <OsTabs tabs={OS_TABS} renderTab={(os) => (
              <CodeBlock lines={[
                os === "Windows" ? `> pip install agentsentry[azure]` : `${prompt(os)} pip install 'agentsentry[azure]'`,
                `${prompt(os)} az login`,
                `${prompt(os)} agentsentry scan azure`,
              ]} />
            )} />
          </div>

          {/* GCP */}
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
              <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#4285f4" }} />
              <span style={{ color: "#ccc", fontWeight: 600, fontSize: 14 }}>Google Cloud (GCP)</span>
            </div>
            <OsTabs tabs={OS_TABS} renderTab={(os) => (
              <CodeBlock lines={[
                os === "Windows" ? `> pip install agentsentry[gcp]` : `${prompt(os)} pip install 'agentsentry[gcp]'`,
                `${prompt(os)} gcloud auth application-default login`,
                `${prompt(os)} agentsentry scan gcp`,
              ]} />
            )} />
          </div>

          {/* GitHub */}
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
              <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#f0f0f0" }} />
              <span style={{ color: "#ccc", fontWeight: 600, fontSize: 14 }}>GitHub</span>
            </div>
            <OsTabs tabs={OS_TABS} renderTab={(os) => (
              <CodeBlock lines={[
                `${prompt(os)} pip install agentsentry`,
                os === "Linux / macOS" ? "$ export GITHUB_TOKEN=<your-pat>" : os === "Windows" ? "> set GITHUB_TOKEN=<your-pat>" : "PS> $env:GITHUB_TOKEN = '<your-pat>'",
                `${prompt(os)} agentsentry scan github`,
              ]} />
            )} />
          </div>

          {/* Kubernetes */}
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
              <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#326ce5" }} />
              <span style={{ color: "#ccc", fontWeight: 600, fontSize: 14 }}>Kubernetes</span>
            </div>
            <OsTabs tabs={OS_TABS} renderTab={(os) => (
              <CodeBlock lines={[
                os === "Windows" ? `> pip install agentsentry[k8s]` : `${prompt(os)} pip install 'agentsentry[k8s]'`,
                `${prompt(os)} kubectl config use-context <your-cluster>`,
                `${prompt(os)} agentsentry scan k8s`,
              ]} />
            )} />
          </div>
        </Section>

        {/* 4. Output formats */}
        <Section id="output" icon={Layers} accent="#a855f7" title="Output formats">
          <p style={{ color: "#a0a0a0", margin: 0, lineHeight: 1.75 }}>
            Export findings in multiple formats for integration with your existing security toolchain.
          </p>
          <CodeBlock lines={[
            "# Default: rich terminal table",
            "$ agentsentry scan all",
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
        </Section>

        {/* 5. Advanced */}
        <Section id="advanced" icon={Cpu} accent="#f59e0b" title="Advanced usage">
          <p style={{ color: "#a0a0a0", margin: 0, lineHeight: 1.75 }}>
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
            <p style={{ color: "#888", fontSize: 13, marginBottom: 12 }}>GitHub Actions example:</p>
            <CodeBlock lang="yaml" lines={[
              "- name: AgentSentry NHI Scan",
              "  run: |",
              "    pip install agentsentry[aws]",
              "    agentsentry scan aws --output json --fail-on CRITICAL",
              "  env:",
              "    AWS_ACCESS_KEY_ID: ${{ secrets.AWS_ACCESS_KEY_ID }}",
              "    AWS_SECRET_ACCESS_KEY: ${{ secrets.AWS_SECRET_ACCESS_KEY }}",
            ]} />
          </div>
        </Section>

        {/* Footer nav */}
        <div style={{ paddingTop: 32, borderTop: "1px solid rgba(255,255,255,0.05)", display: "flex", gap: 16, flexWrap: "wrap" }}>
          <a href="https://github.com/Abhiram-ops/agent-sentry" target="_blank" rel="noopener noreferrer"
            style={{ color: "#888", fontSize: 13, textDecoration: "none" }}>
            View on GitHub
          </a>
          <a href="/contact" style={{ color: "#888", fontSize: 13, textDecoration: "none" }}>
            Contact us
          </a>
        </div>
      </main>
      <Footer />
    </div>
  );
}
