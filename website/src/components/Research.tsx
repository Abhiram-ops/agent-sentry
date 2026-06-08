"use client";

import { motion } from "framer-motion";

const FU = { hidden: { opacity: 0, y: 22 }, visible: { opacity: 1, y: 0 } };
const TR = { duration: 0.55, ease: [0.4, 0, 0.2, 1] };

export default function Research() {
  return (
    <section className="sec" id="research" style={{ paddingTop: 0 }}>
      <hr className="hairline"/>
      <div className="w" style={{ paddingTop: "var(--u16)" }}>
        <motion.div
          className="sec-head ctr"
          variants={FU} initial="hidden" whileInView="visible"
          viewport={{ once: true, margin: "0px 0px -6% 0px" }}
          transition={TR}
        >
          <div className="kicker">Research</div>
          <h2 className="sec-h">The math behind the score.</h2>
          <p className="sec-sub" style={{ margin: "0 auto" }}>
            The P×R×E×A model is published as a research paper. Real scan results, novel metric, IEEE format.
          </p>
        </motion.div>

        <motion.div
          className="research-card"
          variants={FU} initial="hidden" whileInView="visible"
          viewport={{ once: true, margin: "0px 0px -6% 0px" }}
          transition={{ ...TR, delay: 0.08 }}
        >
          <div className="mono" style={{ fontSize: 10, letterSpacing: ".18em", textTransform: "uppercase", color: "var(--tf)" }}>
            IEEE Format &nbsp;·&nbsp; 2026 &nbsp;·&nbsp; Research Preview
          </div>
          <h3 style={{ fontSize: 18, lineHeight: 1.35, fontWeight: 600, letterSpacing: "-.01em" }}>
            AgentSentry: A Risk Quantification Framework for Non-Human Identities and AI Agents in Cloud Environments
          </h3>
          <div className="research-formula mono">
            Risk Score <span style={{ color: "var(--tf)" }}>=</span>{" "}
            <span className="ac">P × R × E × A</span>
          </div>
          <p style={{ fontSize: 13, color: "var(--tm)", lineHeight: 1.7 }}>
            Privilege × Reachability × Exposure × AI-Amplification Factor. First model to account for
            autonomous AI agent blast radius. arXiv submission coming soon.
          </p>
          <div style={{ display: "flex", gap: "var(--u2)", alignItems: "center", flexWrap: "wrap" }}>
            <a className="btn-ghost" href="https://github.com/Abhiram-ops/agent-sentry" target="_blank" rel="noopener">
              <svg viewBox="0 0 24 24" fill="currentColor" width="15" height="15">
                <path d="M12 .5C5.7.5.5 5.7.5 12c0 5.1 3.3 9.4 7.9 10.9.6.1.8-.2.8-.5v-2c-3.2.7-3.9-1.4-3.9-1.4-.5-1.3-1.3-1.7-1.3-1.7-1-.7.1-.7.1-.7 1.2.1 1.8 1.2 1.8 1.2 1 1.8 2.7 1.3 3.4 1 .1-.8.4-1.3.7-1.6-2.6-.3-5.3-1.3-5.3-5.7 0-1.3.5-2.3 1.2-3.1-.1-.3-.5-1.5.1-3.1 0 0 1-.3 3.3 1.2a11.5 11.5 0 0 1 6 0c2.3-1.5 3.3-1.2 3.3-1.2.6 1.6.2 2.8.1 3.1.8.8 1.2 1.8 1.2 3.1 0 4.4-2.7 5.4-5.3 5.7.4.4.8 1.1.8 2.2v3.3c0 .3.2.6.8.5A11.5 11.5 0 0 0 23.5 12C23.5 5.7 18.3.5 12 .5z"/>
              </svg>
              View on GitHub
            </a>
            <span className="mono" style={{ fontSize: 11, color: "var(--tf)" }}>arXiv submission coming soon</span>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
