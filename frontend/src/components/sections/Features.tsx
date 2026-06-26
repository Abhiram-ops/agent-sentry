"use client";

import { motion } from "framer-motion";
import { Shield, Bot, Zap, Network, AlertTriangle, FileSearch } from "lucide-react";

const FEATURES = [
  { icon: Network,       title: "Multi-Cloud NHI Discovery",
    desc: "Finds every IAM role, API key, service account, Managed Identity, and OAuth token, across AWS, Azure, GCP, GitHub, Kubernetes, and your local machine. One command. Every environment." },
  { icon: Bot,           title: "AI Agent Scanner",
    desc: "Statically analyzes LangChain, CrewAI, and AutoGen codebases. Extracts tool permissions. Computes the AI-Amplification Factor." },
  { icon: AlertTriangle, title: "CISA KEV Enrichment",
    desc: "Correlates every finding against 1,610+ actively exploited CVEs. Flags ransomware-linked vulnerabilities in real time." },
  { icon: Shield,        title: "Attack Graph",
    desc: "Cross-provider attack graph. Computes blast radius: if this identity is compromised, what does the attacker reach, regardless of which cloud it lives in?" },
  { icon: FileSearch,    title: "MITRE ATT&CK Mapping",
    desc: "Every finding maps to ATT&CK techniques. T1078.004, T1528, T1552, T1611, the language your SOC already speaks." },
  { icon: Zap,           title: "Risk Scoring: P×R×E×A",
    desc: "Privilege × Reachability × Exposure × AI-Amplification. Consistent across all providers, the same score model whether the identity lives in AWS, K8s, or a local .env file." },
];

export default function Features() {
  return (
    <section id="features" className="section">
      <div className="container">
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }} transition={{ duration: 0.5 }}
          className="section-header">
          <div className="section-label">What it does</div>
          <h2>Every attack surface. One scanner.</h2>
          <p>The only open-source tool that audits machine identities across every cloud and environment, with the same risk model, in the same scan.</p>
        </motion.div>

        <div className="features-grid">
          {FEATURES.map((f, i) => {
            const Icon = f.icon;
            return (
              <motion.div key={f.title} initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-50px" }} transition={{ duration: 0.5, delay: i * 0.07 }}
                className="feature-item">
                <div className="feature-icon">
                  <Icon style={{ width: 20, height: 20 }} />
                </div>
                <h3>{f.title}</h3>
                <p>{f.desc}</p>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
