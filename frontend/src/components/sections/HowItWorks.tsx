"use client";

import { motion } from "framer-motion";

const STEPS = [
  { n: "01", title: "Discover",
    desc: "Point AgentSentry at your AWS account. It enumerates every IAM role, access key, service account, OAuth token, and AI agent in minutes — including ones you forgot existed." },
  { n: "02", title: "Score",
    desc: "Each identity gets a P×R×E×A risk score: Privilege × Reachability × Exposure × AI-Amplification. Critical identities surface immediately. CISA KEV enrichment flags active CVEs." },
  { n: "03", title: "Visualize",
    desc: "An interactive attack graph shows every identity and the access paths between them. See exactly what an attacker could reach if any given identity is compromised." },
];

export default function HowItWorks() {
  return (
    <section id="how-it-works" className="section">
      <div className="container">
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }} transition={{ duration: 0.5 }}
          className="section-header centered">
          <div className="section-label" style={{ justifyContent: "center" }}>How it works</div>
          <h2>From zero to attack graph in under three minutes.</h2>
          <p>No agents to deploy. No SaaS data upload. Runs entirely local — your cloud credentials never leave your machine.</p>
        </motion.div>

        <div className="steps-grid">
          {STEPS.map((step, i) => (
            <motion.div key={step.n} initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }} transition={{ duration: 0.5, delay: i * 0.12 }}
              className="step-card">
              <div className="step-num">{step.n}</div>
              <h3>{step.title}</h3>
              <p>{step.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
