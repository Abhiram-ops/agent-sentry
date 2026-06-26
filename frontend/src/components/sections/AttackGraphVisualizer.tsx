"use client";

import { useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Bot, Database, FileJson2, ShieldAlert, Workflow } from "lucide-react";
import type { LucideIcon } from "lucide-react";

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

type NodeId = "agent" | "iam" | "s3" | "lambda" | "secrets";
type NodeState = "compromised" | "exposed" | "impacted" | "in-scope";

interface GraphNode {
  id: NodeId;
  label: string;
  sublabel: string;
  state: NodeState;
  x: number;
  y: number;
  icon: LucideIcon;
  detail: Record<string, string | number | boolean | string[]>;
}

interface GraphEdge {
  from: NodeId;
  to: NodeId;
  label: string;
  attackPath: boolean;
}

/* ------------------------------------------------------------------ */
/* Data, mirrors `agentsentry blast nhi://agent/prod-sre-copilot`     */
/* ------------------------------------------------------------------ */

const NODES: readonly GraphNode[] = [
  {
    id: "agent",
    label: "Production SRE Copilot",
    sublabel: "LangChain agent · L4 autonomy",
    state: "compromised",
    x: 90,
    y: 170,
    icon: Bot,
    detail: {
      nhi_type: "ai_agent",
      framework: "langchain_agentexecutor",
      autonomy_level: "L4",
      tools: ["execute_code", "shell", "http_request"],
      compromise_assumed: true,
    },
  },
  {
    id: "iam",
    label: "sre-copilot-exec",
    sublabel: "IAM role · trust policy: *",
    state: "exposed",
    x: 330,
    y: 170,
    icon: ShieldAlert,
    detail: {
      nhi_type: "iam_role",
      arn: "arn:aws:iam::4821:role/sre-copilot-exec",
      trust_policy_wildcard: true,
      attached_policy: "AmazonS3FullAccess",
      last_rotated_days: 312,
    },
  },
  {
    id: "s3",
    label: "customer-data-prod",
    sublabel: "S3 bucket · PII, billing",
    state: "impacted",
    x: 560,
    y: 170,
    icon: Database,
    detail: {
      asset_type: "s3_bucket",
      arn: "arn:aws:s3:::customer-data-prod",
      data_classes: ["PII", "billing"],
      object_count: 1402311,
      reachable_via: "s3:GetObject",
    },
  },
  {
    id: "lambda",
    label: "report-renderer",
    sublabel: "Lambda · same trust scope",
    state: "in-scope",
    x: 330,
    y: 56,
    icon: Workflow,
    detail: {
      asset_type: "lambda_function",
      reachable: true,
      edge: "sts:AssumeRole",
      severity_contribution: "low",
    },
  },
  {
    id: "secrets",
    label: "prod/db-credentials",
    sublabel: "Secrets Manager",
    state: "in-scope",
    x: 330,
    y: 286,
    icon: FileJson2,
    detail: {
      asset_type: "secretsmanager_secret",
      reachable: true,
      edge: "secretsmanager:GetSecretValue",
      severity_contribution: "medium",
    },
  },
] as const;

const EDGES: readonly GraphEdge[] = [
  { from: "agent", to: "iam", label: "sts:AssumeRole", attackPath: true },
  { from: "iam", to: "s3", label: "s3:GetObject", attackPath: true },
  { from: "iam", to: "lambda", label: "lambda:Invoke", attackPath: false },
  { from: "iam", to: "secrets", label: "GetSecretValue", attackPath: false },
] as const;

const BLAST_SUMMARY = {
  source: "nhi://agent/prod-sre-copilot",
  compromise_assumed: true,
  hops: [
    { via: "iam_role", id: "sre-copilot-exec", edge: "sts:AssumeRole" },
    { via: "policy", id: "AmazonS3FullAccess", edge: "s3:GetObject" },
  ],
  terminal_asset: "arn:aws:s3:::customer-data-prod",
  assets_reachable: 14,
  data_classes: ["PII", "billing"],
  prea: { P: 5.0, R: 2.5, E: 3.0, A: 50.0, score: 1875.0, severity: "CRITICAL" },
} as const;

