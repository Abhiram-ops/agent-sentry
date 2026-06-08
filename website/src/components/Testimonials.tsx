"use client";

import { motion } from "framer-motion";

const FU = { hidden: { opacity: 0, y: 22 }, visible: { opacity: 1, y: 0 } };
const TR = { duration: 0.55, ease: [0.4, 0, 0.2, 1] as [number, number, number, number] };
const VP = { once: true, margin: "0px 0px -6% 0px" };

const TESTIMONIALS = [
  {
    quote: "Ran it on our staging AWS account. Found 3 IAM roles with AdministratorAccess we didn't know existed. Took 4 minutes. One of those roles was attached to a Lambda that processed user data.",
    who: "ML Engineer",
    role: "Series A AI startup",
  },
  {
    quote: "We run it in CI on every PR now. Caught an overprivileged deploy key before it hit prod. Twice in the same month. The --json flag made integration easy.",
    who: "DevSecOps Lead",
    role: "Fintech team, 40 engineers",
  },
  {
    quote: "Didn't expect the local scan to find anything. It found 4 .env files with production secrets in my home directory. Two of them were from projects I'd left six months ago.",
    who: "Backend Engineer",
    role: "Security tools startup",
  },
];

export default function Testimonials() {
  return (
    <section className="sec" id="testimonials" style={{ paddingTop: 0 }}>
      <div className="w">
        <motion.div
          className="sec-head ctr"
          variants={FU} initial="hidden" whileInView="visible"
          viewport={VP} transition={TR}
        >
          <div className="kicker">From the field</div>
          <h2 className="sec-h">What people found.</h2>
        </motion.div>
        <div className="testi-grid">
          {TESTIMONIALS.map((t, i) => (
            <motion.div
              key={i}
              className="testi-card"
              variants={FU} initial="hidden" whileInView="visible"
              viewport={VP} transition={{ ...TR, delay: i * 0.08 }}
            >
              <p className="testi-q">{t.quote}</p>
              <div className="testi-meta">
                <div className="testi-who">
                  {t.who}
                  <span className="role">{t.role}</span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
