"use client";

import { motion } from "framer-motion";

const FU = { hidden: { opacity: 0, y: 22 }, visible: { opacity: 1, y: 0 } };
const TR = { duration: 0.55, ease: [0.4, 0, 0.2, 1] };
const VP = { once: true, margin: "0px 0px -6% 0px" };

export default function Problem() {
  return (
    <section className="problem-sec" id="problem">
      <div className="w">
        <div className="problem-grid">
          <motion.div
            variants={FU} initial="hidden" whileInView="visible"
            viewport={VP} transition={TR}
          >
            <div className="kicker">The problem</div>
            <h2 className="sec-h">The breach nobody is watching for.</h2>
            <p className="sec-sub">
              Machine identities accumulate quietly. IAM roles are created for one project and
              never deleted. API keys are provisioned with admin scope because someone needed to
              move fast. AI agents are given irreversible tool access with no oversight. Most are
              never reviewed.
            </p>
            <ul className="problem-list">
              <li>No rotation policy. No expiry. No MFA requirement.</li>
              <li>AI agents with write access to production databases and external APIs.</li>
              <li>Every role, key, and agent is a lateral movement opportunity.</li>
              <li>Cloud providers surface these identities in six different consoles that don't talk to each other.</li>
            </ul>
          </motion.div>
          <motion.div
            style={{ textAlign: "right" }}
            variants={FU} initial="hidden" whileInView="visible"
            viewport={VP} transition={{ ...TR, delay: 0.1 }}
          >
            <div className="problem-stat-big">76%</div>
            <p className="problem-stat-sub">of breaches involve a non-human identity</p>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
