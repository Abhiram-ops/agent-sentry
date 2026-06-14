# AgentSentry — Technical & Product Report

**Version covered:** v0.1.7 (PyPI package `nhi-audit`)
**Report date:** 2026-06-14
**Author/maintainer:** Abhiram Lanka
**Repository:** [github.com/Abhiram-ops/agent-sentry](https://github.com/Abhiram-ops/agent-sentry)
**License:** AGPL-3.0-or-later
**Live site:** agentsentry.org

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Software Requirements Specification](#2-software-requirements-specification)
3. [Implementation Overview](#3-implementation-overview)
4. [System Architecture](#4-system-architecture)
5. [CLI Core Engine: Models, Scoring & Graph](#5-cli-core-engine-models-scoring--graph)
6. [CLI Scanners & Providers](#6-cli-scanners--providers)
7. [CLI Commands, Licensing & Distribution](#7-cli-commands-licensing--distribution)
8. [Web Application — Frontend](#8-web-application--frontend)
9. [Web Application — Backend & API](#9-web-application--backend--api)
10. [Database Schema](#10-database-schema)
11. [Authentication & Sessions](#11-authentication--sessions)
12. [Billing & Monetization](#12-billing--monetization)
13. [Security Posture](#13-security-posture)
14. [Email Infrastructure](#14-email-infrastructure)
15. [Infrastructure & Deployment](#15-infrastructure--deployment)
16. [Testing](#16-testing)
17. [Research Paper Summary](#17-research-paper-summary)
18. [Version History & Timeline](#18-version-history--timeline)
19. [Known Issues, Tech Debt & Roadmap](#19-known-issues-tech-debt--roadmap)
20. [Appendix](#20-appendix)

---

## 1. Executive Summary

**AgentSentry** is an open-source security auditing platform that discovers, inventories, and risk-scores **Non-Human Identities (NHIs)** — IAM roles, API keys, service accounts, SSH keys, GitHub secrets, Kubernetes service accounts, and **autonomous AI agents** (LangChain, CrewAI, AutoGen) — across AWS, Azure, GCP, GitHub, Kubernetes, and local developer machines.

The product consists of three parts:

| Component | Description |
|---|---|
| **CLI** (`pip install nhi-audit`) | Python tool that scans environments, builds an attack graph, and scores every identity with a novel **Privilege × Reachability × Exposure × AI-Amplification (PREA)** formula. Free and open source (AGPL-3.0). |
| **Web platform** (agentsentry.org) | Next.js marketing site + authenticated dashboard for account management, CLI activation, credit-based billing, and Pro license upgrades. |
| **Research paper** | An IEEE-format paper formalizing the PREA model and its novel "AI-Amplification Factor," currently under arXiv review. |

**Core thesis:** organizations have roughly **45 machine identities for every human identity**, and almost none of them are governed the way human accounts are. AI agents make this worse because their risk scales with both *privilege* and *autonomy* — a compromised credential in the hands of a fully autonomous agent can be exploited repeatedly, at machine speed, with no human checkpoint.

**Current status (v0.1.7):** Core scanning engine, 6 providers (mock/AWS/Azure/GCP/GitHub/K8s/local), AI-agent static analyzer, CISA KEV threat-intel enrichment, attack-graph visualization, Pro analyst-report output, dual-tier (Free/Pro) licensing with online + offline activation, and a fully redesigned (light-theme) web dashboard with magic-link auth, Stripe/Gumroad billing, Postgres-backed rate limiting, and a "Blast Radius" newsletter (Beehiiv) for ongoing community building.

---

## 2. Software Requirements Specification

### 2.1 Purpose & Scope

AgentSentry exists to close the **Non-Human Identity governance gap**: human IAM is reviewed, rotated, and monitored; machine credentials (especially those handed to AI agents) typically are not. The system must:

- Discover every machine identity across supported environments without requiring destructive or write-level cloud permissions.
- Quantify the risk of each identity using a reproducible, explainable formula.
- Visualize how a compromised identity could be used to reach sensitive ("crown jewel") resources.
- Distribute as a free CLI to maximize adoption, with an optional paid tier for deeper analyst-grade output.
- Provide a web presence for account management, licensing, and community growth (newsletter, docs).

### 2.2 Target Users

| Persona | Need |
|---|---|
| **Security engineer** at a startup (Series B/C, 50-500 employees) | Quick, credential-light audit of cloud IAM sprawl without an enterprise CIEM contract. |
| **DevOps/platform engineer** who owns security part-time | A `pip install` tool that runs in CI or locally, no SaaS onboarding. |
| **AI/LLM application developer** (LangChain/CrewAI/AutoGen) | Visibility into what permissions their agents *actually* hold vs. what they need. |
| **Academic/researcher** | A reproducible, citable risk model for NHI/agent security. |

### 2.3 Functional Requirements

**CLI**
- FR-1: Scan AWS, Azure, GCP, GitHub, Kubernetes, and the local filesystem for NHIs without requiring write permissions.
- FR-2: Statically analyze Python source trees for LangChain/CrewAI/AutoGen agent definitions and infer their tool access and autonomy level.
- FR-3: Score every discovered identity using the PREA formula and assign a severity (CRITICAL/HIGH/MEDIUM/LOW/INFO).
- FR-4: Build a directed attack graph (including AI-agent lateral-movement edges) and compute "blast radius" — the set of crown-jewel resources reachable from a compromised identity, plus the cheapest attack path to each.
- FR-5: Enrich CRITICAL/HIGH findings with live CISA Known Exploited Vulnerabilities (KEV) data.
- FR-6: Export results as JSON for SIEM/SOAR ingestion, and render an interactive HTML attack-graph visualization.
- FR-7: Gate features by license tier (Free vs. Pro), with both online (server-validated) and offline (HMAC) activation.
- FR-8: Provide a guided `interactive` mode that detects which providers are usable in the current environment.

**Web platform**
- FR-9: Allow visitors to sign up with just an email (no password) and immediately receive an API key + CLI activation code.
- FR-10: Support magic-link login for returning users.
- FR-11: Allow CLI activation codes to be validated server-side (`/api/cli/activate`) and tier (free/pro) to be checked.
- FR-12: Support credit-based pay-as-you-go billing (Stripe) and one-time Pro license upgrades (Stripe checkout, dev-approval code, or Gumroad).
- FR-13: Provide a dashboard showing account profile, credit balance/history, and CLI activation status.
- FR-14: Provide marketing pages (landing, docs, pricing, contact) and a newsletter signup that integrates with Beehiiv.

### 2.4 Non-Functional Requirements

| Category | Requirement |
|---|---|
| **Cost-of-entry** | CLI must run with **zero cloud credentials** in `scan mock` / `scan local` modes — first-run experience cannot require setup. |
| **Least privilege** | All cloud provider scans must be achievable with **read-only** permissions; this is documented per-provider (`agentsentry permissions <provider>`). |
| **Portability** | CLI supports Python ≥3.10 on Windows/macOS/Linux; standalone executables are also distributed via GitHub Releases for users without Python. |
| **Resilience** | License activation must degrade gracefully — if the activation API is unreachable, legacy keys fall back to offline HMAC validation rather than blocking the user. |
| **Privacy** | Local scan output is never transmitted to AgentSentry's servers; only license/activation metadata touches the network. |
| **Security (web)** | Standard security headers (CSP, HSTS, X-Frame-Options, etc.), IP-based rate limiting on public-facing endpoints, httpOnly/secure session cookies, anti-enumeration on login. |
| **Extensibility** | New cloud providers/scanners register via a lazy `ProviderRegistry` so missing SDKs don't break the CLI. |
| **License compliance** | Entire codebase is AGPL-3.0-or-later; any hosted derivative must share modifications. |

### 2.5 Out of Scope (current version)

- Continuous/scheduled monitoring (originally roadmapped as "AgentSentry Cloud" SaaS, not yet built).
- Write-access remediation automation (the tool *recommends* remediation steps but does not apply them).
- Account disablement / GDPR data-export self-service (schema column exists but no implementing route yet).

---

## 3. Implementation Overview

### 3.1 Technology Stack at a Glance

| Layer | Technology |
|---|---|
| CLI language/runtime | Python ≥3.10 |
| CLI core libraries | `pydantic` (data models), `networkx` (attack graph), `pyvis` (graph visualization), `click` (CLI framework), `rich` (terminal UI), `httpx` (HTTP), `jinja2` (templating) |
| Cloud SDKs (optional extras) | `boto3` (AWS), `azure-identity` + `azure-mgmt-*` (Azure), `google-auth` + `google-api-python-client` (GCP), `requests` (GitHub), `kubernetes` (K8s) |
| Packaging | `setuptools`, published to PyPI as `nhi-audit`, console entry point `agentsentry` |
| Web framework | Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS v4 |
| Web animation/UI | Framer Motion, Radix UI primitives, Lucide icons, custom design-token CSS |
| Web database | Vercel Postgres |
| Web email | Resend (primary), Nodemailer/Gmail (Gumroad path) |
| Web payments | Stripe (checkout + webhooks), Gumroad (webhook) |
| Web AI assistant | Groq (`llama-3.1-8b-instant`) via `/api/chat` |
| Newsletter | Beehiiv ("Blast Radius by AgentSentry") |
| Hosting | Vercel (frontend), GitHub (source, CI, releases), PyPI (package distribution) |
| CI/CD | GitHub Actions (`.github/workflows/ci.yml`) |

### 3.2 Installation & Quick Start (CLI)

```bash
# Core install (includes local scanner, no cloud SDKs)
pip install nhi-audit

# With specific cloud provider support
pip install "nhi-audit[aws]"
pip install "nhi-audit[all-clouds]"   # aws + azure + gcp + github + k8s

# Windows PATH fix if `agentsentry` isn't found
python -m agentsentry --install-path
```

Zero-credential first run:

```bash
agentsentry scan mock          # synthetic multi-cloud demo data
agentsentry scan local         # scans your machine for secrets/keys
agentsentry interactive        # guided wizard — detects ready providers
```

Real-world usage:

```bash
agentsentry scan aws --visualize --enrich
agentsentry scan github --org my-org --enrich
agentsentry scan agents --path ./my-project   # LangChain/CrewAI/AutoGen analysis
agentsentry blast "prod-sre-copilot" --provider aws --output-json findings.json
agentsentry providers                          # readiness check for all providers
agentsentry permissions aws                    # shows required IAM permissions
agentsentry activate AS-XXXX-XXXX-XXXX-XXXX     # unlock Pro features
```

### 3.3 Project Repository Layout (high level)

```
agent-sentry/
├── agentsentry/              # Canonical Python package source (published to PyPI)
│   ├── agentsentry/
│   │   ├── cli.py            # Click CLI entry point
│   │   ├── license.py        # Activation / tier enforcement
│   │   ├── core/              # models.py, scorer.py, graph.py, pro_output.py
│   │   ├── providers/         # aws, azure, gcp, github, k8s, local + registry
│   │   ├── scanners/           # per-provider scan logic + mock + langchain_scanner
│   │   ├── enrichment/         # cisa_kev.py
│   │   └── reporting/          # templates
│   ├── tests/                  # pytest suite
│   └── pyproject.toml          # package metadata, version 0.1.7
├── frontend/                  # Live Next.js app deployed to agentsentry.org
│   ├── src/app/                # pages + API routes (App Router)
│   ├── src/components/         # layout/, sections/, ui/, graphics/
│   ├── src/lib/                 # db.ts, auth.ts, email.ts, rateLimit.ts, stripe.ts
│   └── migrations/              # 001-004 SQL migrations
├── paper/                     # IEEE LaTeX research paper
├── .github/workflows/ci.yml   # CI: pytest + black + ruff, matrix Py 3.10-3.12
├── LICENSE                    # AGPL-3.0 (stub + link to full text)
└── README.md
```

> **Note:** the repo also contains legacy/unported mirror copies (`agentsentry/website/`, `agentsentry/frontend/`, root-level `website/`). These are not part of the deployed product and are excluded from this report except where flagged as cleanup candidates (§19).

---

## 4. System Architecture

```
┌────────────────────────────┐        ┌──────────────────────────────────┐
│   Local machine / CI runner │        │            agentsentry.org         │
│                              │        │           (Vercel, Next.js)        │
│  ┌────────────────────────┐ │ HTTPS  │  ┌──────────┐   ┌───────────────┐ │
│  │  agentsentry CLI        │◄┼────────┼─►│ /api/cli  │   │ /api/auth/*    │ │
│  │  (pip install nhi-audit)│ │ activate│  │ /activate │   │ login, signup  │ │
│  │                          │ │         │  └─────┬─────┘   │ verify-email   │ │
│  │  providers/  scanners/   │ │         │        │          └──────┬────────┘ │
│  │  core/models, scorer,    │ │         │        ▼                 ▼          │
│  │       graph, pro_output  │ │         │  ┌─────────────────────────────┐   │
│  │  enrichment/cisa_kev      │ │         │  │   Vercel Postgres            │   │
│  │  ~/.agentsentry/          │ │         │  │   users, sessions, credits,  │   │
│  │     license.json (0600)   │ │         │  │   rate_limit_events, ...     │   │
│  └────────────────────────┘ │         │  └─────────────────────────────┘   │
│           │                  │        │        ▲                 ▲          │
│           ▼                  │        │  ┌──────┴──────┐   ┌─────┴────────┐ │
│  AWS / Azure / GCP / GitHub /│        │  │ Stripe       │   │ Resend /      │ │
│  Kubernetes / local files     │        │  │ Gumroad      │   │ Nodemailer    │ │
│  (read-only API calls)        │        │  └─────────────┘   └──────────────┘ │
└────────────────────────────┘        └──────────────────────────────────┘
```

**Two largely independent systems** share only two contracts:
1. **License activation contract** — the CLI's `agentsentry activate <code>` calls `POST /api/cli/activate`, which looks up `users.activation_code` and returns `{tier, email, activated}`.
2. **Branding/identity contract** — both surfaces present the same PREA model, severity bands, and MITRE ATT&CK mappings (CLI computes them; the website's `RiskCalculator`/`AttackGraphVisualizer`/`HeroTerminal` demo them).

Everything else (scanning, scoring, graph-building, KEV enrichment) happens entirely client-side in the CLI — **no scan data is ever sent to AgentSentry's servers**.

---

## 5. CLI Core Engine: Models, Scoring & Graph

All core logic lives under `agentsentry/agentsentry/core/`.

### 5.1 Data Models (`core/models.py`)

**Enums**
- `NHIType`: `IAM_ROLE`, `IAM_USER_KEY`, `MANAGED_IDENTITY`, `SERVICE_PRINCIPAL`, `GCP_SERVICE_ACCOUNT`, `WORKLOAD_IDENTITY`, `K8S_SERVICE_ACCOUNT`, `SERVICE_ACCOUNT`, `API_KEY`, `OAUTH_TOKEN`, `SSH_KEY`, `GITHUB_SECRET`, `DEPLOY_KEY`, `AI_AGENT`, `UNKNOWN`
- `AutonomyLevel`: `HUMAN_IN_LOOP`, `SEMI_AUTONOMOUS`, `FULLY_AUTONOMOUS`
- `RiskLevel`: `CRITICAL`, `HIGH`, `MEDIUM`, `LOW`, `INFO`
- `CloudProvider`: `AWS`, `AZURE`, `GCP`, `GITHUB`, `K8S`, `LOCAL`

**Key constants**
- `ZOMBIE_CREDENTIAL_THRESHOLD_DAYS = 180` — single source of truth for "active but unused" credential detection.
- `NO_ROTATION_GOVERNANCE_POLICY = "local:no-rotation-governance"` — sentinel for local findings with no rotation mechanism (e.g., plaintext `.env`, unencrypted SSH keys).

**`NonHumanIdentity`** (the core node type) — fields include identity/lifecycle metadata (`created_date`, `last_used`, `last_rotated`), permission data (`attached_policies`, `inline_policies`, `trust_policy`, `is_cross_account`, `is_internet_facing`), AI-agent fields (`autonomy_level`, `agent_tools`, `has_memory`, `source_file`), and computed scores (`privilege_score`, `reachability_score`, `exposure_score`, `ai_amplification_factor`, `risk_score`, `risk_level`, `findings`, `mitre_techniques`). Helper methods: `days_since_last_rotation()`, `days_since_last_use()`, `is_stale(threshold_days=180)`.

**`Resource`** — represents a scanned asset (bucket, dataset, namespace, etc.) with `is_crown_jewel`, `sensitivity_tags`, `is_public`.

**`Finding`** — a single security finding: `finding_id`, `title`, `description`, `risk_level`, `mitre_techniques`, `remediation`, `evidence`.

**`ScanResult`** — top-level container: `scan_id`, `timestamp`, `provider`, `account_id`, `nhis[]`, `resources[]`, with computed `total_nhis`, `critical_count`, `high_count`, `ai_agent_count`.

### 5.2 The PREA Risk Scoring Engine (`core/scorer.py`)

```
Risk(i) = P(i) × R(i) × E(i) × A(i)
```

| Factor | Meaning | Range |
|---|---|---|
| **P** — Privilege | How much access the identity's permissions grant | 1.0 – 10.0 |
| **R** — Reachability | How exposed/reachable the identity is | 1.0 – 3.0 |
| **E** — Exposure | Governance hygiene (rotation, staleness) | 1.0 – 5.0 |
| **A** — AI-Amplification | How much an autonomous agent multiplies the blast radius | 1.0 – 60.0 |

**Privilege (P)**
- Driven by `PERMISSION_WEIGHTS` lookup tables for AWS actions/managed policies (e.g., `iam:*` = 9.0, `iam:CreateUser` = 8.0, `s3:GetObject` = 1.0, wildcard `*` = 10.0), Azure RBAC roles (`Owner` = 10.0 … `Reader` = 1.5), GCP roles (`roles/owner` = 10.0 … `roles/viewer` = 1.5), and `GITHUB_SCOPE_WEIGHTS` (`admin:enterprise` = 10.0 … `read:org` = 4.0).
- `ALWAYS_CRITICAL_POLICIES = {AdministratorAccess, PowerUserAccess}` → privilege score short-circuits to 10.0.
- Cross-account identities get a **1.5× multiplier**.
- Final score clamped to `min(score, 10.0)`.

**Reachability (R)**
- Internet-facing → 3.0; GitHub secrets/API keys → 2.0; AI agents → 2.5; otherwise (internal-only) → 1.0.

**Exposure (E)**
- Identities with `NO_ROTATION_GOVERNANCE_POLICY` → exposure ceiling of 5.0.
- Otherwise starts at 1.0 and multiplies: never rotated ×3.0, rotated >365 days ago ×2.5, >90 days ×1.75.
- **Zombie credential**: unused for >180 days → ×1.5.
- No governance metadata at all → ×1.25.
- Clamped to `min(score, 5.0)`.

**AI-Amplification (A)** — *the novel contribution*
```
A = autonomy_weight × max_tool_blast_score × reversibility_factor
```
- `autonomy_weights`: HUMAN_IN_LOOP = 1.0, SEMI_AUTONOMOUS = 2.0, FULLY_AUTONOMOUS = 4.0.
- `TOOL_BLAST_SCORES`: e.g. `execute_code`/`deploy` = 5.0, `transfer_funds` = 6.0, `delete_record` = 4.0, `send_email` = 3.0, read-only tools (`search_web`, `read_file`) = 1.0.
- `IRREVERSIBLE_TOOLS = {send_email, delete_record, transfer_funds, deploy, execute_code, send_slack_message}` → if any present, `reversibility_factor = 2.5`, else `1.0`.
- For any non-AI-agent identity, `A = 1.0`.

**Overrides & severity bands**
- **Admin override**: any identity with `AdministratorAccess`/`PowerUserAccess` → `risk_score = max(risk_score, 100.0)` (forces CRITICAL).
- **Pure-AI-agent cap**: an AI agent with *no* cloud permissions and not fully autonomous → `risk_score = min(risk_score, 99.0)` (caps at top of HIGH).
- **Severity bands**: ≥100 CRITICAL · ≥50 HIGH · ≥20 MEDIUM · ≥5 LOW · else INFO.

**Built-in findings catalog**

| ID | Title | Trigger | Severity | MITRE |
|---|---|---|---|---|
| NHI-001 | Over-Privileged Identity | `privilege_score ≥ 8.0` | CRITICAL (≥9.0) / HIGH | T1078.004 |
| NHI-002 | Credential Never Rotated / Overdue | no rotation or >365 days | HIGH | T1528 |
| NHI-003 | Zombie Credential — Active but Unused | `is_stale(180)` | MEDIUM | T1078 |
| NHI-004 | Fully Autonomous AI Agent, Irreversible Tools, No Human Gate | `AI_AGENT` + `FULLY_AUTONOMOUS` + irreversible tool | CRITICAL | T1651, T1059 |
| NHI-005 | Cross-Account Trust Relationship | `is_cross_account` | HIGH | T1199 |

### 5.3 Attack Graph & Blast Radius (`core/graph.py`)

`NHIAttackGraph` wraps a `networkx.DiGraph`:

- **Nodes**: `"nhi"` (colored/sized by risk level — CRITICAL `#e74c3c`, HIGH `#e67e22`, MEDIUM `#f1c40f`, LOW `#2ecc71`, INFO `#95a5a6`) and `"resource"` (purple `#8e44ad` if crown jewel, else blue `#2980b9`).
- **Access edges**: `add_access_edge(from, to, permission, weight)` — weight represents **attack-path cost** (lower = easier).
- **Lateral-movement edges** (NHI → NHI): `build_lateral_movement_edges()` parses each identity's `trust_policy` for `sts:AssumeRole`-style statements, resolves assumable ARNs (exact match, account-root wildcard, or service principal), and adds edges with `edge_type="lateral_movement"` and a fixed **weight of 0.3** — documented as "one of the cheapest, most dangerous pivots available" (a single API call).
- **`blast_radius(nhi_id)`**: returns all reachable nodes (`nx.descendants`), identifies which are crown jewels, computes the cheapest `nx.shortest_path` to each crown jewel by edge weight, and returns a `blast_radius_score = reachable_count × max(crown_jewels_count, 1)`.
- **`top_risk_nhis(n)`**: top-N identities by risk score.
- **`visualize()`**: renders an interactive dark-themed HTML graph via Pyvis (`forceAtlas2Based` physics).

---

## 6. CLI Scanners & Providers

### 6.1 Provider Registry (`providers/`)

`ProviderRegistry` lazily registers six providers (`mock`/`aws`/`azure`/`gcp`/`github`/`k8s`/`local`); each import is isolated so a missing SDK silently disables only that provider. `registry.detect()` returns a `PermissionStatus` (ready / missing SDK / missing credentials / missing permissions) for every provider, and `registry.detect_ready()` filters to usable ones for `scan all`.

### 6.2 Provider Summaries

| Provider | Credential source | Required permissions (read-only) | What it finds |
|---|---|---|---|
| **AWS** | env vars → named profile → instance role | `iam:List*`, `iam:GetRole`, `sts:GetCallerIdentity`, `s3:ListAllMyBuckets`, `lambda:ListFunctions`, `secretsmanager:ListSecrets` | IAM roles (skips service-linked roles), IAM user access keys, S3 buckets (public-ACL detection, crown-jewel heuristics), Lambda functions, cross-account trust relationships |
| **Azure** | `DefaultAzureCredential` (az login / SP env / managed identity) | `roleAssignments/read`, `roleDefinitions/read`, managed-identity & subscription read, optional Graph `Directory.Read.All` | Managed identities, service principals (via aggregated role assignments), Key Vaults/Storage Accounts/Resource Groups as resources |
| **GCP** | ADC / service-account key file / metadata server | `iam.serviceAccounts.list`, `iam.serviceAccountKeys.list`, `resourcemanager.projects.getIamPolicy`, `storage.buckets.list`, `bigquery.datasets.get` | Service accounts + keys (age-based rotation tracking), full project IAM policy per SA, GCS buckets, BigQuery datasets |
| **GitHub** | `GITHUB_TOKEN` env var, optional `GITHUB_ORG` | token scopes via `X-OAuth-Scopes` header | The PAT itself (as an `API_KEY` NHI), SSH/GPG keys, owned repos (crown jewel if private), per-repo deploy keys (HIGH if read/write), org Actions secrets |
| **Kubernetes** | in-cluster config or kubeconfig context | read access to ServiceAccounts/ClusterRoleBindings/Namespaces | ServiceAccounts (flags `automountServiceAccountToken: true`), ClusterRoleBindings to `cluster-admin`/`admin`/`system:masters` (CRITICAL/HIGH), namespaces as resources (crown jewel if `kube-system`/`production`/`prod`) |
| **Local** | none required | filesystem read | Env-var secrets (regex-based, AWS key pattern escalates to CRITICAL), `.env*` files, unencrypted SSH keys, cloud credential files (`~/.aws/credentials`, `~/.kube/config`, `~/.docker/config.json`, `~/.netrc`, etc.), Docker socket access (root-equivalent), git-credential store, hardcoded secrets in source (API keys, AWS keys `AKIA...`, GitHub PATs `ghp_...`, OpenAI keys `sk-...`) |

### 6.3 AI Agent Scanner (`scanners/langchain_scanner.py`)

A static AST analyzer — described internally as "the academically novel" component:

- Walks `.py` files (skipping `venv`/`node_modules`/etc.), parses with Python's `ast` module, and recognizes agent constructors across **LangChain** (`AgentExecutor`, `initialize_agent`, `create_react_agent`, …), **CrewAI** (`Agent`, `Crew`, `Task`), and **AutoGen** (`AssistantAgent`, `ConversableAgent`, `GroupChat`, …).
- Ambiguous class names (`Agent`, `Task`, `Crew` — also used by e.g. Celery) require either a framework import or matching constructor kwargs before being counted, to avoid false positives.
- Maps framework-specific tool *classes* (e.g. CrewAI's `SerperDevTool`, `CodeInterpreterTool`) to canonical tool names so the `TOOL_BLAST_SCORES` table applies correctly. Extended blast scores for static analysis include `bash`/`shell`/`terminal` = 5.5, `stripe_charge` = 6.0, `push_to_github` = 4.5.
- **Autonomy assessment**: explicit `human_input_mode` (`NEVER`→FULLY_AUTONOMOUS, `ALWAYS`→HUMAN_IN_LOOP) takes precedence; presence of `human_approval`/`require_approval`/`confirm_before_run` params → human-gated; CrewAI `Process.hierarchical`/`allow_code_execution`/`allow_delegation` and AutoGen's `code_execution_config`/decorator-based tool registration (`register_for_llm`, `register_function`) are all parsed to build each agent's tool list and autonomy level.

### 6.4 Mock Scanner (`scanners/mock.py`)

A realistic, fully synthetic 13-NHI demo dataset spanning all 5 cloud surfaces plus 2 AI agents (`agent-crm-langchain`, FULLY_AUTONOMOUS with `delete_record`/`send_email`/`update_database` tools, and `agent-email-drafter`, SEMI_AUTONOMOUS), 6 crown-jewel resources, and 11 hardcoded attack-graph edges — used by `scan mock`, the website's `HeroTerminal` demo data, and as the zero-credential "try it now" path.

### 6.5 Threat Intel Enrichment (`enrichment/cisa_kev.py`)

`CISAKEVEnricher` pulls the **CISA Known Exploited Vulnerabilities catalog** (free, no auth) and caches it locally for 24 hours (`~/.agentsentry/kev_cache.json`). It maps each identity's MITRE techniques to KEV product keywords (e.g., `T1078.004` → `iam`/`okta`/`azure ad`/`identity`), attaches matching CVEs as `KEV-<CVE-ID>` findings (CRITICAL if ransomware-linked, else HIGH), and **escalates risk scores** beyond the normal heuristic ceilings: HIGH/CRITICAL identities → `max(score, 150.0)`; MEDIUM → `max(score, 60.0)` and bumped to HIGH. Rationale (per code comment): "Active exploitation (KEV) is harder evidence than the heuristic ceiling."

---

## 7. CLI Commands, Licensing & Distribution

### 7.1 Command Reference

| Command | Purpose | Key options |
|---|---|---|
| `agentsentry scan TARGET` | Run a scan against `mock`, `aws`, `azure`, `gcp`, `github`, `k8s`, `agents`, `local`, or `all` | `--visualize`, `--output PATH`, `--path .`, `--enrich`, `--json [PATH]`, `--profile`, `--region`, `--org`, `--namespace`, `--context`, `--force`, `--pro` |
| `agentsentry blast NHI_NAME` | Compute blast radius for a specific identity (case-insensitive substring match) | `--provider TARGET` (default `mock`), `--output-json FILEPATH` |
| `agentsentry interactive` | Guided wizard: detects ready providers, prompts for selection, offers `pip install` for missing SDKs | `--visualize`, `--enrich` |
| `agentsentry providers` | Lists all providers + readiness status + setup hints | — |
| `agentsentry permissions PROVIDER` | Shows required permissions and current readiness for one provider | — |
| `agentsentry activate KEY` | Activates a Free/Pro license key (online, falls back to offline HMAC) | — |

`--pro` invokes `print_pro_report()` (see §7.3) for full attack narratives, MITRE detail, and step-by-step remediation; without it, only a summary table + top CRITICAL/HIGH findings are shown.

### 7.2 Licensing & Activation (`license.py`)

- **Activation flow**: `activate(code)` first tries **online** activation — `POST {AGENTSENTRY_API or https://agent-sentry-beta.vercel.app}/api/cli/activate` with 3 retries (to ride out Vercel cold starts). HTTP 200 → tier from response; 404/4xx → invalid key; 5xx/timeout → raises `NetworkError`, which triggers an **offline HMAC fallback** for legacy keys.
- **Key formats**: `AF-XXXX-XXXX-XXXX-XXXX` (Free, offline HMAC), `AS-XXXX-XXXX-XXXX-XXXX` (Pro, offline HMAC or Gumroad), `AS-FREE-XXXX-XXXX` (server-issued, hex).
- **Offline validation**: base32-decodes the key into a 6-byte HMAC-SHA256 MAC + 4-byte nonce, recomputes the HMAC with a baked-in secret, and compares with `hmac.compare_digest`.
- **Storage**: `~/.agentsentry/license.json`, written with **`chmod 600`** (owner read/write only — a v0.1.7 security fix; no-op on Windows).
- **Tier enforcement** (`enforce(command, target)`): `AGENTSENTRY_SKIP_LICENSE=1` bypasses for CI; unregistered users are blocked with a sign-up prompt; Free tier is restricted to `scan local` and `scan mock` (`FREE_SCAN_TARGETS`); Pro tier allows everything.

### 7.3 Pro Output (`core/pro_output.py`)

For each identity (sorted by risk score), the Pro report renders six panels via Rich:
1. **Identity Profile** — name, type, provider, risk score, source location, policies, rotation/usage age, agent autonomy/tools.
2. **What Is This?** — plain-English explanation per NHI type (with special-cased detection for OpenAI/Stripe-style key prefixes).
3. **How an Attacker Exploits This** — narrative + a difficulty rating (`DIFF_TRIVIAL` <5min, `DIFF_EASY`, `DIFF_MODERATE`, `DIFF_HARD`) with time-to-exploit and tools needed.
4. **MITRE ATT&CK** — technique name + tactic from a 16-entry catalog (e.g., `T1611` = "Escape to Host" / Privilege Escalation).
5. **Vulnerability Detail** — each `Finding`'s title/ID/description.
6. **Step-by-Step Remediation** — type-specific numbered playbooks (e.g., for `K8S_SERVICE_ACCOUNT`: `kubectl auth can-i --list`, disable `automountServiceAccountToken`, apply Pod Security Admission, use projected tokens with `expirationSeconds`, add network policies).

### 7.4 Distribution

- **PyPI**: `nhi-audit`, published via GitHub Actions OIDC trusted publishing (`publish` job, triggered manually via `workflow_dispatch`).
- **Standalone executables** for Windows/macOS/Linux via GitHub Releases (no Python required).
- **Source**: AGPL-3.0-or-later, github.com/Abhiram-ops/agent-sentry.

---

## 8. Web Application — Frontend

The live site (`frontend/`) is a Next.js 16 (App Router) + React 19 + Tailwind v4 application, recently redesigned to a **light-theme, Vercel-inspired aesthetic** (commit `fe90777`).

### 8.1 Pages

| Route | Purpose |
|---|---|
| `/` | Landing page — Navbar, Hero (with live terminal animation), How It Works, Providers, live audit terminal, Features, attack graph demo, Risk Calculator, Methodology, Pricing, Newsletter signup, Contact, Footer |
| `/signup` | Email-only signup; shows issued `api_key` + `activation_code` with copy-to-clipboard; persists API key to `localStorage` |
| `/login` | Magic-link login form, with error display for invalid/expired links |
| `/dashboard` | Authenticated dashboard — profile, credit balance/history, credit packages (Starter 10/$5, Growth 40/$15, Scale 150/$50) |
| `/contact` | Contact form → `/api/contact` |
| `/docs` | CLI documentation with copyable code blocks |

### 8.2 Design System

`globals.css` defines a token-based design system: white/light backgrounds (`--bg: #ffffff`), a blue accent (`--accent: #1d4ed8`), severity colors matching the CLI (`--critical: #f87171`, `--high: #fb923c`, `--medium: #fbbf24`, `--low: #4ade80`), serif headings (Playfair Display) + sans body (DM Sans) + monospace labels (JetBrains Mono), and a dark-navy `.section-dark` variant used for "proof of work" sections (terminal demo, attack graph).

### 8.3 Notable Interactive Components

- **`HeroTerminal.tsx`** — a scripted, looping fake-CLI animation simulating `agentsentry scan aws`: discovers 85 identities, scores them, and surfaces a CRITICAL finding (`prod-sre-copilot`, PREA 1875) with a 14-asset blast radius.
- **`RiskCalculator.tsx`** — interactive P×R×E×A calculator with sliders (P 0-10, R 0-10, E 0-5, A 1-3×) and 5 presets (e.g., "AI CRM Agent" P6 R7 E3 A2.8), gauge max 1500 (10×10×5×3).
- **`AttackGraphVisualizer.tsx`** — interactive SVG graph showing a compromised LangChain agent (`prod-sre-copilot`) pivoting via an over-privileged IAM role to a customer-data S3 bucket (1.4M objects, PII/billing data); clicking a node reveals raw JSON "evidence."
- **`ChatBot.tsx`** — floating assistant widget; `/api/chat` fetches live README/source files from GitHub for context and streams responses from Groq.

> **Known inconsistency**: PREA factor ranges differ slightly across `MethodologySection`, `RiskCalculator`, and `AttackGraphVisualizer` demo data (e.g., A factor shown as 50.0 in one demo vs. a 1-3× slider elsewhere) — cosmetic/marketing-copy drift, not a scoring-engine bug (see §19).

### 8.4 Routing Guard

`frontend/src/proxy.ts` (Next.js 16's renamed `middleware.ts`) matches `/dashboard/:path*` and performs a **cheap presence check** on the `agentsentry_session` cookie — redirecting to `/login?next=<path>` if absent. It deliberately avoids importing `@vercel/postgres` to stay edge-safe; real session validation happens in `/api/user/*` routes.

---

## 9. Web Application — Backend & API

All routes live under `frontend/src/app/api/` (plus `frontend/src/app/auth/callback/` for the magic-link callback).

| Route | Method | Auth | Purpose |
|---|---|---|---|
| `/api/auth/signup` | POST | — | Create account (rate-limited 5/hr/IP), returns `api_key` + `activation_code`, auto-creates session |
| `/api/auth/login` | POST | — | Sends magic-link email (anti-enumeration: same response whether or not account exists) |
| `/api/auth/logout` | POST | session | Deletes session, clears cookie |
| `/api/auth/verify-email` | GET | token | Confirms pending email change |
| `/auth/callback` | GET | token | Consumes magic-link token, creates session, redirects to `/dashboard` |
| `/api/cli/activate` | POST | — | Validates `activation_code`, marks CLI activated, returns `{tier, email}` |
| `/api/billing/create-checkout` | POST | Bearer | Creates Stripe Checkout session for a credit package |
| `/api/billing/upgrade` | POST | Bearer | Upgrades to Pro via Stripe txn verification or `DEV_APPROVAL_CODE` |
| `/api/billing/webhook` | POST | Stripe sig | Handles `checkout.session.completed`, credits the account (idempotent) |
| `/api/gumroad-webhook` | POST | optional HMAC | Generates a deterministic Pro license key for Gumroad buyers, emails via Gmail |
| `/api/validate-key` | POST | — | Cryptographically validates Gumroad-style keys (no DB) |
| `/api/contact` | POST | — | Contact form (rate-limited 3/24h/IP), sends to support@ + auto-reply |
| `/api/subscribe` | POST | — | Subscribes email to Beehiiv + sends welcome email |
| `/api/chat` | POST | — | Streams Groq chat completions with repo-context injection |
| `/api/usage/deduct` | POST | Bearer | Atomically deducts credits for a usage event |
| `/api/user/profile` | GET | session | Returns profile incl. plaintext `api_key` |
| `/api/user/credits` | GET | Bearer | Returns balance, tier, transaction history |
| `/api/user/transactions` | GET | session | Paginated transaction history |
| `/api/user/credentials` | POST | session | Requests an email change (sends verification link) |
| `/api/user/regenerate-api-key` | POST | session | Rotates `api_key`, emails the new key |

### 9.1 Shared Library (`frontend/src/lib/`)

- **`db.ts`** — all Postgres access: user CRUD, activation-code/API-key lookups, credit ledger operations (`deductCredits`, `addCredits` with Stripe-idempotency via `ON CONFLICT DO NOTHING`), credit packages.
- **`auth.ts`** — session/login-token management: `SESSION_COOKIE = 'agentsentry_session'`, 7-day session expiry, 24h login/email-change tokens, `createLoginToken` rate-limited to 5/hour per user.
- **`email.ts`** — Resend wrapper; never throws (logs and returns `false` on failure so email outages don't break signup/login).
- **`rateLimit.ts`** — `checkRateLimit(ip, endpoint, maxRequests, windowMinutes)`, a Postgres sliding-window limiter (no Redis dependency).
- **`stripe.ts`** — lazily-constructed Stripe client (avoids build failures when `STRIPE_SECRET_KEY` is absent).

---

## 10. Database Schema

Vercel Postgres, evolved through 4 migrations.

### `users`
| Column | Type | Notes |
|---|---|---|
| id | SERIAL PK | |
| email | VARCHAR(255) UNIQUE NOT NULL | |
| api_key | VARCHAR(64) UNIQUE NOT NULL | **plaintext** — used as Bearer token |
| credits_balance | NUMERIC(10,2) DEFAULT 0 | |
| tier | VARCHAR(10) DEFAULT 'free' | CHECK IN ('free','pro') |
| activation_code | VARCHAR(64) UNIQUE | indexed |
| is_cli_activated | BOOLEAN DEFAULT FALSE | |
| email_verified, email_verified_at, last_login | | |
| disabled_at | TIMESTAMP nullable | reserved, unused |
| created_at, updated_at | | |

### `credit_packages`
`id, name, credits, price_usd, stripe_price_id` — seeded with Starter (10/$5), Growth (40/$15), Scale (150/$50).

### `credit_transactions`
`id, user_id → users, action, credits_amount, cost_usd, stripe_transaction_id UNIQUE, scan_metadata JSONB, created_at` — indexed on `user_id`; `stripe_transaction_id` uniqueness provides webhook idempotency.

### `login_tokens` (migration 003)
`id, user_id → users, token UNIQUE, expires_at, used_at, created_at` — 24h expiry, single-use.

### `sessions` (migration 003)
`id, user_id → users, session_token UNIQUE, expires_at, created_at` — 7-day expiry, backs `agentsentry_session` cookie.

### `pending_email_changes` (migration 003)
`id, user_id → users, new_email, verification_token UNIQUE, expires_at, created_at` — 24h expiry, only most-recent-per-user retained.

### `rate_limit_events` (migration 004)
`id, ip_address VARCHAR(45), endpoint VARCHAR(255), event_type VARCHAR(50), occurred_at` — indexed `(ip_address, endpoint, occurred_at DESC)`, append-only, ages out via the window predicate (no cleanup job).

---

## 11. Authentication & Sessions

AgentSentry uses **passwordless, magic-link authentication** plus a separate **API-key Bearer system** for CLI/billing access.

**Signup → instant session**: `POST /api/auth/signup` creates the user (with generated `api_key` + `AS-FREE-...` activation code), emails the activation code, and **immediately** creates a session + sets the `agentsentry_session` cookie — no separate login step for new users.

**Returning users**: `POST /api/auth/login` issues a one-time token (max 5/hour per user) and emails a link to `/auth/callback?token=...&email=...`. The callback validates the token (exists, unused, unexpired, email matches), marks it used, records the login (`email_verified`, `last_login`), creates a session, and redirects to `/dashboard`.

**Session validation** is two-layered:
1. **Edge proxy** (`proxy.ts`) — cheap cookie-presence check on `/dashboard/*`.
2. **API routes** (`getSessionUser()`) — full DB lookup against `sessions`, expiry-checked.

**`api_key`** is a 64-char hex string generated at signup, used as `Authorization: Bearer <api_key>` for CLI/billing/usage routes via direct-equality lookup (`getUserByApiKey`). It **must remain plaintext** — the server does no hashing/comparison step, by design, so the CLI and dashboard can both present and display it. It's rotatable via `/api/user/regenerate-api-key`.

**Email changes** require visiting a confirmation link sent to the *new* address (`pending_email_changes`, 24h expiry) before the change applies.

---

## 12. Billing & Monetization

AgentSentry runs **three parallel, loosely-coupled monetization mechanisms**:

### A. Pay-as-you-go credits (Stripe Checkout)
`/api/billing/create-checkout` creates a Stripe Checkout session for a `credit_packages` row; `/api/billing/webhook` (signature-verified) handles `checkout.session.completed` and calls `addCredits()`, incrementing `users.credits_balance` idempotently. Credits are spent via `/api/usage/deduct` (atomic conditional UPDATE, 402 if insufficient).

### B. One-time Pro upgrade
`/api/billing/upgrade` accepts either a verified Stripe transaction ID (`isStripePaymentValid` checks live payment status) or a `DEV_APPROVAL_CODE` (manual/dev bypass). On approval, `upgradeUserToPro()` sets `tier='pro'`, issues a new `AS-PRO-...` activation code, resets `is_cli_activated=FALSE` (forcing re-activation), and emails the new code.

### C. Gumroad → standalone license keys
`/api/gumroad-webhook` receives sale pings, optionally HMAC-verifies via `GUMROAD_PING_SECRET`, and generates a deterministic `AS-XXXX-XXXX-XXXX-XXXX` key from the sale ID using the **same HMAC algorithm as the CLI's `license.py`**. This key is validated purely cryptographically via `/api/validate-key` (no DB row) — **architecturally separate** from the `users.activation_code` system; `/api/cli/activate` does not recognize Gumroad keys.

> **Manual Pro activation** (DB-level, for support purposes):
> ```sql
> UPDATE users SET tier = 'pro' WHERE email = 'user@example.com';
> ```
> The user's existing `activation_code` remains a `free`-tier code unless also regenerated via `upgradeUserToPro()` — for full correctness, prefer calling `/api/billing/upgrade` with the dev approval code over raw SQL.

---

## 13. Security Posture

### 13.1 Implemented (as of commit `c1c1fa7`, 2026-06-13)

- **Security headers** (`frontend/next.config.ts`, applied to all routes): CSP (`default-src 'self'`, `connect-src 'self' https://api.beehiiv.com`, `frame-ancestors 'none'`, `upgrade-insecure-requests`), `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy: camera=(), microphone=(), geolocation=()`, `Strict-Transport-Security: max-age=31536000; includeSubDomains; preload`.
- **Rate limiting**: Postgres-backed sliding window (`rate_limit_events`, migration 004) on `/api/auth/signup` (5/hr/IP) and `/api/contact` (3/24h/IP); `/api/auth/login` has a separate per-user token-rate limit (5/hr).
- **Email validation**: normalized to `/^[^\s@]+@[^\s@]+\.[^\s@]+$/` across signup/login/contact/subscribe/credentials (previously `/api/contact` and `/api/subscribe` used a weak `.includes("@")` check).
- **CLI license file permissions**: `~/.agentsentry/license.json` written with `chmod 600`.
- **Session security**: httpOnly, `secure` in production, `sameSite=lax` cookies; anti-enumeration on login (identical response whether the account exists).
- **Licensing**: AGPL-3.0-or-later consistently declared across `LICENSE`, `pyproject.toml`, `README.md`, and `frontend/package.json` (corrected from stale "MIT" references repo-wide).

### 13.2 Open Items (per `SECURITY_CHECKLIST.md`)

- No ToS/Privacy Policy pages or `SECURITY.md` disclosure process yet.
- No CORS policy explicitly configured (relies on same-origin + Bearer-token model).
- `users.disabled_at` column exists but no account-disable flow implemented.
- No third-party pentest / SOC2/ISO27001 (flagged as 6-month, "market-ready" milestone, not pre-launch).
- `/api/chat` has no auth or rate limiting and makes outbound calls to GitHub + Groq — potential cost/abuse vector.
- `LICENSE` file is a short stub pointing to the AGPL-3.0 text externally, not the full ~13,000-word license text.

---

## 14. Email Infrastructure

All transactional email is sent via **Resend** from `noreply@agentsentry.org` (with `support@`, `contact@`, and `newsletter@agentsentry.org` as routing addresses, forwarded via ImprovMX):

| Trigger | Email | To |
|---|---|---|
| Signup | Activation code + `agentsentry activate <code>` instructions | new user |
| Login | Magic sign-in link | account email |
| First Pro CLI activation | Pro usage guide (scan examples) | user |
| Pro upgrade | New `AS-PRO-...` activation code | user |
| Email-change request | Confirmation link | new email |
| API key regeneration | New key | user |
| Contact form | Inbound copy + auto-reply | `support@agentsentry.org` / sender |
| Newsletter signup | "Welcome to Blast Radius" | subscriber |
| Gumroad purchase | License key (via Gmail/Nodemailer, not Resend) | buyer |

The `send()` helper never throws — if `RESEND_API_KEY` is unset or delivery fails, it logs and returns `false`, so email outages never 500 the calling route.

**Newsletter**: "Blast Radius by AgentSentry" on Beehiiv — weekly Tuesday cadence, issue #001 published, issue #002 drafted (dogfooding finding: a CI bot PAT with full `repo` scope, PREA ≈ 42.5/HIGH). ~6 subscribers, 50% open rate as of this report; referral program enabled but not yet incentivized with milestones.

---

## 15. Infrastructure & Deployment

| Component | Platform |
|---|---|
| Web app (`frontend/`) | Vercel (Next.js), production domain agentsentry.org |
| Database | Vercel Postgres |
| CLI package | PyPI (`nhi-audit`), published via GitHub Actions OIDC trusted publishing |
| Standalone executables | GitHub Releases |
| Source control | GitHub (`Abhiram-ops/agent-sentry`), branch `master` |
| Email | Resend (transactional) + ImprovMX (MX forwarding for @agentsentry.org) + Gmail/Nodemailer (Gumroad path) |
| Newsletter | Beehiiv ("Blast Radius by AgentSentry") |
| AI chatbot backend | Groq API (`llama-3.1-8b-instant`) |
| Payments | Stripe (checkout + webhooks), Gumroad (webhook) |

Deployment flow: pushes to `master` trigger Vercel's auto-deploy for `frontend/`; production promotion has been done manually via the Vercel dashboard. PyPI releases are manual (`workflow_dispatch` on `ci.yml`).

---

## 16. Testing

### 16.1 CLI (`agentsentry/tests/`)

| File | Coverage |
|---|---|
| `conftest.py` | Autouse fixture grants every test an isolated Pro license via a temp `AGENTSENTRY_HOME` |
| `test_scorer.py` (505 lines) | Each PREA factor in isolation, the full product, admin override (≥100 CRITICAL), pure-AI-agent 99.0 cap, finding generation, MITRE mapping |
| `test_graph.py` (175 lines) | Attack graph construction + `TestLateralMovement` |
| `test_cloud_scanners.py` (321 lines) | Azure/GCP scanners against fake injectable clients (no real cloud calls) |
| `test_agent_scanner.py` (200 lines) | False-positive avoidance, CrewAI, AutoGen, LangChain regression, end-to-end |
| `test_cli_local.py` | `scan local` integration test |
| `test_license_gate.py` | Unregistered/Free/Pro tier enforcement, activation exemption, `AGENTSENTRY_SKIP_LICENSE` bypass |

**Run**: `pytest agentsentry/tests -v` (from `agentsentry/`, which contains `pyproject.toml`); CI installs via `pip install -e ".[dev,all-clouds]"` so no manual `PYTHONPATH` is needed in CI.

### 16.2 CI (`.github/workflows/ci.yml`)

- **`test` job**: matrix Python 3.10/3.11/3.12 on `ubuntu-latest` → `pytest agentsentry/tests -v`, `black --check agentsentry`, `ruff check agentsentry`.
- **`publish` job**: `workflow_dispatch`-only, depends on `test`, builds with `python -m build`, publishes to PyPI via OIDC trusted publishing.

### 16.3 Web

`npx tsc --noEmit` and `npm run build` are run after frontend changes; manual browser testing covers the redesigned homepage, signup/login flows, and dashboard.

---

## 17. Research Paper Summary

**Title**: *"AgentSentry: A Risk Quantification Framework for Non-Human Identities and Autonomous AI Agents in Cloud Environments"*
**Format**: IEEE conference LaTeX (`IEEEtran`), 571 lines, author Abhiram Lanka.
**Status**: under arXiv review.

**Abstract (plain English)**: Cloud environments average ~45 NHIs per human identity, and no existing framework rigorously quantifies the risk these credentials pose — a gap worsened by autonomous AI agents, whose danger scales with *both* privilege and autonomy. The paper presents AgentSentry as an open-source framework for discovering, inventorying, and scoring NHIs and AI agents, with its core contribution being the **AI-Amplification Factor (A)** — a novel term quantifying how much an autonomous agent multiplies the damage from a compromised identity.

**Key formalization**: `Risk(i) = P(i) × R(i) × E(i) × A(i)` (Eq. 1), motivated as multiplicative because risk dimensions *compound* rather than add. Validated against live AWS environments and AI-agent codebases, showing the A factor can push composite scores **up to 60× higher** than equivalent non-agentic identities at the same privilege level.

**Threat model**: a single-NHI-compromise adversary maximizing crown-jewel reachability via minimal lateral-movement steps, mapped to MITRE ATT&CK Cloud Matrix techniques T1078.004, T1528, T1199, T1651. Related work spans the CrowdStrike 2024 45:1 NHI ratio study, LangChain/CrewAI/AutoGen, OWASP Top 10 for LLM Apps, prompt-injection literature (Perez 2022, Greshake 2023), and classical attack-graph research (Sheyner 2002).

---

## 18. Version History & Timeline

| Version / Commit | Milestone |
|---|---|
| Phase 0-1 | Project scaffold, core models/scorer/graph (NetworkX + Pyvis) |
| Phase 2-3 | Mock + AWS scanners; first real scan against a live AWS account found an `AdministratorAccess` role scored CRITICAL (100.0) |
| Phase 4 | GitHub repo live |
| Phase 5 | LangChain/CrewAI/AutoGen static AI-agent scanner (`scan agents`) |
| Phase 6 | CISA KEV enrichment (`--enrich`) |
| Phase 7 | Next.js website (dark theme), Free/Pro pricing concept |
| e434b9c | Dual-tier (Free/Pro) licensing + credit billing system |
| fbba52c | Billing/licensing routes wired into deployed frontend |
| b28106c | Dedicated `/signup`/`/login` pages; removed legacy `/claim` flow |
| a719613, dd7baee | Magic-link auth fixes |
| 325df45, cea17a3 | v0.1.5 — fixed `scan local` crash, CI/CD added, published to PyPI |
| 204f4a0 | v0.1.6 |
| 6106cc0 | Email routing moved to support@/contact@/newsletter@agentsentry.org |
| ed8da6c | Security checklist expanded (GTM/compliance sections) |
| c1c1fa7 | **Security hardening**: rate limiting, security headers, email validation, CLI key `chmod 600` |
| a68ddf2 | **v0.1.7 release** — resilient CLI activation + magic-link web auth |
| fe90777 (HEAD) | Light-theme frontend redesign + AGPL-3.0 licensing sweep |

---

## 19. Known Issues, Tech Debt & Roadmap

### 19.1 Known Issues / Inconsistencies

- **Domain drift**: `pyproject.toml` references `agentsentry.tool`, the README references `agent-sentry-beta.vercel.app`, and production is `agentsentry.org` — email templates also still link to the `.vercel.app` URL.
- **Pricing drift**: `SECURITY_CHECKLIST.md` describes a $15/month Pro tier and `GTM_STRATEGY.md` envisions $99-499/mo SaaS tiers; the actual implemented model is a one-time Pro upgrade + pay-as-you-go credits.
- **PREA demo inconsistency**: marketing components (`RiskCalculator`, `AttackGraphVisualizer`, `MethodologySection`) use slightly different factor ranges than the documented/implemented scorer — cosmetic only, the CLI scorer itself is internally consistent.
- **Three parallel licensing mechanisms** (DB `activation_code`/tier, Gumroad HMAC keys, `DEV_APPROVAL_CODE`) are not unified.
- `users.disabled_at` is unused (no account-disable flow).
- `LICENSE` file is a stub (links to full AGPL-3.0 text rather than embedding it).

### 19.2 Tech Debt

- Orphaned frontend components from a prior dark-theme/3D design remain in the repo (`Scene3D.tsx`, `MorphingSphere.tsx`, `CyberBackground.tsx`, `hero-section-4.tsx`, `ai-input.tsx`, `limelight-nav.tsx`, plain `Navbar.tsx`/`Hero.tsx`/`Stats.tsx`) — unreferenced by any active page.
- Legacy/unported mirror copies of the package and website exist alongside the canonical ones (`agentsentry/website/`, `agentsentry/frontend/`, root `website/`).
- `/api/chat` route file has a minor stray-brace formatting issue (cosmetic).

### 19.3 Roadmap (from `Build_Roadmap_Bootstrapped.md` / `PROGRESS.md`)

- Reporting polish + public Streamlit dashboard (partially scaffolded under `agentsentry/dashboard/`).
- arXiv publication of the research paper.
- "AgentSentry Cloud" — continuous monitoring, Slack/Teams alerts, audit-grade PDF reports, multi-user, CI/CD API (originally envisioned as $99-499/mo SaaS tier, not yet built).
- Newsletter growth: configure Beehiiv referral-program milestones (currently enabled but unincentivized).

---

## 20. Appendix

### 20.1 Directory Tree (top 2 levels)

```
agent-sentry/
├── .claude/
├── .github/workflows/
├── .ruff_cache/
├── agentsentry/
│   ├── .pytest_cache/  .ruff_cache/
│   ├── agentsentry/        # core, enrichment, providers, scanners, reporting
│   ├── core/  dashboard/  dist/  enrichment/
│   ├── frontend/            # legacy/unported
│   ├── paper/  providers/  scanners/
│   ├── tests/ (fixtures)
│   ├── website/             # legacy/unported (.claude, public, src)
│   └── __pycache__/
├── dist/
├── frontend/                 # LIVE — .next, migrations, node_modules, public, src
├── lib/
├── nhi_audit.egg-info/
├── paper/
└── website/                  # legacy/unported
```

### 20.2 Glossary

| Term | Definition |
|---|---|
| **NHI** | Non-Human Identity — any credential not directly tied to an individual human (IAM role, API key, service account, SSH key, AI agent, etc.) |
| **PREA** | Privilege × Reachability × Exposure × AI-Amplification — AgentSentry's risk scoring formula |
| **Blast radius** | The set of resources (especially "crown jewels") reachable from a compromised identity, plus the cheapest attack path to each |
| **Crown jewel** | A resource flagged as high-sensitivity (e.g., production database, customer PII bucket) |
| **Zombie credential** | A credential that remains active but hasn't been used in 180+ days |
| **AI-Amplification Factor (A)** | Quantifies how much an autonomous AI agent multiplies the risk of a compromised identity, based on autonomy level, tool blast scores, and action reversibility |
| **CISA KEV** | CISA's Known Exploited Vulnerabilities catalog — used to enrich findings with real-world exploitation evidence |
| **Tier (Free/Pro)** | License tier; Free is limited to `scan local`/`scan mock`, Pro unlocks all providers + analyst-grade report output |

---

*End of report.*
