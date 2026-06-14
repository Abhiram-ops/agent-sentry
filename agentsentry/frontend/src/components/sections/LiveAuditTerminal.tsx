"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useInView, useReducedMotion } from "framer-motion";
import {
  FileCode2,
  FileText,
  Folder,
  FolderOpen,
  KeyRound,
  RotateCcw,
  TriangleAlert,
} from "lucide-react";

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

type LineKind =
  | "command"
  | "stdout"
  | "muted"
  | "success"
  | "warn"
  | "critical"
  | "rule"
  | "blank";

interface ScriptLine {
  kind: LineKind;
  text: string;
  /** ms pause before this line renders */
  delayMs: number;
}

interface TreeEntry {
  depth: number;
  name: string;
  type: "dir" | "file";
  flagged?: boolean;
  open?: boolean;
}

/* ------------------------------------------------------------------ */
/* Data — deterministic script, no randomness                          */
/* ------------------------------------------------------------------ */

const PROMPT = "user@sec-workstation:~/sre-copilot$ ";
const COMMAND = "agentsentry scan agents --pro";

/** Index in SCRIPT at which the finding is emitted — file tree flags activate here. */
const FINDING_AT = 8;

const SCRIPT: readonly ScriptLine[] = [
  { kind: "muted", text: "AgentSentry v0.1.8 · Pro license verified (HMAC offline)", delayMs: 300 },
  { kind: "stdout", text: "Discovering agent frameworks in ./ ...", delayMs: 350 },
  { kind: "stdout", text: "  found: LangChain 0.3.x (AgentExecutor) · 1 graph, 4 tools", delayMs: 420 },
  { kind: "success", text: "✓ chains/rag_chain.py — retrieval only, no tool surface [SAFE]", delayMs: 380 },
  { kind: "stdout", text: "Resolving tool permission surfaces ...", delayMs: 420 },
  { kind: "warn", text: "⚠ tools/shell_tool.py — subprocess access, gated by allowlist", delayMs: 400 },
  { kind: "stdout", text: "Computing PREA for 3 non-human identities ...", delayMs: 460 },
  { kind: "blank", text: "", delayMs: 240 },
  { kind: "critical", text: "■ FINDING AS-0042 — autonomous agent with irreversible tools", delayMs: 200 },
  { kind: "rule", text: "──────────────────────────────────────────────────────", delayMs: 120 },
  { kind: "stdout", text: "  AGENT      ResearchAgent  agents/agent_executor.py:41", delayMs: 160 },
  { kind: "stdout", text: "  TOOLS      execute_code · shell · http_request", delayMs: 160 },
  { kind: "stdout", text: "  AUTONOMY   L4 — unsupervised loop, no human-in-the-loop gate", delayMs: 160 },
  { kind: "blank", text: "", delayMs: 140 },
  { kind: "muted", text: "  FACTOR              VALUE   EVIDENCE", delayMs: 140 },
  { kind: "stdout", text: "  P  Privilege          5.0   admin-scoped session credentials", delayMs: 150 },
  { kind: "stdout", text: "  R  Reachability       2.5   public ingress via /chat endpoint", delayMs: 150 },
  { kind: "stdout", text: "  E  Exposure           3.0   plaintext key material in .env", delayMs: 150 },
  { kind: "warn", text: "  A  AI-Amplification  50.0   execute_code (irreversible) × L4", delayMs: 150 },
  { kind: "rule", text: "  ────────────────────────────────────────────────────", delayMs: 120 },
  { kind: "critical", text: "  RISK = 5.0 × 2.5 × 3.0 × 50.0 = 1875.0   [CRITICAL]", delayMs: 220 },
  { kind: "blank", text: "", delayMs: 160 },
  { kind: "stdout", text: "  MITRE      T1059 Command Execution · T1552 Unsecured Credentials", delayMs: 170 },
  { kind: "stdout", text: "  REMEDIATE  scope IAM to read-only; add HITL gate before execute_code", delayMs: 170 },
  { kind: "blank", text: "", delayMs: 160 },
  { kind: "success", text: "✓ Scan complete — 3 NHIs · 1 critical · 1 warning · report written", delayMs: 200 },
] as const;

const FILE_TREE: readonly TreeEntry[] = [
  { depth: 0, name: "sre-copilot/", type: "dir", open: true },
  { depth: 1, name: "agents/", type: "dir", open: true },
  { depth: 2, name: "agent_executor.py", type: "file", flagged: true },
  { depth: 2, name: "tools/", type: "dir", open: true },
  { depth: 3, name: "execute_code.py", type: "file", flagged: true },
  { depth: 3, name: "shell_tool.py", type: "file" },
  { depth: 3, name: "http_tool.py", type: "file" },
  { depth: 1, name: "chains/", type: "dir", open: true },
  { depth: 2, name: "rag_chain.py", type: "file" },
  { depth: 1, name: "prompts/", type: "dir" },
  { depth: 1, name: ".env", type: "file", flagged: true },
  { depth: 1, name: "requirements.txt", type: "file" },
  { depth: 1, name: "langgraph.json", type: "file" },
] as const;

const TYPE_INTERVAL_MS = 38;

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

const LINE_CLASS: Record<LineKind, string> = {
  command: "text-zinc-100",
  stdout: "text-zinc-300",
  muted: "text-zinc-500",
  success: "text-[#00ff88]",
  warn: "text-amber-400",
  critical: "text-red-400",
  rule: "text-zinc-700",
  blank: "text-transparent",
};

