// Groq API — free tier, 14,400 req/day, OpenAI-compatible

const RAW = "https://raw.githubusercontent.com/Abhiram-ops/agent-sentry/master";
const FILES: Record<string, string> = {
  "README":        `${RAW}/agentsentry/README.md`,
  "CLI":           `${RAW}/agentsentry/agentsentry/cli.py`,
  "Scorer":        `${RAW}/agentsentry/agentsentry/core/scorer.py`,
  "Models":        `${RAW}/agentsentry/agentsentry/core/models.py`,
  "BaseProvider":  `${RAW}/agentsentry/agentsentry/providers/base.py`,
  "LocalProvider": `${RAW}/agentsentry/agentsentry/providers/local.py`,
  "ProOutput":     `${RAW}/agentsentry/agentsentry/core/pro_output.py`,
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

## Current Version
nhi-audit 0.2.0 (pip install nhi-audit). CLI command: agentsentry.

## Risk Scoring: P×R×E×A
Risk = Privilege × Reachability × Exposure × AI-Amplification
CRITICAL >100, HIGH 50-100, MEDIUM 20-50, LOW 5-20, INFO <5

## CLI Reference
agentsentry scan local            # scan local machine — no credentials needed (free)
agentsentry scan local --pro      # full analyst report per identity with attack narratives
agentsentry scan aws / azure / gcp / github / k8s
agentsentry scan all              # auto-detects all configured providers
agentsentry scan all --output json > findings.json
agentsentry scan all --min-risk HIGH
agentsentry scan all --fail-on CRITICAL
agentsentry scan aws --analyze-usage  # data-driven least-privilege via IAM Access Advisor (finds unused permissions to revoke)
agentsentry scan aws --save           # save scan to local history (~/.agentsentry/history.db)
agentsentry diff aws                  # scan again and show what changed since the last saved scan
agentsentry history                   # list past saved scans with CRIT/HIGH trend
agentsentry visualize             # open attack graph in browser
agentsentry providers             # list detected providers

## Install
pip install nhi-audit                              # base (local scan, free)
pip install nhi-audit[aws]                         # + AWS
pip install nhi-audit[azure]                       # + Azure
pip install nhi-audit[gcp]                         # + GCP
pip install nhi-audit[github]                      # + GitHub
pip install nhi-audit[k8s]                         # + Kubernetes
pip install nhi-audit[aws,azure,gcp,github,k8s]   # everything

## Auth
AWS: aws configure (or AWS_PROFILE env var)
Azure: az login
GCP: gcloud auth application-default login
GitHub: set GITHUB_TOKEN env var
Local: no setup needed

## Local Scanner
Scans with zero credentials — reads only files the current user can access:
- Environment variables matching secret patterns (AWS keys, GitHub tokens, etc.)
- .env files in current + parent directories
- SSH private keys in ~/.ssh/ (checks for missing passphrase)
- Cloud credential files: ~/.aws/credentials, ~/.kube/config, ~/.config/gcloud/, ~/.azure/, ~/.docker/config.json, ~/.terraform.d/, ~/.npmrc, ~/.pypirc, ~/.netrc, GitHub CLI hosts.yml
- Windows Credential Manager (cmdkey /list) — filters out consumer tokens (Xbox Live, WindowsLive, MicrosoftAccount) to eliminate noise
- macOS Keychain (security dump-keychain) — metadata only, never reads secret values
- Git credential store and OS credential manager helper
- Source files up to 4 dirs deep for hardcoded secrets (tests/ excluded to avoid false positives)

## --pro Flag
agentsentry scan local --pro gives a full analyst-grade report for each identity:
- Identity profile with PREA scores
- Plain-English "WHAT IS THIS?" explanation
- Step-by-step attacker exploit narrative with real commands
- MITRE ATT&CK technique mappings
- Numbered remediation steps with exact commands

## Scoring Details
Cloud credential files get realistic privilege scores (not 1.0 default):
- ~/.aws/credentials → iam:* (P=9.0)
- ~/.kube/config → * (P=10.0)
- ~/.config/gcloud/ → roles/editor (P=9.0)
- ~/.azure/ → Contributor (P=9.0)
- ~/.docker/config.json → docker:root_equivalent (P=10.0)
- ~/.aws/config → no policy (P=1.0, it's profile config not a key file)

## Changelog
v0.2.0: Data-driven least-privilege (scan aws --analyze-usage uses IAM Access Advisor to flag granted-but-unused services, finding NHI-006); continuous monitoring (scan --save + agentsentry diff/history via a local SQLite store); deeper AWS coverage (Secrets Manager, RDS, DynamoDB scanned as crown jewels); managed policies now analyzed by their real documents not just names; explicit Terms/Privacy consent required at signup and CLI activation
v0.1.10: Fix ~/.aws/config over-scoring, fix GCP credential "WHAT IS THIS?" description, exclude tests/ from source scanner, tighten secret pattern to reduce false positives
v0.1.9: Fix --pro crash (Rich markup typo on LOW risk NHIs), escape all credential names in Rich output, block Xbox/Windows consumer tokens from Windows Credential Manager scan, add cloud credential file privilege policies so AWS/GCP/k8s files score correctly instead of flat 2.0 INFO
v0.1.8: Windows Credential Manager + macOS Keychain scan, cross-platform Docker detection, expanded CRED_FILES (Azure, gh CLI, Terraform), preserve provider findings through scorer
v0.1.7: Initial public release — local + cloud scanning, PREA scoring, attack graph, --pro mode

## GitHub
https://github.com/Abhiram-ops/agent-sentry
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
