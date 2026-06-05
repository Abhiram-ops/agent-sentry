import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const RAW = "https://raw.githubusercontent.com/Abhiram-ops/agent-sentry/master";
const FILES: Record<string, string> = {
  "README":        `${RAW}/agentsentry/README.md`,
  "CLI":           `${RAW}/agentsentry/agentsentry/cli.py`,
  "Scorer":        `${RAW}/agentsentry/agentsentry/core/scorer.py`,
  "Models":        `${RAW}/agentsentry/agentsentry/core/models.py`,
  "BaseProvider":  `${RAW}/agentsentry/agentsentry/providers/base.py`,
  "LocalProvider": `${RAW}/agentsentry/agentsentry/providers/local.py`,
};

let cachedContext = "";
let cacheTs = 0;
const CACHE_TTL = 5 * 60 * 1000;

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
        parts.push(`\n\n---\n### ${label}\n\`\`\`\n${text}\n\`\`\``);
      } catch { /* skip */ }
    })
  );
  cachedContext = parts.join("");
  cacheTs = Date.now();
  return cachedContext;
}

const STATIC_SYSTEM = `You are AgentSentry Assistant — an expert helper for the AgentSentry open-source security tool.
Use the source code files provided to give precise, accurate answers.
Only reference open-source files. Never reveal secrets or credentials.

## Risk Scoring: P×R×E×A
Risk = Privilege × Reachability × Exposure × AI-Amplification
CRITICAL >100, HIGH 50-100, MEDIUM 20-50, LOW <20

## CLI Reference
agentsentry scan local / aws / azure / gcp / github / k8s / all
agentsentry providers | agentsentry interactive

## Install
pip install nhi-audit
pip install nhi-audit[aws|azure|gcp|github|k8s|all-clouds]

## Auth
AWS: aws configure | Azure: az login | GCP: gcloud auth application-default login
GitHub: GITHUB_TOKEN env var | Local: no setup needed

GitHub: https://github.com/Abhiram-ops/agent-sentry
Be concise. Use code blocks for commands.`;

export async function POST(req: Request) {
  const { messages } = await req.json();

  const codeContext = await getCodebaseContext();
  const system = codeContext
    ? `${STATIC_SYSTEM}\n\n## Live Codebase\n${codeContext}`
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
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text: event.delta.text })}\n\n`));
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
