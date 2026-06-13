"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { useToast } from "@/components/Toast";

const FU = { hidden: { opacity: 0, y: 22 }, visible: { opacity: 1, y: 0 } };
const TR = { duration: 0.55, ease: [0.4, 0, 0.2, 1] as [number, number, number, number] };
const VP = { once: true, margin: "0px 0px -6% 0px" };

const CheckIcon = () => (
  <svg viewBox="0 0 24 24"><path d="m5 13 4 4L19 7"/></svg>
);

export default function Pricing() {
  const { show } = useToast();

  const [freeEmail, setFreeEmail] = useState("");
  const [freeStatus, setFreeStatus] = useState<"idle"|"loading"|"ok"|"err">("idle");
  const [freeErr, setFreeErr] = useState("");

  async function handleClaim(e: React.FormEvent) {
    e.preventDefault();
    setFreeStatus("loading");
    try {
      const r = await fetch("/api/claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: freeEmail, plan: "community" }),
      });
      const d = await r.json();
      if (d.ok || d.success) {
        setFreeStatus("ok");
        setFreeEmail("");
        show("Key sent to your inbox");
      } else {
        setFreeErr(d.error || "Something went wrong.");
        setFreeStatus("err");
      }
    } catch {
      setFreeErr("Connection failed. Try again.");
      setFreeStatus("err");
    }
  }

  const [proEmail, setProEmail] = useState("");
  const [proSent, setProSent] = useState(false);

  async function handleWaitlist(e: React.FormEvent) {
    e.preventDefault();
    setProSent(true);
    setProEmail("");
    show("You're on the waitlist — we'll notify you when Pro ships");
  }

  const FREE_FEATS = [
    "All 6 cloud providers plus local scan",
    "P×R×E×A risk scoring engine",
    "MITRE ATT&CK technique mapping",
    "LangChain, CrewAI, AutoGen scanner",
    "Blast radius analysis",
    "CLI: runs locally, data stays with you",
  ];
  const PRO_FEATS = [
    { text: "Everything in Community" },
    { mono: "--pro", text: ": attack narratives per finding" },
    { mono: "--pro", text: ": exact remediation commands" },
    { mono: "--visualize", text: ": interactive HTML attack graph" },
    { mono: "--enrich", text: ": CISA KEV threat intel" },
    { mono: "--json", text: ": machine-readable output for CI" },
  ];

  return (
    <section className="sec" id="pricing">
      <hr className="hairline"/>
      <div className="w">
        <motion.div
          className="sec-head ctr"
          variants={FU} initial="hidden" whileInView="visible"
          viewport={VP} transition={TR}
        >
          <div className="kicker">Pricing</div>
          <h2 className="sec-h">Free forever. Pay once for Pro.</h2>
          <p className="sec-sub" style={{ margin: "0 auto" }}>
            The scanner is open source and always will be. Pro unlocks reports, enrichment, and
            exact remediation commands.
          </p>
        </motion.div>

        <div className="pricing-grid">
          <motion.div
            className="price-card"
            variants={FU} initial="hidden" whileInView="visible"
            viewport={VP} transition={TR}
          >
            <span className="price-tier">Community</span>
            <h3 className="price-h">Free</h3>
            <div className="price-amt"><span className="amt">$0</span></div>
            <p className="price-desc">Open source. MIT. No account needed.</p>

            {freeStatus === "ok" ? (
              <div className="claim-ok">✓ Check your inbox — installer + key sent</div>
            ) : (
              <form className="price-form" onSubmit={handleClaim} noValidate>
                <label className="price-form-label" htmlFor="free-email">
                  Get your activation key by email
                </label>
                <div className="price-form-row">
                  <input
                    className="price-input" id="free-email" type="email"
                    placeholder="you@company.com" value={freeEmail}
                    onChange={e => setFreeEmail(e.target.value)}
                    autoComplete="email" required
                  />
                  <button className="btn-green" type="submit" disabled={freeStatus === "loading"}>
                    {freeStatus === "loading" ? "Sending…" : "Claim key"}
                  </button>
                </div>
                {freeStatus === "err" && (
                  <p style={{ color: "var(--cr)", fontSize: 12, marginTop: 6 }}>{freeErr}</p>
                )}
                <span className="price-form-hint">No credit card · No account · Data stays local</span>
              </form>
            )}

            <ul className="price-feats">
              {FREE_FEATS.map(f => (
                <li key={f}><CheckIcon/>{f}</li>
              ))}
            </ul>
            <div className="price-foot">
              Available now &nbsp;<span className="ac">pip install agentsentry</span>
            </div>
          </motion.div>

          <motion.div
            className="price-card pro"
            variants={FU} initial="hidden" whileInView="visible"
            viewport={VP} transition={{ ...TR, delay: 0.08 }}
          >
            <div className="price-topline"/>
            <span className="price-tier">Pro</span>
            <h3 className="price-h">Pro</h3>
            <div className="price-amt">
              <span className="amt">$49</span>
              <span className="per">one-time</span>
            </div>
            <p className="price-desc">License key. No subscription. Yours forever.</p>
            <p className="price-refund">100% refund if not satisfied. Just email me.</p>

            {proSent ? (
              <div className="waitlist-msg show">Join 140+ on the waitlist ✓</div>
            ) : (
              <form className="price-form" onSubmit={handleWaitlist} noValidate>
                <label className="price-form-label" htmlFor="pro-email">
                  Notify me when Pro ships
                </label>
                <div className="price-form-row">
                  <input
                    className="price-input" id="pro-email" type="email"
                    placeholder="you@company.com" value={proEmail}
                    onChange={e => setProEmail(e.target.value)}
                    autoComplete="email"
                  />
                  <button className="btn-green" type="submit">Notify me</button>
                </div>
                <span className="price-form-hint">Coming soon · $49 one-time · lifetime license</span>
              </form>
            )}

            <ul className="price-feats">
              {PRO_FEATS.map((f, i) => (
                <li key={i}>
                  <CheckIcon/>
                  {f.mono
                    ? <><span className="m mono">{f.mono}</span>{f.text}</>
                    : f.text
                  }
                </li>
              ))}
            </ul>
            <div className="price-foot">
              After purchase: <span className="ac">agentsentry activate AS-XXXX-XXXX</span><br/>
              Key delivered by email instantly. Works offline. No account required.
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