/* ------------------------------------------------------------------ */
/* Styling maps                                                        */
/* ------------------------------------------------------------------ */

const NODE_STYLE: Record<NodeState, { ring: string; chip: string; chipText: string }> = {
  compromised: { ring: "stroke-red-500", chip: "fill-red-500", chipText: "COMPROMISED" },
  exposed: { ring: "stroke-amber-400", chip: "fill-amber-400", chipText: "EXPOSED" },
  impacted: { ring: "stroke-red-400", chip: "fill-red-400", chipText: "IMPACTED" },
  "in-scope": { ring: "stroke-zinc-600", chip: "fill-zinc-600", chipText: "IN SCOPE" },
};

const NODE_W = 168;
const NODE_H = 56;

/* ------------------------------------------------------------------ */
/* JSON pane renderer, line-based key/value colorization, no `any`    */
/* ------------------------------------------------------------------ */

function JsonBlock({ value }: { value: object }) {
  const lines = JSON.stringify(value, null, 2).split("\n");
  return (
    <pre className="overflow-x-auto font-mono text-[11px] leading-5 text-zinc-400">
      {lines.map((line, i) => {
        const match = line.match(/^(\s*)"([^"]+)":(.*)$/);
        if (!match) {
          return (
            <span key={i} className="block text-zinc-600">
              {line}
            </span>
          );
        }
        const [, indent, key, rest] = match;
        return (
          <span key={i} className="block">
            {indent}
            <span className="text-zinc-300">&quot;{key}&quot;</span>
            <span className="text-zinc-600">:</span>
            <span className={/CRITICAL|true/.test(rest) ? "text-red-400" : "text-zinc-500"}>
              {rest}
            </span>
          </span>
        );
      })}
    </pre>
  );
}

/* ------------------------------------------------------------------ */
/* Component                                                           */
/* ------------------------------------------------------------------ */

