# AgentSentry — Project Progress Log

**Author:** Abhiram Lanka  
**GitHub:** https://github.com/Abhiram-ops/agent-sentry  
**Website:** https://agent-sentry-beta.vercel.app  
**PyPI:** https://pypi.org/project/nhi-audit/  
**Started:** June 2026  
**Status:** Active Development — v0.1.2 live on PyPI

---

## What Is AgentSentry?

An open-source security tool that discovers every Non-Human Identity (NHI) and AI Agent across cloud environments, builds an attack graph of their access relationships, and scores the blast radius if any identity is compromised.

**The problem it solves:** Enterprises have 45 machine identities (API keys, IAM roles, service accounts, AI agents) for every 1 human identity. Almost none of them are governed. No free tool maps this risk. AgentSentry does.

**The research contribution:** A novel AI-Amplification Factor (A) in the risk scoring model that quantifies how autonomous AI agents multiply the blast radius of a compromised identity. No existing academic framework includes this variable.

---

## The Risk Scoring Model

```
NHI Risk Score = P × R × E × A

P = Privilege Score       (1–10)   How powerful are the permissions?
R = Reachability Score    (1–3)    How accessible is this identity to attackers?
E = Exposure Score        (1–5)    How poor is the credential lifecycle?
A = AI-Amplification      (1–60)   How much does agent autonomy multiply blast radius?

Score ≥ 100  →  CRITICAL
Score ≥ 50   →  HIGH
Score ≥ 20   →  MEDIUM
Score < 20   →  LOW
```

---

## Tech Stack

| Component | Tool | Cost |
|---|---|---|
| Language | Python 3.10+ | Free |
| Graph engine | NetworkX | Free |
| Visualization | Pyvis (interactive HTML) | Free |
| CLI | Click + Rich | Free |
| Cloud scanning | boto3, azure-identity, google-auth, kubernetes | Free |
| Data models | Pydantic v2 | Free |
| Website | Next.js 16, Tailwind, Framer Motion, Three.js | Free |
| Hosting | Vercel (website) + GitHub (code) | Free |
| Package registry | PyPI (nhi-audit) | Free |

**Total cost: $0**

---

## Progress

### ✅ Phase 0 — Foundation
- Project scaffold (`agentsentry/` package structure)
- `pyproject.toml` with all dependencies and optional cloud extras
- CLI entry point via `python -m agentsentry` and `agentsentry` command

### ✅ Phase 1 — Core Engine
- **`core/models.py`** — `NonHumanIdentity`, `Resource`, `Finding`, `ScanResult` with Pydantic v2
- **`core/scorer.py`** — P × R × E × A risk scoring engine
  - Privilege scoring with permission weight table
  - Reachability scoring (internet-facing, cross-account detection)
  - Exposure scoring (rotation staleness, zombie credentials)
  - AI-Amplification Factor (novel — autonomy × tool blast × reversibility)
  - Automatic MITRE ATT&CK technique mapping
  - Finding generation with remediation steps
- **`core/graph.py`** — NHI Attack Graph (NetworkX + Pyvis)
  - Directed graph of NHIs, resources, and access edges
  - `blast_radius()` — computes all reachable nodes and crown jewels from a compromised NHI
  - Interactive HTML visualization output

### ✅ Phase 2 — Multi-Cloud Provider System
- **Plugin architecture** — `BaseProvider` ABC, each cloud is an independent plugin
- **`providers/local.py`** — Scans local machine with zero credentials
  - Environment variable secret detection
  - `.env` file scanning
  - SSH key inspection (passphrase check + permissions)
  - Cloud credential files (~/.aws, ~/.kube, ~/.config/gcloud, etc.)
  - Docker socket exposure
  - Git credential store detection
  - **Source file scanner** — scans `.py/.js/.ts/.yaml/.json/.tf` for hardcoded secrets (API keys, passwords, tokens, AWS keys, GitHub PATs, OpenAI keys)
  - Depth-limited (4 levels), file-capped (300 files), skips node_modules/AppData/Windows
