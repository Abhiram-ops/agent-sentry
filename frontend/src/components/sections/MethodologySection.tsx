"use client";

import { useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ChevronDown } from "lucide-react";

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

interface FactorRow {
  symbol: string;
  name: string;
  range: string;
  measures: string;
}

interface AccordionItem {
  id: string;
  index: string;
  title: string;
  body: string;
}

/* ------------------------------------------------------------------ */
/* Content                                                             */
/* ------------------------------------------------------------------ */

const FACTORS: readonly FactorRow[] = [
  { symbol: "P", name: "Privilege", range: "[0.1, 5.0]", measures: "Effective permission scope of the identity's credentials" },
  { symbol: "R", name: "Reachability", range: "[0.1, 3.0]", measures: "Network and trust-boundary exposure of the identity" },
  { symbol: "E", name: "Exposure", range: "[0.1, 3.0]", measures: "Credential hygiene: rotation age, storage, plaintext leaks" },
  { symbol: "A", name: "AI-Amplification", range: "[1.0, 50.0]", measures: "Risk multiplier for autonomous agents with tool access" },
] as const;

const ACCORDION: readonly AccordionItem[] = [
  {
    id: "irreversibility",
    index: "4.1",
    title: "Tool irreversibility classes",
    body: "Each tool bound to an agent is classified by the reversibility of its worst-case invocation. Read-class tools (retrieval, search) carry a 1\u00D7 weight. Write-class tools (file mutation, API POST) carry a 4\u00D7 weight. Execute-class tools (code execution, shell, infrastructure mutation) carry a 10\u00D7 weight, because a single invocation can establish persistence or destroy state with no rollback path. The classification is derived statically from the tool's declared schema and call sites \u2014 no runtime instrumentation is required.",
  },
  {
    id: "autonomy",
    index: "4.2",
    title: "Autonomy levels L1\u2013L5",
    body: "Autonomy is graded by the presence and placement of human-in-the-loop (HITL) gates in the agent graph. L1 agents only suggest actions; L2 require approval per tool call; L3 require approval per session; L4 run unsupervised loops with bounded iterations; L5 run unsupervised with self-modification of goals or tool sets. The level acts as a multiplier on the irreversibility weight: an execute-class tool behind an L2 approval gate scores an order of magnitude lower than the same tool inside an L4 loop.",
  },
  {
    id: "composition",
    index: "4.3",
    title: "Composing the A-factor",
    body: "A is the product of the maximum irreversibility weight across the agent's tool surface and the autonomy multiplier, clamped to [1.0, 50.0]. Non-agent identities (service accounts, API keys, IAM roles) take A = 1.0, which reduces PREA to a conventional privilege-exposure model and keeps scores comparable across identity types. The CRITICAL ceiling (A = 50.0) is reached only by execute-class tools inside L4+ loops \u2014 exactly the configuration found in the AS-0042 example above.",
  },
  {
    id: "comparison",
    index: "4.4",
    title: "Why CVSS and DREAD under-score agents",
    body: "CVSS scores a vulnerability in isolation and DREAD scores a threat scenario; neither models an identity that can plan multi-step actions. An AI agent with admin credentials and code execution has no CVE, yet its compromise is operationally equivalent to remote code execution with insider privileges. PREA treats autonomy itself as the exploitable surface, which is why the A term is multiplicative rather than additive: amplification compounds with privilege instead of merely adding to it.",
  },
] as const;

const EASE = [0.16, 1, 0.3, 1] as [number, number, number, number];

/* ------------------------------------------------------------------ */
/* Component                                                           */
/* ------------------------------------------------------------------ */

