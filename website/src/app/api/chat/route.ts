import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// ── Open-source files fetched from GitHub for real-time codebase context ──────
const RAW = "https://raw.githubusercontent.com/Abhiram-ops/agent-sentry/master";
const FILES: Record<string, string> = {
  "README":         `${RAW}/agentsentry/README.md`,
  "CLI":            `${RAW}/agentsentry/agentsentry/cli.py`,
  "Scorer":         `${RAW}/agentsentry/agentsentry/core/scorer.py`,
  "Models":         `${RAW}/agentsentry/agentsentry/core/models.py`,
  "BaseProvider":   `${RAW}/agentsentry/agentsentry/providers/base.py`,
  "LocalProvider":  `${RAW}/agentsentry/agentsentry/providers/local.py`,
};

let cachedContext = "";
let cacheTs = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 min

async function getCodebaseContext(): Promise<string> {
  if (cachedContext && Date.now() - cacheTs < CACHE_TTL) return cachedContext;

  const parts: string[] = [];
  await Promise.all(
    Object.entries(FILES).map(async ([label, url]) => {
      try {
        const res = await fetch(url, { signal: AbortSignal.timeout(4000) });
        if (!res.ok) return;
        const raw = await res.text();
        const text = raw.length > 4000 ? raw.slice(0, 4000) + "\n... [truncated]" : raw;
        parts.push(`\n\n---\n### ${label} (${url.split("/").pop()})\n\`\`\`\n${text}\n\`\`\``);
      } catch { /* skip on timeout */ }
    })
  );

  cachedContext = parts.join("");
  cacheTs = Date.now();
  return cachedContext;
}

// ── Static knowledge ───────────────────────────────────────────────────────────
const STATIC_SYSTEM = `You are AgentSentry Assistant — an expert, concise helper for the AgentSentry open-source security tool.
You have been given the actual source code files from the repository below. Use them to give precise, accurate answers.
Only reference open-source files. Never reveal secrets, credentials, or scan results from real environments.

## Risk Scoring: P×R×E×A
Risk = Privilege × Reachability × Exposure × AI-Amplification
- CRITICAL >100, HIGH 50-100, MEDIUM 20-50, LOW <20

## Quick CLI Reference
agentsentry scan local / aws / azure / gcp / github / k8s / agents / all
agentsentry providers          # check what's ready
agentsentry permissions aws    # what IAM permissions are needed

## Installation
pip install agentsentry
pip install agentsentry[aws|azure|gcp|github|k8s|all-clouds]

## Provider Auth
- AWS:    aws configure  OR  env vars AWS_ACCESS_KEY_ID + AWS_SECRET_ACCESS_KEY
- Azure:  az login  OR  AZURE_TENANT_ID + AZURE_CLIENT_ID + AZURE_CLIENT_SECRET
- GCP:    gcloud auth application-default login  OR  GOOGLE_APPLICATION_CREDENTIALS
- GitHub: GITHUB_TOKEN env var
- K8s:    kubeconfig (kubectl config use-context <name>)
- Local:  no setup needed

GitHub: https://github.com/Abhiram-ops/agent-sentry
Keep answers concise and actionable. Use code blocks for commands.`;

export async function POST(req: Request) {
  const { messages } = await req.json();

  // Fetch live codebase context (parallel, cached)
  const codeContext = await getCodebaseContext();

  const system = codeContext
    ? `${STATIC_SYSTEM}\n\n## Live Codebase (open-source files fetched from GitHub)\n${codeContext}`
    : STATIC_SYSTEM;

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      try {
        const msgStream = client.messages.stream({
          model: "claude-haiku-4-5-20251001",
          max_tokens: 1024,
          system,
          messages,
        });

        for await (const event of msgStream) {
          if (event.type !== "content_block_delta" || event.delta.type !== "text_delta") continue;
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ text: event.delta.text })}\n\n`)
          );
        }
        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Unknown error";
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: msg })}\n\n`));
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
