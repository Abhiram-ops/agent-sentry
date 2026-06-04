# AgentSentry 🛡️

![CI](https://github.com/Abhiram-ops/agent-sentry/actions/workflows/ci.yml/badge.svg)
[![PyPI](https://img.shields.io/pypi/v/nhi-audit?label=PyPI&color=00cc6a)](https://pypi.org/project/nhi-audit/)
[![PyPI Downloads](https://img.shields.io/pypi/dm/nhi-audit?color=00cc6a)](https://pypi.org/project/nhi-audit/)
![Python](https://img.shields.io/badge/python-3.10%2B-blue)
![License](https://img.shields.io/badge/license-MIT-green)
[![Website](https://img.shields.io/badge/website-agent--sentry--beta.vercel.app-brightgreen)](https://agent-sentry-beta.vercel.app)

**Open-source auditor for Non-Human Identities and AI Agent attack surfaces across AWS, Azure, GCP, GitHub, Kubernetes, and your local machine.**

> *"45 machine identities for every 1 human. Almost none of them are governed."*

AgentSentry discovers every IAM role, API key, service account, SSH key, and AI agent in your environment — builds an attack graph of their access relationships — and scores the blast radius if any identity is compromised, using a novel **AI-Amplification Factor** that quantifies how autonomous AI agents multiply attack surface.

---

## Quick Start

```bash
# Install (no credentials needed to try it)
pip install nhi-audit

# Fix PATH on Windows (run once so 'agentsentry' works directly)
python -m agentsentry --install-path

# Interactive mode — recommended for first-time users
agentsentry interactive

# Or jump straight in
agentsentry scan mock          # demo with realistic multi-cloud data
agentsentry scan local         # scan this machine right now
```

---

## Installation

### Core (always includes local scanner)
```bash
pip install nhi-audit
```

### With cloud providers
```bash
pip install nhi-audit[aws]          # + AWS IAM, Lambda, S3, Secrets Manager
pip install nhi-audit[azure]        # + Managed Identities, Service Principals
pip install nhi-audit[gcp]          # + Service Accounts, SA Keys
pip install nhi-audit[github]       # + PATs, Deploy Keys, Actions Secrets
pip install nhi-audit[k8s]          # + ServiceAccounts, ClusterRoleBindings
pip install nhi-audit[all-clouds]   # everything
```

---

## Provider Setup

### Local (no setup needed)
```bash
agentsentry scan local
# Scans: env vars, SSH keys, .env files, credential files, source code
```

### AWS
```bash
aws configure                  # enter Access Key ID + Secret
agentsentry scan aws
agentsentry scan aws --region eu-west-1   # specific region
agentsentry scan aws --profile myprofile  # named profile
```

**Minimum IAM permissions needed:**
```json
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Action": [
      "iam:List*", "iam:Get*",
      "sts:GetCallerIdentity",
      "lambda:ListFunctions",
      "s3:ListAllMyBuckets",
      "secretsmanager:ListSecrets"
    ],
    "Resource": "*"
  }]
}
```

### Azure
```bash
az login                       # browser opens, sign in
agentsentry scan azure
```
Or with service principal:
```bash
export AZURE_TENANT_ID=<tenant>
export AZURE_CLIENT_ID=<client>
export AZURE_CLIENT_SECRET=<secret>
agentsentry scan azure
```

### GCP
```bash
gcloud auth application-default login    # browser opens
agentsentry scan gcp
```
Or with service account key:
```bash
export GOOGLE_APPLICATION_CREDENTIALS=/path/to/key.json
agentsentry scan gcp
```

### GitHub
```bash
# Create token: github.com/settings/tokens
# Scopes needed: repo, read:org, read:user
export GITHUB_TOKEN=ghp_your_token_here
agentsentry scan github
agentsentry scan github --org myorganisation
```

### Kubernetes
```bash
# Uses your existing kubeconfig automatically
kubectl config use-context my-cluster
agentsentry scan k8s
agentsentry scan k8s --namespace production
agentsentry scan k8s --context prod-cluster
```

### AI Agent Code
```bash
# Scans LangChain / CrewAI / AutoGen Python files
agentsentry scan agents --path ./my-project
```

---

## All Commands

```bash
# Scan commands
agentsentry scan mock                        # demo, no credentials
agentsentry scan local                       # this machine
agentsentry scan local --path ./myproject    # specific directory
agentsentry scan aws
agentsentry scan azure
agentsentry scan gcp
agentsentry scan github --org myorg
agentsentry scan k8s --namespace production --context prod
agentsentry scan agents --path .
agentsentry scan all                         # auto-detect + scan all ready providers

# Flags available on all scan commands
agentsentry scan aws --visualize             # generate interactive HTML attack graph
agentsentry scan aws --enrich                # enrich with CISA KEV threat intel
agentsentry scan aws --json                  # output as JSON (for integrations)

# Provider management
agentsentry providers                        # list all providers + readiness status
agentsentry permissions aws                  # show exactly what's needed for AWS

# Analysis
agentsentry blast "ml-pipeline-executor"     # blast radius for a specific NHI

# Interactive mode (guided)
agentsentry interactive                      # pick providers from a numbered menu

# Utilities
agentsentry --version
python -m agentsentry --install-path         # fix Windows PATH permanently
```

---

## What the Output Looks Like

```
────────────────────────────────────────────────────────────────────────────────
  ⬡  AGENTSENTRY  v0.1.2  ·  NHI & AI Agent Risk Scanner  ·  MIT · free forever
────────────────────────────────────────────────────────────────────────────────

  15 identities found  ·  3 critical  ·  4 high  ·  2 AI agents

      Identity                         Provider   Type                   Score
────────────────────────────────────────────────────────────────────────────────
 ◉   aws/ml-pipeline-executor          aws        iam_role               100.0
 ◉   local/langchain-crm-agent         local      ai_agent               300.0
 ◉   azure/cicd-service-principal      azure      service_principal       89.0
 ◉   github/admin-pat                  github     github_secret           76.0
 ○   k8s/monitoring:prometheus-sa      k8s        service_account         12.0
```

---

## Risk Scoring Model

```
Risk = P × R × E × A

P  Privilege Score      1–10    What can this identity DO?
R  Reachability Score   1–3     How accessible is it to attackers?
E  Exposure Score       1–5     How poor is the credential lifecycle?
A  AI-Amplification     1–60    Does an autonomous AI agent multiply this risk?

CRITICAL ≥ 100  |  HIGH ≥ 50  |  MEDIUM ≥ 20  |  LOW < 20
```

The **AI-Amplification Factor** is a novel contribution — no existing tool or paper quantifies how autonomous AI agents multiply the blast radius of a compromised identity.

---

## Standalone Executable (no Python needed)

Download a pre-built binary from [GitHub Releases](https://github.com/Abhiram-ops/agent-sentry/releases):

| Platform | File |
|----------|------|
| Windows  | `agentsentry-windows.exe` |
| macOS    | `agentsentry-macos` |
| Linux    | `agentsentry-linux` |

```bash
# macOS / Linux — make executable and run
chmod +x agentsentry-macos
./agentsentry-macos interactive

# Windows — just double-click or run in terminal
agentsentry-windows.exe interactive
```

---

## Architecture

```
agentsentry/
├── core/
│   ├── models.py          # NHI, Finding, ScanResult data models
│   ├── scorer.py          # P×R×E×A risk scoring engine
│   └── graph.py           # NetworkX attack graph + blast radius
├── providers/
│   ├── base.py            # BaseProvider interface
│   ├── local.py           # Local machine scanner
│   ├── aws.py             # AWS IAM scanner
│   ├── azure.py           # Azure identity scanner
│   ├── gcp.py             # GCP service account scanner
│   ├── github.py          # GitHub secrets scanner
│   └── k8s.py             # Kubernetes RBAC scanner
├── scanners/
│   ├── mock.py            # Multi-cloud demo environment
│   └── langchain_scanner.py  # AI agent static analyzer
├── enrichment/
│   └── cisa_kev.py        # CISA KEV threat intel
└── cli.py                 # Click CLI + Rich terminal UI
```

---

## Contributing

```bash
git clone https://github.com/Abhiram-ops/agent-sentry
cd agent-sentry/agentsentry
pip install -e ".[dev]"
pytest tests/
```

Adding a new provider: implement `BaseProvider` in `providers/`, register it in `providers/__init__.py`, add it to `PROVIDER_CHOICES` in `cli.py`.

---

## License

MIT — free forever. Commercial SaaS features (continuous monitoring, remediation workflows, audit reports) coming soon.

**Links:** [Website](https://agent-sentry-beta.vercel.app) · [PyPI](https://pypi.org/project/nhi-audit/) · [Docs](https://agent-sentry-beta.vercel.app/docs) · [Issues](https://github.com/Abhiram-ops/agent-sentry/issues)