export default function MethodologySection() {
  const [open, setOpen] = useState<string | null>("irreversibility");
  const prefersReducedMotion = useReducedMotion();

  return (
    <section
      id="methodology"
      aria-labelledby="methodology-heading"
      className="mx-auto w-full max-w-6xl px-6 py-24"
    >
      {/* Section header */}
      <div className="mb-12 max-w-2xl">
        <p className="mb-2 font-mono text-xs uppercase tracking-widest text-zinc-500">
          &sect; 4 &middot; Scoring methodology
        </p>
        <h2 id="methodology-heading" className="text-2xl font-semibold tracking-tight text-zinc-100">
          The PREA risk model
        </h2>
        <p className="mt-3 text-sm leading-6 text-zinc-400">
          Every non-human identity is scored by a single multiplicative model. The formulation is
          deliberately auditable: each factor is computed from statically observable evidence, and
          the final score decomposes into the exact terms shown in scan output.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        {/* Left — formula */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.4, ease: EASE }}
          className="rounded-lg border border-zinc-800 bg-zinc-950 p-8"
        >
          <p className="font-mono text-[10px] uppercase tracking-widest text-zinc-600">
            Definition 4.1 — composite risk
          </p>

          {/* LaTeX-styled formula */}
          <p className="my-8 text-center font-serif text-2xl italic tracking-wide text-zinc-100">
            Risk(n)&thinsp;=&thinsp;P(n)&thinsp;&times;&thinsp;R(n)&thinsp;&times;&thinsp;E(n)&thinsp;&times;&thinsp;A(n)
          </p>
          <p className="text-center font-serif text-sm italic text-zinc-500">
            for each identity n &isin; N, the set of discovered non-human identities
          </p>

          {/* Factor table */}
          <table className="mt-8 w-full border-collapse text-left">
            <caption className="sr-only">PREA factor definitions and ranges</caption>
            <thead>
              <tr className="border-b border-zinc-800 font-mono text-[10px] uppercase tracking-widest text-zinc-600">
                <th scope="col" className="py-2 pr-4 font-medium">Term</th>
                <th scope="col" className="py-2 pr-4 font-medium">Range</th>
                <th scope="col" className="py-2 font-medium">Measures</th>
              </tr>
            </thead>
            <tbody>
              {FACTORS.map((f) => (
                <tr key={f.symbol} className="border-b border-zinc-900 align-top">
                  <td className="py-3 pr-4 whitespace-nowrap">
                    <span className="font-serif italic text-zinc-100">{f.symbol}</span>
                    <span className="ml-2 text-xs text-zinc-500">{f.name}</span>
                  </td>
                  <td className="py-3 pr-4 font-mono text-xs text-zinc-400">{f.range}</td>
                  <td className="py-3 text-xs leading-5 text-zinc-400">{f.measures}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Worked example */}
          <div className="mt-8 rounded border border-zinc-800 bg-zinc-900/50 p-4">
            <p className="font-mono text-[10px] uppercase tracking-widest text-zinc-600">
              Example 4.1 — finding AS-0042
            </p>
            <p className="mt-2 font-mono text-xs leading-6 text-zinc-300">
              Risk = 5.0 &times; 2.5 &times; 3.0 &times; 50.0 = 1875.0{" "}
              <span className="text-red-400">[CRITICAL]</span>
            </p>
            <p className="mt-1 text-xs leading-5 text-zinc-500">
              The same identity with an L2 approval gate (A = 5.0) scores 187.5 — one configuration
              change moves the finding two severity bands.
            </p>
          </div>
        </motion.div>

        {/* Right — A-factor accordion */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.4, delay: 0.08, ease: EASE }}
          className="rounded-lg border border-zinc-800 bg-zinc-950"
        >
          <div className="border-b border-zinc-800 p-6">
            <p className="font-mono text-[10px] uppercase tracking-widest text-zinc-600">
              &sect; 4.1&ndash;4.4 &middot; The AI-Amplification factor
            </p>
            <p className="mt-2 text-sm leading-6 text-zinc-400">
              A is the term that distinguishes PREA from conventional identity-risk models. It
              isolates two statically measurable properties of an agent: what its tools can do
              irreversibly, and how unsupervised it is when doing it.
            </p>
          </div>

          <div role="presentation">
            {ACCORDION.map((item) => {
              const isOpen = open === item.id;
              const panelId = `methodology-panel-${item.id}`;
              const buttonId = `methodology-button-${item.id}`;
              return (
                <div key={item.id} className="border-b border-zinc-900 last:border-b-0">
                  <h3>
                    <button
                      type="button"
                      id={buttonId}
                      aria-expanded={isOpen}
                      aria-controls={panelId}
                      onClick={() => setOpen(isOpen ? null : item.id)}
                      className="flex w-full items-center justify-between gap-4 px-6 py-4 text-left transition-colors hover:bg-zinc-900/40 focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-zinc-500"
                    >
                      <span className="flex items-baseline gap-3">
                        <span className="font-mono text-xs text-zinc-600">{item.index}</span>
                        <span className="text-sm font-medium text-zinc-200">{item.title}</span>
                      </span>
                      <ChevronDown
                        className={`h-4 w-4 shrink-0 text-zinc-500 transition-transform duration-200 ${
                          isOpen ? "rotate-180" : ""
                        }`}
                        aria-hidden="true"
                      />
                    </button>
                  </h3>

                  <AnimatePresence initial={false}>
                    {isOpen && (
                      <motion.div
                        id={panelId}
                        role="region"
                        aria-labelledby={buttonId}
                        initial={prefersReducedMotion ? false : { height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={prefersReducedMotion ? undefined : { height: 0, opacity: 0 }}
                        transition={{ duration: 0.25, ease: EASE }}
                        className="overflow-hidden"
                      >
                        <p className="px-6 pb-5 text-sm leading-6 text-zinc-400">{item.body}</p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
