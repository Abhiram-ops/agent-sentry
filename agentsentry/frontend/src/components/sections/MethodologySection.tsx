"use client";

import { useEffect } from "react";
import { motion } from "framer-motion";

interface FactorRow {
  symbol: string;
  name: string;
  range: string;
  measures: string;
}

const FACTORS: readonly FactorRow[] = [
  { symbol: "P", name: "Privilege", range: "[0.1, 5.0]", measures: "Effective permission scope of the identity's credentials" },
  { symbol: "R", name: "Reachability", range: "[0.1, 3.0]", measures: "Network and trust-boundary exposure of the identity" },
  { symbol: "E", name: "Exposure", range: "[0.1, 3.0]", measures: "Credential hygiene: rotation age, storage, plaintext leaks" },
  { symbol: "A", name: "AI-Amplification", range: "[1.0, 50.0]", measures: "Risk multiplier for autonomous agents with tool access" },
] as const;

const TOC = [
  { href: "#def-4-1", label: "4.1 — Composite risk definition" },
  { href: "#factor-table", label: "Factor reference" },
  { href: "#example-4-1", label: "Worked example — AS-0042" },
  { href: "#ai-factor", label: "AI-Amplification factor" },
  { href: "#autonomy-levels", label: "Autonomy levels L1–L5" },
  { href: "#why-prea", label: "Why CVSS/DREAD fall short" },
];