- **`providers/aws.py`** — IAM roles, users, access keys, Lambda, S3, cross-account trusts
- **`providers/azure.py`** — Managed Identities, Service Principals, role assignments
- **`providers/gcp.py`** — Service Accounts, downloaded SA key files, project IAM
- **`providers/github.py`** — PATs, deploy keys, Actions secrets, org secrets
- **`providers/k8s.py`** — ServiceAccounts, ClusterRoleBindings, automount exposure

### ✅ Phase 3 — Scanners
- **`scanners/mock.py`** — Full multi-cloud demo (15 NHIs across AWS/Azure/GCP/GitHub/K8s/Local, 2 AI agents, 6 crown jewel resources, pre-built attack edges)
- **`scanners/aws.py`** — Live AWS IAM scanner
- **`scanners/langchain_scanner.py`** — Static AST analysis for LangChain/CrewAI/AutoGen agents

### ✅ Phase 4 — CLI (Gen-Z Redesign v0.1.2)
- Sleek inline banner with `⬡ AGENTSENTRY` header
- Color-coded risk dots and on-color badges (`CRITICAL`, `HIGH`, etc.)
- Animated `dots2` spinner in neon green (#00ff88)
- `fix →` callout in finding panels
- Clean minimal table (no heavy borders)
- **`agentsentry interactive`** — numbered provider picker with:
  - Shows exactly why each provider isn't ready (no SDK vs no creds)
  - Offers to `pip install nhi-audit[provider]` inline
  - Shows exact setup command (az login, aws configure, etc.)
  - Asks for scan path interactively
- **`agentsentry --install-path`** — permanently adds Scripts to Windows PATH

### ✅ Phase 5 — AI Agent Scanner
- Static analysis for LangChain/CrewAI/AutoGen agent definitions
- Extracts tools, autonomy level, memory config, max_iterations via Python AST
- Computes AI-Amplification Factor from real code — no imports, no execution
- CRITICAL (fully autonomous + irreversible tools), HIGH (semi-autonomous), MEDIUM (read-only)

### ✅ Phase 6 — Threat Intelligence
- CISA KEV feed integration (1,610 known exploited vulnerabilities)
- Correlates findings against actively exploited CVEs
- Flags ransomware-linked vulnerabilities
- `--enrich` flag on any scan command

### ✅ Phase 7 — Website (agent-sentry-beta.vercel.app)
- Next.js 16 + Tailwind + Framer Motion + Three.js
- Sections: Navbar, Hero (3D Three.js attack graph), Stats, Providers, HowItWorks, Features, Pricing, Research, Footer
- **3D Attack Graph** — 15 floating nodes (AWS/Azure/GCP/GitHub/K8s/AI agents), orbit+zoom+click, node detail panel with MITRE techniques and remediations
- **P×R×E×A Risk Calculator** — 4 live sliders, color-coded score, 5 real-world presets
- **AI Chatbot** — Claude Haiku powered, fetches live codebase from GitHub (README, cli.py, scorer.py, models.py, providers), streams responses, full-screen on mobile
- **Cursor trail** — neon green particle trail
- **`/docs` page** — full documentation with sticky sidebar, copy-paste commands for all providers
- Deployed on Vercel (auto-deploys on git push)

### ✅ Phase 8 — PyPI Publication
- Package name: `nhi-audit` (pypi.org/project/nhi-audit)
- Current version: 0.1.2
- Install command: `pip install nhi-audit`
- Provider extras: `pip install nhi-audit[aws|azure|gcp|github|k8s|all-clouds]`
- CLI entry point: `agentsentry` (or `python -m agentsentry`)

### ✅ Phase 9 — Standalone Executable
- `build_exe.py` — PyInstaller build script for single-file exe
- GitHub Actions `release.yml` — auto-builds on git tag push:
  - `agentsentry-windows.exe`
  - `agentsentry-macos`
  - `agentsentry-linux`
- Users can download and run with zero Python installation

### ⬜ Phase 10 — arXiv Submission
- Paper ready: `paper/agentsentry_paper.tex` (IEEE format, 4 pages)
- Novel contribution: AI-Amplification Factor (no prior paper defines this)
- Target: cs.CR category
- Status: Ready to submit — needs arXiv account

### ⬜ Phase 11 — Product Launch
- Product Hunt (schedule Tuesday 12:01am PST)
- Hacker News "Show HN"
- Reddit: r/netsec, r/devops, r/aws, r/MachineLearning
- LinkedIn technical post on AI-Amplification Factor
- Dev.to / Medium article

---

## Commands Reference

```bash
# Install
pip install nhi-audit                    # core (local scanner included)
pip install nhi-audit[aws]               # + AWS
pip install nhi-audit[azure]             # + Azure
pip install nhi-audit[gcp]               # + GCP
pip install nhi-audit[github]            # + GitHub
pip install nhi-audit[k8s]              # + Kubernetes
pip install nhi-audit[all-clouds]        # everything

# Fix PATH on Windows (run once)
python -m agentsentry --install-path

# Interactive mode (recommended for new users)
agentsentry interactive

# Scan specific providers
agentsentry scan mock                    # demo, no credentials
agentsentry scan local                   # this machine
agentsentry scan local --path ./myproject  # specific directory
agentsentry scan aws
agentsentry scan azure
agentsentry scan gcp
agentsentry scan github --org myorg
agentsentry scan k8s --namespace production
agentsentry scan agents --path ./myproject  # AI agent code
agentsentry scan all                     # auto-detect + scan all ready

# Provider management
agentsentry providers                    # check what's ready
agentsentry permissions aws             # show what permissions needed

# Analysis
agentsentry blast "ml-pipeline-executor"  # blast radius for specific NHI
agentsentry scan mock --visualize         # generate interactive HTML graph
agentsentry scan aws --enrich            # + CISA KEV threat intel
agentsentry scan aws --json              # JSON output for integrations
```

---

## Provider Auth Setup

| Provider | Command | Env Vars (alternative) |
|----------|---------|----------------------|
| AWS | `aws configure` | `AWS_ACCESS_KEY_ID` + `AWS_SECRET_ACCESS_KEY` |
| Azure | `az login` | `AZURE_TENANT_ID` + `AZURE_CLIENT_ID` + `AZURE_CLIENT_SECRET` |
| GCP | `gcloud auth application-default login` | `GOOGLE_APPLICATION_CREDENTIALS` |
| GitHub | — | `GITHUB_TOKEN` |
| K8s | `kubectl config use-context <name>` | `KUBECONFIG` |
| Local | Nothing needed | — |

---

## The Demo Flow (5 minutes)

1. `agentsentry scan mock` → show 15 NHIs across all clouds, CRITICAL AI agent
2. Open `agentsentry_graph.html` → show interactive attack graph
3. `agentsentry blast "local/langchain-crm-agent"` → blast radius to crown jewel
4. `agentsentry interactive` → show the provider picker UX
5. Explain the AI-Amplification Factor — why it's novel, why it matters in 2026

---

## Key Design Decisions

| Decision | Rationale |
|---|---|
| Plugin provider architecture | Each cloud is independent — install only what you need |
| Python over Go/Rust | Fastest iteration, richest security tooling ecosystem |
| NetworkX over Neo4j | Zero install friction, pure Python, sufficient for MVP scale |
| Pydantic v2 models | Free validation, serialization, type safety |
| Click + Rich CLI | Professional terminal output, Gen-Z aesthetic |
| Depth-limited local scanner | Prevents hanging on large home directories |
| Mock with all 6 providers | Demo without any credentials — lowers barrier to try |
| AI-Amplification as multiplier | Mathematically shows compounding risk |
| Always-CRITICAL for AdminAccess | Admin = unconditional max privilege |
| PyInstaller standalone exe | Zero-friction install for non-Python users |

---

## One-Line Pitch

> "AgentSentry is the first open-source tool that discovers and risk-scores every machine identity and AI agent across AWS, Azure, GCP, GitHub, and Kubernetes — and shows you exactly what an attacker can reach if any of them are compromised."

---

## Resources

- MITRE ATT&CK: https://attack.mitre.org
- CISA KEV Catalog: https://www.cisa.gov/known-exploited-vulnerabilities-catalog
- OWASP Top 10 for LLMs: https://owasp.org/www-project-top-10-for-large-language-model-applications/
- AWS IAM Best Practices: https://docs.aws.amazon.com/IAM/latest/UserGuide/best-practices.html

---

*Last updated: June 4, 2026 — v0.1.2*
