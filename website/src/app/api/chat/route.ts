// Uses Gemini REST API directly — no SDK needed, no package issues

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
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return new Response("data: " + JSON.stringify({ error: "GEMINI_API_KEY not set" }) + "\n\n", {
      headers: { "Content-Type": "text/event-stream" },
    });
  }

  const codeContext = await getCodebaseContext();
  const systemText = codeContext
    ? `${STATIC_SYSTEM}\n\n## Live Codebase\n${codeContext}`
    : STATIC_SYSTEM;

  // Convert messages to Gemini format
  const contents = messages.map((m: { role: string; content: string }) => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content }],
  }));

  const body = {
    system_instruction: { parts: [{ text: systemText }] },
    contents,
    generationConfig: { maxOutputTokens: 1024, temperature: 0.7 },
  };

  // Try gemini-2.0-flash first, fallback to gemini-1.5-flash-latest
  const models = ["gemini-2.0-flash", "gemini-1.5-flash-latest"];
  
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      let success = false;
      for (const model of models) {
        try {
          const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?alt=sse&key=${apiKey}`;
          const geminiRes = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          });

          if (!geminiRes.ok || !geminiRes.body) {
            const errText = await geminiRes.text();
            if (errText.includes("not found") || errText.includes("404")) continue; // try next model
            throw new Error(`Gemini ${geminiRes.status}: ${errText.slice(0, 200)}`);
          }

          const reader = geminiRes.body.getReader();
          const dec = new TextDecoder();

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            const chunk = dec.decode(value);
            for (const line of chunk.split("\n")) {
              if (!line.startsWith("data: ")) continue;
              const data = line.slice(6).trim();
              if (!data || data === "[DONE]") continue;
              try {
                const parsed = JSON.parse(data);
                const text = parsed?.candidates?.[0]?.content?.parts?.[0]?.text;
                if (text) controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text })}\n\n`));
              } catch { /* skip malformed */ }
            }
          }
          success = true;
          break;
        } catch (err) {
          if (model === models[models.length - 1]) {
            const msg = err instanceof Error ? err.message : "Unknown error";
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: msg })}\n\n`));
          }
        }
      }
      if (!success && !controller.desiredSize) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: "All models unavailable" })}\n\n`));
      }
      controller.enqueue(encoder.encode("data: [DONE]\n\n"));
      controller.close();
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