export default function AttackGraphVisualizer() {
  const [selected, setSelected] = useState<NodeId | null>(null);
  const prefersReducedMotion = useReducedMotion();

  const selectedNode = NODES.find((n) => n.id === selected) ?? null;
  const drawEase = [0.16, 1, 0.3, 1] as [number, number, number, number];

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.4, ease: drawEase }}
      className="grid w-full grid-cols-1 overflow-hidden rounded-lg border border-zinc-800 bg-zinc-950 lg:grid-cols-[1fr_320px]"
    >
      {/* Graph pane */}
      <div className="border-b border-zinc-800 p-4 lg:border-b-0 lg:border-r">
        <div className="mb-2 flex items-baseline justify-between gap-4">
          <p className="font-mono text-xs text-zinc-500">
            $ agentsentry blast nhi://agent/prod-sre-copilot
          </p>
          <p className="font-mono text-[10px] uppercase tracking-widest text-zinc-600">
            select a node
          </p>
        </div>

        <svg
          viewBox="0 0 656 342"
          className="h-auto w-full"
          role="img"
          aria-label="Attack graph: compromised SRE Copilot reaches customer S3 bucket through an exposed IAM role"
        >
          {/* Edges */}
          {EDGES.map((edge) => {
            const a = NODES.find((n) => n.id === edge.from) as GraphNode;
            const b = NODES.find((n) => n.id === edge.to) as GraphNode;
            const x1 = a.x + NODE_W;
            const y1 = a.y + NODE_H / 2;
            const x2 = b.x;
            const y2 = b.y + NODE_H / 2;
            // Vertical edges leave from the role's top/bottom edge instead.
            const vertical = Math.abs(y2 - y1) > Math.abs(x2 - x1);
            const sx = vertical ? a.x + NODE_W / 2 : x1;
            const sy = vertical ? (y2 > y1 ? a.y + NODE_H : a.y) : y1;
            const ex = vertical ? b.x + NODE_W / 2 : x2;
            const ey = vertical ? (y2 > y1 ? b.y : b.y + NODE_H) : y2;
            const midX = (sx + ex) / 2;
            const midY = (sy + ey) / 2;

            return (
              <g key={`${edge.from}-${edge.to}`}>
                <motion.line
                  x1={sx}
                  y1={sy}
                  x2={ex}
                  y2={ey}
                  className={edge.attackPath ? "stroke-red-500/70" : "stroke-zinc-700"}
                  strokeWidth={edge.attackPath ? 1.5 : 1}
                  strokeDasharray={edge.attackPath ? "none" : "4 4"}
                  initial={prefersReducedMotion ? false : { pathLength: 0 }}
                  whileInView={{ pathLength: 1 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, ease: drawEase }}
                />
                <rect
                  x={midX - 52}
                  y={midY - 9}
                  width={104}
                  height={16}
                  rx={3}
                  className="fill-zinc-950"
                />
                <text
                  x={midX}
                  y={midY + 3}
                  textAnchor="middle"
                  className={`font-mono text-[9px] ${
                    edge.attackPath ? "fill-red-400" : "fill-zinc-500"
                  }`}
                >
                  {edge.label}
                </text>
              </g>
            );
          })}

          {/* Nodes */}
          {NODES.map((node) => {
            const style = NODE_STYLE[node.state];
            const isSelected = selected === node.id;
            return (
              <g
                key={node.id}
                onClick={() => setSelected(isSelected ? null : node.id)}
                className="cursor-pointer"
                role="button"
                aria-pressed={isSelected}
                aria-label={`${node.label}, ${style.chipText}`}
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    setSelected(isSelected ? null : node.id);
                  }
                }}
              >
                <rect
                  x={node.x}
                  y={node.y}
                  width={NODE_W}
                  height={NODE_H}
                  rx={6}
                  className={`fill-zinc-900 ${style.ring} ${
                    isSelected ? "stroke-2" : "stroke-1"
                  }`}
                />

                <text x={node.x + 12} y={node.y + 22} className="fill-zinc-100 text-[11px] font-medium">
                  {node.label}
                </text>
                <text x={node.x + 12} y={node.y + 38} className="fill-zinc-500 font-mono text-[9px]">
                  {node.sublabel}
                </text>
                <circle
                  cx={node.x + NODE_W - 4}
                  cy={node.y - 2}
                  r={4}
                  className={style.chip}
                />
              </g>
            );
          })}
        </svg>

        {/* Legend */}
        <div className="mt-2 flex flex-wrap gap-x-6 gap-y-1 font-mono text-[10px] uppercase tracking-wider text-zinc-500">
          <span className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-red-500" aria-hidden="true" /> compromised / impacted
          </span>
          <span className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-amber-400" aria-hidden="true" /> exposed
          </span>
          <span className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-zinc-600" aria-hidden="true" /> in blast scope
          </span>
        </div>
      </div>

      {/* Evidence pane */}
      <div className="flex flex-col bg-zinc-900/40">
        <div className="flex items-center justify-between border-b border-zinc-800 px-4 py-2">
          <span className="font-mono text-xs text-zinc-400">
            {selectedNode ? `node: ${selectedNode.id}` : "blast_radius.json"}
          </span>
          {selectedNode && (
            <button
              type="button"
              onClick={() => setSelected(null)}
              className="font-mono text-[10px] uppercase tracking-wider text-zinc-500 transition-colors hover:text-zinc-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-500"
            >
              show full blast
            </button>
          )}
        </div>
        <div className="min-h-64 flex-1 overflow-y-auto p-4">
          <JsonBlock value={selectedNode ? selectedNode.detail : BLAST_SUMMARY} />
        </div>
        <div className="border-t border-zinc-800 px-4 py-3">
          <p className="font-mono text-[11px] text-zinc-500">
            14 assets reachable from one compromised agent ·{" "}
            <span className="text-red-400">PREA 1875 [CRITICAL]</span>
          </p>
        </div>
      </div>
    </motion.div>
  );
}