export default function MethodologySection() {
  useEffect(() => {
    const tocLinks = document.querySelectorAll<HTMLAnchorElement>('.toc-list a[href^="#"]');
    if (!tocLinks.length) return;
    const secObs = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        const link = document.querySelector(`.toc-list a[href="#${entry.target.id}"]`);
        if (link) link.classList.toggle("active", entry.isIntersecting);
      });
    }, { rootMargin: "-20% 0px -70% 0px" });
    tocLinks.forEach((a) => {
      const sec = document.querySelector(a.getAttribute("href")!);
      if (sec) secObs.observe(sec);
    });
    return () => secObs.disconnect();
  }, []);

  return (
    <section id="research" className="section section-alt" aria-labelledby="research-heading">
      <div className="container">
        <motion.div className="section-header"
          initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }} transition={{ duration: 0.5 }}>
          <div className="section-label">§4 · Scoring methodology</div>
          <h2 id="research-heading">The PREA risk model</h2>
          <p>
            Every non-human identity is scored by a single multiplicative model. The formulation is
            deliberately auditable: each factor is computed from statically observable evidence, and
            the final score decomposes into the exact terms shown in scan output.
          </p>
        </motion.div>

        <div className="research-layout">
          <div className="research-toc">
            <div className="toc-header">On this page</div>
            <ul className="toc-list">
              {TOC.map((item) => (
                <li key={item.href}><a href={item.href}>{item.label}</a></li>
              ))}
            </ul>
          </div>

          <div>
            <div id="def-4-1" className="research-sec">
              <div className="research-sec-id">Definition 4.1 — Composite risk</div>
              <h3>The PREA formula</h3>
              <p>
                Risk for an identity n is the product of four independently measurable factors. Because the
                relationship is multiplicative, a near-zero value in any single factor drives the overall
                score down — and a maximal value in any factor amplifies the rest.
              </p>
              <div className="formula-block">
                <div className="formula-text">Risk(n) = P(n) × R(n) × E(n) × A(n)</div>
                <div className="formula-sub">for each identity n ∈ N, the set of discovered non-human identities</div>
              </div>
            </div>

            <div id="factor-table" className="research-sec">
              <div className="research-sec-id">§4 — Factor reference</div>
              <h3>Scoring factors</h3>
              <p>Each term is bounded and derived from statically observable evidence — no runtime instrumentation required.</p>
              <table className="factors-table">
                <thead>
                  <tr>
                    <th scope="col">Term</th>
                    <th scope="col">Range</th>
                    <th scope="col">Measures</th>
                  </tr>
                </thead>
                <tbody>
                  {FACTORS.map((f) => (
                    <tr key={f.symbol}>
                      <td>{f.symbol} <span style={{ color: "var(--text-faint)", fontFamily: "var(--font-sans)" }}>{f.name}</span></td>
                      <td>{f.range}</td>
                      <td>{f.measures}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div id="example-4-1" className="research-sec">
              <div className="research-sec-id">Example 4.1 — Finding AS-0042</div>
              <h3>Worked example</h3>
              <p>
                A LangChain agent with admin-scoped credentials, public ingress, plaintext key material, and an
                unsupervised execute-class tool loop scores as follows:
              </p>
              <div className="code-block">
                <div className="cl">agentsentry scan agents --pro</div>
                <div><span className="ch">RISK</span> = <span className="cv">5.0 × 2.5 × 3.0 × 50.0 = 1875.0</span> &nbsp; [CRITICAL]</div>
              </div>
              <div className="research-note">
                <p>
                  The same identity with an L2 approval gate (A = 5.0) scores 187.5 — one configuration
                  change moves the finding two severity bands.
                </p>
              </div>
            </div>

            <div id="ai-factor" className="research-sec">
              <div className="research-sec-id">§4.1, 4.3 — The AI-Amplification factor</div>
              <h3>Tool irreversibility & composing the A-factor</h3>
              <p>
                A is the term that distinguishes PREA from conventional identity-risk models. It isolates two
                statically measurable properties of an agent: what its tools can do irreversibly, and how
                unsupervised it is when doing it.
              </p>
              <p>
                Each tool bound to an agent is classified by the reversibility of its worst-case invocation.
                Read-class tools (retrieval, search) carry a 1× weight. Write-class tools (file mutation, API
                POST) carry a 4× weight. Execute-class tools (code execution, shell, infrastructure mutation)
                carry a 10× weight, because a single invocation can establish persistence or destroy state with
                no rollback path. The classification is derived statically from the tool&apos;s declared schema
                and call sites — no runtime instrumentation is required.
              </p>
              <p>
                A is the product of the maximum irreversibility weight across the agent&apos;s tool surface and
                the autonomy multiplier, clamped to [1.0, 50.0]. Non-agent identities (service accounts, API
                keys, IAM roles) take A = 1.0, which reduces PREA to a conventional privilege-exposure model
                and keeps scores comparable across identity types. The CRITICAL ceiling (A = 50.0) is reached
                only by execute-class tools inside L4+ loops — exactly the configuration found in the AS-0042
                example above.
              </p>
            </div>

            <div id="autonomy-levels" className="research-sec">
              <div className="research-sec-id">§4.2 — Autonomy levels</div>
              <h3>Autonomy levels L1–L5</h3>
              <p>
                Autonomy is graded by the presence and placement of human-in-the-loop (HITL) gates in the agent
                graph. L1 agents only suggest actions; L2 require approval per tool call; L3 require approval
                per session; L4 run unsupervised loops with bounded iterations; L5 run unsupervised with
                self-modification of goals or tool sets. The level acts as a multiplier on the irreversibility
                weight: an execute-class tool behind an L2 approval gate scores an order of magnitude lower
                than the same tool inside an L4 loop.
              </p>
            </div>

            <div id="why-prea" className="research-sec">
              <div className="research-sec-id">§4.4 — Why PREA</div>
              <h3>Why CVSS and DREAD under-score agents</h3>
              <p>
                CVSS scores a vulnerability in isolation and DREAD scores a threat scenario; neither models an
                identity that can plan multi-step actions. An AI agent with admin credentials and code
                execution has no CVE, yet its compromise is operationally equivalent to remote code execution
                with insider privileges. PREA treats autonomy itself as the exploitable surface, which is why
                the A term is multiplicative rather than additive: amplification compounds with privilege
                instead of merely adding to it.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
