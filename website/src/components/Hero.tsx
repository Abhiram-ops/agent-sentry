"use client";

import { useEffect, useRef } from "react";
import { motion } from "framer-motion";

const CMD = "agentsentry scan local --pro --enrich";
const FINDINGS = [
  { sev: "CRITICAL", path: "local/.env",       desc: "OPENAI_API_KEY in plaintext",  score: 198, cls: "t-cr" },
  { sev: "CRITICAL", path: "aws/iam-role",      desc: "AdministratorAccess policy",   score: 216, cls: "t-cr" },
  { sev: "HIGH",     path: "k8s/sa/ci-runner",  desc: "cluster-admin binding",         score: 162, cls: "t-hi" },
  { sev: "HIGH",     path: "github/deploy-key", desc: "write access, no expiry",       score:  80, cls: "t-hi" },
  { sev: "MEDIUM",   path: "aws/iam-key",       desc: "not rotated in 387 days",       score:  44, cls: "t-me" },
  { sev: "MEDIUM",   path: "local/.ssh/id_rsa", desc: "no passphrase set",             score:  28, cls: "t-me" },
];

function pad(s: string | number, n: number) {
  let str = String(s);
  while (str.length < n) str += " ";
  return str;
}
function lpad(s: string | number, n: number) {
  let str = String(s);
  while (str.length < n) str = " " + str;
  return str;
}

const FU = { hidden: { opacity: 0, y: 22 }, visible: { opacity: 1, y: 0 } };
const TR = { duration: 0.55, ease: [0.4, 0, 0.2, 1] as [number, number, number, number] };
const VP = { once: true, margin: "0px 0px -6% 0px" };

export default function Hero() {
  const termInputRef = useRef<HTMLSpanElement>(null);
  const termOutRef   = useRef<HTMLDivElement>(null);
  const termCurRef   = useRef<HTMLSpanElement>(null);
  const termRef      = useRef<HTMLDivElement>(null);
  const tids = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    let charIdx = 0, findIdx = 0;
    const inp = termInputRef.current;
    const out = termOutRef.current;
    const cur = termCurRef.current;
    const term = termRef.current;
    if (!inp || !out || !cur || !term) return;

    function after(fn: () => void, ms: number) {
      const t = setTimeout(fn, ms);
      tids.current.push(t);
    }
    const safeInp = inp!;
    const safeOut = out!;
    const safeCur = cur!;

    function addLine(html: string) {
      const d = document.createElement("div");
      d.innerHTML = html;
      safeOut.appendChild(d);
    }
    function reset() {
      tids.current.forEach(clearTimeout);
      tids.current = [];
      safeInp.textContent = "";
      safeOut.innerHTML = "";
      charIdx = 0; findIdx = 0;
      safeCur.style.display = "";
    }
    function typeCmd() {
      if (charIdx < CMD.length) {
        safeInp.textContent += CMD[charIdx++];
        after(typeCmd, 52 + Math.random() * 32);
      } else { after(startScan, 320); }
    }
    function startScan() {
      safeCur.style.display = "none";
      addLine("");
      addLine('  <span class="t-d">Scanning local environment…</span>');
      after(() => addLine('  <span class="t-d">Scanning ~/.aws/credentials …</span>'), 280);
      after(() => {
        addLine('  <span class="t-d">Enriching with CISA KEV …</span>');
        after(showFindings, 440);
      }, 540);
    }
    function showFindings() { addLine(""); after(nextFinding, 60); }
    function nextFinding() {
      if (findIdx >= FINDINGS.length) { after(showSummary, 260); return; }
      const f = FINDINGS[findIdx++];
      addLine(
        `  <span class="${f.cls}">${pad(f.sev, 9)}</span>` +
        `<span class="t-d">${pad(f.path, 26)}</span>` +
        `<span class="t-d">${pad(f.desc, 34)}</span>` +
        `<span class="t-sc">${lpad(f.score, 3)}</span>`
      );
      after(nextFinding, 155);
    }
    function showSummary() {
      addLine("");
      addLine('  <span class="t-sum">6 findings &nbsp; (2 critical &nbsp; 2 high &nbsp; 2 medium)</span>');
      addLine('  <span class="t-hint">run agentsentry fix --pro for step-by-step remediation</span>');
      after(() => { reset(); after(typeCmd, 700); }, 5400);
    }

    after(typeCmd, 1000);

    const pulseInterval = setInterval(() => {
      term.classList.remove("pulse");
      void term.offsetWidth;
      term.classList.add("pulse");
      setTimeout(() => term.classList.remove("pulse"), 700);
    }, 6000);

    return () => {
      tids.current.forEach(clearTimeout);
      clearInterval(pulseInterval);
    };
  }, []);

  return (
    <section className="hero" id="top">
      <div className="hero-orb hero-orb-1" aria-hidden="true"/>
      <div className="hero-orb hero-orb-2" aria-hidden="true"/>
      <div className="w">
        <motion.div className="hero-pills"
          variants={FU} initial="hidden" whileInView="visible"
          viewport={VP} transition={TR}>
          <span className="pill pill-live"><span className="dot" aria-hidden="true"/>Live</span>
          <span className="pill">v0.1.4</span>
          <span className="pill">MIT License</span>
        </motion.div>

        <motion.h1
          variants={FU} initial="hidden" whileInView="visible"
          viewport={VP} transition={{ ...TR, delay: 0.05 }}>
          Your cloud has hundreds of<br/>machine identities.<br/>
          <span className="gradient-text">Most are ungoverned.</span>
        </motion.h1>

        <motion.p className="hero-sub"
          variants={FU} initial="hidden" whileInView="visible"
          viewport={VP} transition={{ ...TR, delay: 0.1 }}>
          Every cloud accumulates <strong>IAM roles</strong>, <strong>API keys</strong>, and{" "}
          <strong>AI agents</strong> that outnumber human users 45&nbsp;to&nbsp;1. They rotate less
          often. They have no MFA. Most have never been audited.
        </motion.p>

        <motion.div className="hero-ctas"
          variants={FU} initial="hidden" whileInView="visible"
          viewport={VP} transition={{ ...TR, delay: 0.15 }}>
          <a className="btn-green" href="#pricing">Get free key &nbsp;→</a>
          <span className="code-pill">pip install agentsentry</span>
        </motion.div>

        <motion.div className="trusted"
          variants={FU} initial="hidden" whileInView="visible"
          viewport={VP} transition={{ ...TR, delay: 0.2 }}>
          <span>Scanned environments at</span>
          <span className="trusted-arrow">→</span>
          <div className="trusted-orgs">
            <span className="org-tag">Series A AI startups</span>
            <span className="org-tag">fintech teams</span>
            <span className="org-tag">security engineers</span>
            <span className="org-tag">enterprise DevSecOps</span>
          </div>
        </motion.div>

        <motion.div className="terminal" id="terminal" ref={termRef}
          variants={FU} initial="hidden" whileInView="visible"
          viewport={VP} transition={{ ...TR, delay: 0.25 }}>
          <div className="term-bar">
            <span className="term-dots" aria-hidden="true"><i/><i/><i/></span>
            <span className="term-title">terminal</span>
            <span style={{ width: 52 }}/>
          </div>
          <div className="term-body" aria-label="Terminal output" role="log">
            <span className="t-p">~ $&nbsp;</span>
            <span ref={termInputRef}/>
            <span className="term-cursor" ref={termCurRef} aria-hidden="true"/>
            <div ref={termOutRef}/>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
