"use client";

import { motion } from "framer-motion";
import Link from "next/link";

const FREE = [
  "AWS, Azure, GCP, GitHub & K8s scanners",
  "LangChain / CrewAI / AutoGen agent scanner",
  "P×R×E×A risk scoring engine",
  "MITRE ATT&CK technique mapping",
  "Blast radius analysis",
  "CLI — runs locally, no data leaves you",
  "Open source — AGPL-3.0 license",
];

const PRO = [
  "Everything in Free",
  "--visualize: interactive HTML attack graph",
  "--enrich: CISA KEV threat intel enrichment",
  "--json: JSON output for pipelines & CI",
  "Interactive multi-cloud scan mode",
  "One-time purchase — license key, yours forever",
  "Priority email support",
];

const AUTOMATION = [
  "Local OS-scheduled recurring scans (cron / Task Scheduler) — your machine, your cadence",
  "Diff-based alerts for newly-detected identities, with least-privilege remediation suggestions",
  "Zombie-credential alerts (180-day inactivity threshold)",
  "Credential rotation-due reminders (90-day cadence) — for cloud creds and your AgentSentry API key",
  "Reports saved to a directory you choose — no credential upload, ever",
];

function CheckIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

export default function Pricing() {
  return (
    <section id="pricing" className="section">
      <div className="container">
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }} transition={{ duration: 0.5 }}
          className="section-header centered">
          <div className="section-label" style={{ justifyContent: "center" }}>Pricing</div>
          <h2>Free forever. Pay once for Pro.</h2>
          <p>
            The scanner is open source and always will be. Pro unlocks reports, enrichment, and
            JSON output — one payment, lifetime license.
          </p>
        </motion.div>

        <div className="pricing-grid">
          <motion.div initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }} transition={{ duration: 0.5 }}
            className="pricing-card">
            <div className="pricing-tier">Community</div>
            <div className="pricing-price">
              <span className="price-sym">$</span>
              <span className="price-num">0</span>
            </div>
            <div className="pricing-billing">Open source · AGPL-3.0 · free forever</div>
            <div className="pricing-desc">Everything you need to run a full audit, locally and for free.</div>
            <Link href="/signup" className="btn btn-outline pricing-cta">Get started free</Link>
            <div className="pricing-features-label">Includes</div>
            <ul className="pricing-features">
              {FREE.map((f) => (
                <li key={f} className="pricing-feature">
                  <span className="check-wrap"><CheckIcon /></span>
                  {f}
                </li>
              ))}
            </ul>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }} transition={{ duration: 0.5, delay: 0.08 }}
            className="pricing-card featured">
            <div className="pricing-tier">Pro</div>
            <div className="pricing-price">
              <span className="price-sym">$</span>
              <span className="price-num">49</span>
            </div>
            <div className="pricing-billing">One-time · license key · no subscription</div>
            <div className="pricing-desc">For teams who want enrichment, visualization, and CI-ready output.</div>
            <Link href="/signup" className="btn btn-primary pricing-cta">Sign up to upgrade</Link>
            <div className="pricing-features-label">Includes</div>
            <ul className="pricing-features">
              {PRO.map((f) => (
                <li key={f} className="pricing-feature">
                  <span className="check-wrap"><CheckIcon /></span>
                  {f}
                </li>
              ))}
            </ul>
          </motion.div>
        </div>

        <motion.div initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }} transition={{ duration: 0.5, delay: 0.16 }}
          className="pricing-addon">
          <div>
            <div className="pricing-tier">Automation add-on · requires Pro</div>
            <div className="pricing-addon-price">
              <span className="price-sym">$</span>
              <span className="price-num">9</span>
              <span className="pricing-billing" style={{ marginBottom: 0 }}>/month</span>
            </div>
            <div className="pricing-desc" style={{ minHeight: "auto", marginBottom: 0 }}>
              Hands-off, scheduled audits of your environment — set it up once from the CLI.
            </div>
          </div>
          <ul className="pricing-addon-features">
            {AUTOMATION.map((f) => (
              <li key={f} className="pricing-feature">
                <span className="check-wrap"><CheckIcon /></span>
                {f}
              </li>
            ))}
          </ul>
          <Link href="/dashboard" className="btn btn-outline pricing-addon-cta">Manage in dashboard</Link>
        </motion.div>

        <motion.p initial={{ opacity: 0 }} whileInView={{ opacity: 1 }}
          viewport={{ once: true }} transition={{ duration: 0.5, delay: 0.3 }}
          style={{ textAlign: "center", marginTop: 40, fontSize: 13, color: "var(--text-faint)", fontFamily: "var(--font-mono)" }}>
          API key &amp; activation code delivered instantly by email · CLI works offline
        </motion.p>
      </div>
    </section>
  );
}