function TreeRow({ entry, active }: { entry: TreeEntry; active: boolean }) {
  const isFlagged = Boolean(entry.flagged) && active;
  const Icon =
    entry.type === "dir"
      ? entry.open
        ? FolderOpen
        : Folder
      : entry.name === ".env"
        ? KeyRound
        : entry.name.endsWith(".py")
          ? FileCode2
          : FileText;

  return (
    <div
      className={`flex items-center gap-2 rounded px-2 py-1 text-xs transition-colors duration-200 ${
        isFlagged ? "bg-red-500/10 text-red-300" : "text-zinc-400"
      }`}
      style={{ paddingLeft: `${8 + entry.depth * 16}px` }}
    >
      <Icon
        className={`h-3.5 w-3.5 shrink-0 ${isFlagged ? "text-red-400" : "text-zinc-600"}`}
        aria-hidden="true"
      />
      <span className="truncate font-mono">{entry.name}</span>
      {isFlagged && (
        <TriangleAlert className="ml-auto h-3 w-3 shrink-0 text-red-400" aria-label="Flagged by scan" />
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Component                                                           */
/* ------------------------------------------------------------------ */

export default function LiveAuditTerminal() {
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inView = useInView(containerRef, { once: true, amount: 0.35 });
  const prefersReducedMotion = useReducedMotion();

  /** chars of COMMAND typed so far */
  const [typed, setTyped] = useState<number>(0);
  /** number of SCRIPT lines revealed */
  const [revealed, setRevealed] = useState<number>(0);
  const [runId, setRunId] = useState<number>(0);

  const commandDone = typed >= COMMAND.length;
  const finished = revealed >= SCRIPT.length;
  const findingVisible = revealed > FINDING_AT;

  // Phase 1 — type the command character by character.
  useEffect(() => {
    if (!inView || commandDone) return;
    if (prefersReducedMotion) {
      setTyped(COMMAND.length);
      return;
    }
    const t = setTimeout(() => setTyped((n) => n + 1), TYPE_INTERVAL_MS);
    return () => clearTimeout(t);
  }, [inView, typed, commandDone, prefersReducedMotion, runId]);

  // Phase 2 — reveal output lines on their scripted delays.
  useEffect(() => {
    if (!inView || !commandDone || finished) return;
    if (prefersReducedMotion) {
      setRevealed(SCRIPT.length);
      return;
    }
    const next = SCRIPT[revealed];
    const t = setTimeout(() => setRevealed((n) => n + 1), next.delayMs);
    return () => clearTimeout(t);
  }, [inView, commandDone, revealed, finished, prefersReducedMotion, runId]);

  // Keep the console scrolled to the latest line.
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [revealed, typed]);

  const replay = (): void => {
    setTyped(0);
    setRevealed(0);
    setRunId((n) => n + 1);
  };

  return (
    <motion.div
      ref={containerRef}
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] }}
      className="w-full overflow-hidden rounded-lg border border-zinc-800 bg-zinc-950 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]"
    >
      {/* Title bar */}
      <div className="flex items-center justify-between border-b border-zinc-800 bg-zinc-900/60 px-4 py-2">
        <div className="flex items-center gap-2" aria-hidden="true">
          <span className="h-2.5 w-2.5 rounded-full bg-zinc-700" />
          <span className="h-2.5 w-2.5 rounded-full bg-zinc-700" />
          <span className="h-2.5 w-2.5 rounded-full bg-zinc-700" />
        </div>
        <span className="font-mono text-xs text-zinc-500">
          agentsentry — static agent audit
        </span>
        <button
          type="button"
          onClick={replay}
          className="flex items-center gap-1.5 rounded border border-zinc-800 px-2 py-1 font-mono text-xs text-zinc-400 transition-colors hover:border-zinc-700 hover:text-zinc-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-500"
        >
          <RotateCcw className="h-3 w-3" aria-hidden="true" />
          Replay
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-[220px_1fr]">
        {/* Left pane — repository tree */}
        <div className="border-b border-zinc-800 py-2 md:border-b-0 md:border-r">
          <p className="px-4 pb-2 pt-1 font-mono text-[10px] uppercase tracking-widest text-zinc-600">
            Target repository
          </p>
          <div role="tree" aria-label="Scanned repository files">
            {FILE_TREE.map((entry) => (
              <TreeRow key={`${entry.depth}-${entry.name}`} entry={entry} active={findingVisible} />
            ))}
          </div>
        </div>

        {/* Right pane — console */}
        <div
          ref={scrollRef}
          className="h-80 overflow-y-auto p-4 font-mono text-xs leading-6 md:h-96"
          role="log"
          aria-live="polite"
          aria-label="AgentSentry scan output"
        >
          <p className="whitespace-pre-wrap break-words">
            <span className="text-zinc-600">{PROMPT}</span>
            <span className="text-zinc-100">{COMMAND.slice(0, typed)}</span>
            {!finished && (
              <span className="cursor-blink ml-0.5 inline-block h-3.5 w-1.5 translate-y-0.5 bg-zinc-300" aria-hidden="true" />
            )}
          </p>
          {SCRIPT.slice(0, revealed).map((line, i) => (
            <p key={`${runId}-${i}`} className={`whitespace-pre-wrap break-words ${LINE_CLASS[line.kind]}`}>
              {line.kind === "blank" ? "\u00A0" : line.text}
            </p>
          ))}
        </div>
      </div>
    </motion.div>
  );
}
