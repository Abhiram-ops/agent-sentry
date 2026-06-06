// Groq API — free tier, 14,400 req/day, OpenAI-compatible

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
        const text = raw.length > 2000 ? raw.slice(0, 2000) + "\n... [truncated]" : raw;
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
Be concise and direct. Use code blocks for commands.`;

export async function POST(req: Request) {
  const { messages } = await req.json();
  const apiKey = process.env.GROQ_API_KEY;

  if (!apiKey) {
    return new Response(
      `data: ${JSON.stringify({ error: "GROQ_API_KEY not set in Vercel" })}\n\ndata: [DONE]\n\n`,
      { headers: { "Content-Type": "text/event-stream" } }
    );
  }

  const codeContext = await getCodebaseContext();
  const systemContent = codeContext ? `${STATIC_SYSTEM}\n\n## Live Codebase\n${codeContext}` : STATIC_SYSTEM;

  const groqMessages = [
    { role: "system", content: systemContent },
    ...messages.map((m: { role: string; content: string }) => ({
      role: m.role === "assistant" ? "assistant" : "user",
      content: m.content,
    })),
  ];

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      try {
        const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
          body: JSON.stringify({ model: "llama-3.1-8b-instant", messages: groqMessages, stream: true, max_tokens: 1024, temperature: 0.7 }),
        });

        if (!res.ok || !res.body) {
          let userErr = `api_error_${res.status}`;
          try {
            const errData = JSON.parse(await res.text());
            const groqMsg: string = errData?.error?.message ?? "";
            if (res.status === 429 || groqMsg.includes("rate_limit") || groqMsg.includes("quota")) userErr = "rate_limited";
          } catch { /* use default */ }
          throw new Error(userErr);
        }

        const reader = res.body.getReader();
        const dec = new TextDecoder();
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = dec.decode(value);
          for (const line of chunk.split("\n")) {
            if (!line.startsWith("data: ")) continue;
            const data = line.slice(6).trim();
            if (data === "[DONE]") break;
            try {
              const parsed = JSON.parse(data);
              const text = parsed?.choices?.[0]?.delta?.content;
              if (text) controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text })}\n\n`));
            } catch { /* skip */ }
          }
        }
        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Unknown error";
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: msg })}\n\n`));
        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
      } finally { controller.close(); }
    },
  });

  return new Response(stream, {
    headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache", Connection: "keep-alive" },
  });
      }
