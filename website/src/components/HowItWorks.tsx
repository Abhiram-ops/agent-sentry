"use client";

import { motion } from "framer-motion";

const FU = { hidden: { opacity: 0, y: 22 }, visible: { opacity: 1, y: 0 } };
const TR = { duration: 0.55, ease: [0.4, 0, 0.2, 1] };
const VP = { once: true, margin: "0px 0px -6% 0px" };

const STEPS = [
  {
    num: "01",
    title: "Install",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="4" width="20" height="14" rx="2"/>
        <path d="m6 8 3 3-3 3M12 14h5"/>
      </svg>
    ),
    body: "One pip install. Point it at your cloud account. AgentSentry enumerates every machine identity across every configured provider in minutes, including ones you forgot existed.",
    code: [
      { prefix: "$", val: "pip install agentsentry", cls: "" },
      { prefix: "$", val: "agentsentry scan --all",  cls: "" },
      { prefix: "",  val: "→ Scanning 6 providers. Found 47 identities in 2m 14s.", cls: "out-ac" },
    ],
  },
  {
    num: "02",
    title: "Score",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
      </svg>
    ),
    body: "Every identity gets a P×R×E×A risk score: Privilege × Reachability × Exposure × AI-Amplification Factor. Critical identities surface first. CISA KEV enrichment flags active CVEs in real time.",
    code: [
      { prefix: "", val: "CRITICAL  aws/iam-role       AdministratorAccess policy      216", cls: "out-cr" },
      { prefix: "", val: "CRITICAL  local/.env         OPENAI_API_KEY in plaintext     198", cls: "out-cr" },
      { prefix: "", val: "HIGH      k8s/sa/ci-runner   cluster-admin binding            162", cls: "out-hi" },
    ],
  },
  {
    num: "03",
    title: "Fix",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="9"/>
        <path d="m8.5 12 2.2 2.2 4.8-4.8"/>
      </svg>
    ),
    body: (
      <>
        The <span className="mono" style={{ fontSize: 13, color: "var(--ac)" }}>--pro</span> flag
        generates the exact CLI command that fixes each specific finding. Not generic advice. The
        specific call for the specific problem.
      </>
    ),
    code: [
      { prefix: "$", val: "agentsentry fix --pro --id aws/iam-role",  cls: "" },
      { prefix: "", val: "→ aws iam detach-role-policy --role-name ml-pipeline \\", cls: "out-ac" },
      { prefix: "", val: "   --policy-arn arn:aws:iam::aws:policy/AdministratorAccess", cls: "out-ac" },
    ],
  },
];

export default function HowItWorks() {
  return (
    <section className="sec" id="how-it-works">
      <hr className="hairline"/>
      <div className="w">
        <motion.div
          className="sec-head"
          variants={FU} initial="hidden" whileInView="visible"
          viewport={VP} transition={TR}
        >
          <div className="kicker">How it works</div>
          <h2 className="sec-h">From zero to attack graph in under three minutes.</h2>
          <p className="sec-sub">
            No agents to deploy. No SaaS data upload. Runs entirely local. Your cloud credentials
            never leave your machine.
          </p>
        </motion.div>

        <div className="steps-wrap">
          <div className="steps-vline" aria-hidden="true"/>
          <div className="steps-list">
            {STEPS.map((s, i) => (
              <motion.div
                key={s.num}
                className="step-card"
                variants={FU} initial="hidden" whileInView="visible"
                viewport={VP} transition={{ ...TR, delay: i * 0.08 }}
              >
                <div className="step-ico-col">
                  <div className="step-ico">{s.icon}</div>
                </div>
                <div className="step-body">
                  <h3>
                    <span className="sn mono">{s.num}</span>
                    <span className="sd">&nbsp;—&nbsp;</span>
                    {s.title}
                  </h3>
                  <p>{s.body}</p>
                  <div className="step-code">
                    {s.code.map((ln, j) => (
                      <div key={j} className={`ln${ln.cls ? " " + ln.cls : ""}`}>
                        {ln.prefix && <span className="pr">{ln.prefix}&nbsp;</span>}
                        <span className="val">{ln.val}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
