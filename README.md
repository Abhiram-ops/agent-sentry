# AgentSentry 🛡️

![CI](https://github.com/Abhiram-ops/agent-sentry/actions/workflows/ci.yml/badge.svg)
[![PyPI](https://img.shields.io/pypi/v/nhi-audit?label=PyPI&color=00cc6a)](https://pypi.org/project/nhi-audit/)

![Python](https://img.shields.io/badge/python-3.10%2B-blue)
![License](https://img.shields.io/badge/license-AGPL--3.0-green)
[![Website](https://img.shields.io/badge/website-agent--sentry--beta.vercel.app-brightgreen)](https://agent-sentry-beta.vercel.app)

![AgentSentry Demo](https://raw.githubusercontent.com/Abhiram-ops/agent-sentry/main/demo.gif)

**Open-source auditor for Non-Human Identities and AI Agent attack surfaces across AWS, Azure, GCP, GitHub, Kubernetes, and your local machine.**

> *"45 machine identities for every 1 human. Almost none of them are governed."*

AgentSentry discovers every IAM role, API key, service account, SSH key, and AI agent in your environment — builds an attack graph of their access relationships — and scores the blast radius if any identity is compromised, using a novel **AI-Amplification Factor** that quantifies how autonomous AI agents multiply attack surface.

---

## Quick Start

```bash
pip install nhi-audit
agentsentry interactive
```

No cloud credentials needed to try it:

```bash
agentsentry scan mock          # full multi-cloud demo
agentsentry scan local         # scan this machine now
```

---

## Installation

```bash
pip install nhi-audit                   # core (local scanner included)
pip install nhi-audit[aws]              # + AWS
pip install nhi-audit[azure]            # + Azure
pip install nhi-audit[gcp]              # + GCP
pip install nhi-audit[github]           # + GitHub
pip install nhi-audit[k8s]             # + Kubernetes
pip install nhi-audit[all-clouds]       # everything
```

**Windows PATH fix (run once):**
```bash
python -m agentsentry --install-path
```

---

## Provider Setup

| Provider | Setup | Command |
|----------|-------|---------|
| Local | Nothing | `agentsentry scan local` |
| AWS | `aws configure` | `agentsentry scan aws` |
| Azure | `az login` | `agentsentry scan azure` |
| GCP | `gcloud auth application-default login` | `agentsentry scan gcp` |
| GitHub | `set GITHUB_TOKEN=ghp_...` | `agentsentry scan github` |
| K8s | `kubectl config use-context` | `agentsentry scan k8s` |
| AI Agents | Nothing | `agentsentry scan agents --path .` |

---

## All Commands

```bash
agentsentry interactive                      # guided provider picker (recommended)
agentsentry scan mock                        # demo, no credentials
agentsentry scan local --path ./myproject    # scan specific directory
agentsentry scan aws --visualize             # + interactive HTML attack graph
agentsentry scan aws --enrich                # + CISA KEV threat intel
agentsentry scan aws --analyze-usage         # + data-driven least-privilege (Access Advisor)
agentsentry scan aws --save                  # save to local history for diffing
agentsentry diff aws                          # what changed since the last saved scan
agentsentry history                           # past scans with CRIT/HIGH trend
agentsentry scan all                         # auto-detect + scan everything ready
agentsentry providers                        # check what's configured
agentsentry blast "ml-pipeline-executor"     # blast radius analysis
```

### Continuous monitoring

`scan --save` records a scan to a local SQLite store (`~/.agentsentry/history.db`).
`agentsentry diff <target>` then scans again and reports **what changed** — new
identities, newly-zombie credentials, and newly rotation-due keys — instead of a
fresh snapshot every time.

### Least-privilege analysis (AWS)

`scan aws --analyze-usage` pulls each identity's IAM Access Advisor data and flags
the gap between *granted* and *actually-used* services (finding **NHI-006**), naming
the exact services that are safe to revoke. Requires two extra read-only permissions:
`iam:GenerateServiceLastAccessedDetails` and `iam:GetServiceLastAccessedDetails`.

---

## Risk Scoring: P×R×E×A

```
Risk = Privilege × Reachability × Exposure × AI-Amplification

CRITICAL ≥ 100  |  HIGH ≥ 50  |  MEDIUM ≥ 20  |  LOW < 20
```

The **AI-Amplification Factor** is a novel research contribution — the first formal quantification of how autonomous AI agents multiply the blast radius of a compromised identity.

---

## Standalone Executable

No Python needed. Download from [GitHub Releases](https://github.com/Abhiram-ops/agent-sentry/releases):

| Platform | File |
|----------|------|
| Windows | `agentsentry-windows.exe` |
| macOS | `agentsentry-macos` |
| Linux | `agentsentry-linux` |

---

## Repository Structure

```
agent-sentry/
├── agentsentry/        ← CLI tool (Python, open-source)
├── website/            ← Marketing site (Next.js, Vercel)
└── paper/              ← Research paper (IEEE LaTeX)
```

---

## Links

- **Website & Docs:** [agent-sentry-beta.vercel.app](https://agent-sentry-beta.vercel.app)
- **PyPI:** [pypi.org/project/nhi-audit](https://pypi.org/project/nhi-audit/)
- **Issues:** [GitHub Issues](https://github.com/Abhiram-ops/agent-sentry/issues)

**License:** AGPL-3.0 — free forever.
