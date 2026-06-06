# AgentSentry — Project Progress Log

**Author:** Abhiram Lanka  
**GitHub:** https://github.com/Abhiram-ops/agent-sentry  
**Started:** June 2026  
**Status:** Active Development

---

## What Is AgentSentry?

An open-source security tool that discovers every Non-Human Identity (NHI) and AI Agent in a cloud environment, builds an attack graph of their access relationships, and scores the blast radius if any identity is compromised.

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
| Language | Python 3.14 | Free |
| Graph engine | NetworkX | Free |
| Visualization | Pyvis (interactive HTML) | Free |
| CLI | Click + Rich | Free |
| Cloud scanning | boto3 (AWS SDK) | Free |
| Data models | Pydantic v2 | Free |
| Cloud infra | AWS Free Tier | Free |
| Hosting | GitHub | Free |

**Total cost: $0**

---

## Progress

### ✅ Phase 0 — Foundation
- Project scaffold created (`agentsentry/` package structure)
- `pyproject.toml` configured with all dependencies
- CLI entry point working via `python -m agentsentry`

### ✅ Phase 1 — Core Engine
- **`core/models.py`** — Data models: `NonHumanIdentity`, `Resource`, `Finding`, `ScanResult`
- **`core/scorer.py`** — Risk scoring engine implementing P × R × E × A
  - Privilege scoring with permission weight table
  - Reachability scoring (internet-facing, cross-account detection)
  - Exposure scoring (rotation staleness, zombie credentials)
  - AI-Amplification Factor (novel contribution — autonomy × tool blast × reversibility)
  - Automatic MITRE ATT&CK technique mapping
  - Finding generation with remediation steps
- **`core/graph.py`** — NHI Attack Graph (NetworkX + Pyvis)
  - Directed graph of NHIs, resources, and access edges
  - `blast_radius()` — given a compromised NHI, computes all reachable nodes and crown jewels
  - Interactive HTML visualization output

### ✅ Phase 2 — Scanners
- **`scanners/mock.py`** — Realistic demo environment (no credentials needed)
  - 7 NHIs across all risk levels
  - 2 AI agents (one fully autonomous, one semi-autonomous)
  - 5 resources including 3 crown jewels
  - Pre-built access edges for attack graph demo
- **`scanners/aws.py`** — Live AWS IAM scanner
  - IAM role discovery (skips AWS service-linked roles)
  - IAM user + access key discovery with last-used tracking
  - S3 bucket discovery with public access detection
  - Lambda function discovery
  - Cross-account trust policy detection

### ✅ Phase 3 — First Real Scan
- Connected to live AWS account (Account: 264914792227)
- Discovered real infrastructure:
  - `test-ml-pipeline` IAM role with AdministratorAccess → **CRITICAL (100.0)**
  - `agentsentry-scanner` access key → **CRITICAL** (over-privileged)
  - S3 bucket detected as resource
- Generated interactive attack graph (`agentsentry_graph.html`)
- MITRE ATT&CK T1078.004 mapped to over-privileged findings

### ✅ Phase 4 — GitHub
- Repository live at: https://github.com/Abhiram-ops/agent-sentry
- `.gitignore` configured (excludes generated HTML, egg-info, credentials)
- Initial commit pushed

---

## What The Tool Produces

**Terminal output:**
- Color-coded NHI inventory table (CRITICAL/HIGH/MEDIUM/LOW/INFO)
- Critical findings panel with description, remediation, and MITRE technique
- Top blast radius analysis showing what each CRITICAL NHI can reach

**Visual output:**
- Interactive HTML graph — nodes colored by risk level, sized by score
- Drag, zoom, hover for details — works in any browser, no server needed

**Commands:**
```bash
# Mock environment demo (no credentials)
python -m agentsentry scan mock

# Real AWS scan
python -m agentsentry scan aws

# With interactive graph
python -m agentsentry scan aws --visualize

# Blast radius for specific identity
python -m agentsentry blast "ml-pipeline"
```

---

## Remaining Phases

### ✅ Phase 5 — LangChain AI Agent Scanner
- Static analysis of Python codebases for LangChain/CrewAI/AutoGen agent definitions
- Extracts: tools, autonomy level, memory config, max_iterations via Python AST parsing
- Computes AI-Amplification Factor from real code — no imports needed, no execution
- Correctly scores: CRITICAL (fully autonomous + irreversible tools), HIGH (semi-autonomous), MEDIUM (read-only)
- Command: `python -m agentsentry scan agents --path ./your-project`

### ⬜ Phase 6 — Threat Intelligence Enrichment
- CISA KEV feed integration (free public JSON API)
- Correlates findings against actively exploited vulnerabilities
- MITRE ATT&CK enrichment via stix2 library

### ✅ Phase 7 — Website
- Next.js 14 + Tailwind + Framer Motion
- Dark cybersecurity aesthetic — black, electric green, sharp typography
- Sections: Navbar, Hero (animated terminal), Stats (live counters), Features (bento grid), Pricing (Free vs Pro), Footer
- Deployed on Vercel
- Three locked Pro features clearly shown: Continuous Monitoring, Remediation Workflows, Audit-Grade PDF Reports

### ⬜ Phase 8 — Reporting Polish
- HTML report generation (Jinja2 templates)
- JSON export for integration with other tools
- Streamlit dashboard (free hosting on streamlit.io)

### ⬜ Phase 8 — GitHub Polish
- Demo GIF in README (shows scan running in terminal)
- GitHub Actions CI (runs tests on every push)
- PyPI package publication (`pip install agentsentry`)
- GitHub Pages documentation site

### ⬜ Phase 9 — Research Paper
- **Title:** *AgentSentry: A Risk Quantification Framework for Non-Human Identities and Autonomous AI Agents in Cloud Environments*
- **Target:** arXiv preprint → academic workshop submission
- **Novel contribution:** First formal definition of AI-Amplification Factor in NHI risk scoring
- Write in LaTeX using IEEE template (free via Overleaf)

---

## Key Design Decisions & Rationale

| Decision | Rationale |
|---|---|
| Python over Go/Rust | Fastest iteration, richest security tooling ecosystem |
| NetworkX over Neo4j | Zero install friction, pure Python, sufficient for MVP scale |
| Pydantic v2 models | Free validation, serialization, type safety — saves debugging time |
| Click + Rich CLI | Professional terminal output without a web server |
| Mock scanner first | Enables demo without cloud credentials — lowers barrier to contribution |
| AI-Amplification as multiplier | Mathematically shows compounding risk — more intuitive than additive |
| Always-CRITICAL for AdminAccess | Admin policy = unconditional max privilege — no scoring nuance changes this |

---

## Presenting This Project

### One-line pitch
> "AgentSentry is the first open-source tool that discovers and risk-scores every machine identity and AI agent in a cloud environment — and shows you exactly what an attacker can reach if any of them are compromised."

### The demo flow (5 minutes)
1. Run `python -m agentsentry scan mock` → show the CRITICAL AI agent findings
2. Open `agentsentry_graph.html` → show the attack graph
3. Run `python -m agentsentry blast langchain-crm-agent` → show blast radius to crown jewel
4. Run `python -m agentsentry scan aws` → show real findings on real infrastructure
5. Explain the AI-Amplification Factor — why it's novel, why it matters

### The research angle
- No existing paper defines a formal risk scoring model for AI agent permissions
- The AI-Amplification Factor (A) is a new variable in an established domain (NHI risk)
- Tool validates the model empirically against real AWS environments
- Open-source → reproducible → publishable

---

## Resources & References

- MITRE ATT&CK Framework: https://attack.mitre.org
- CISA KEV Catalog: https://www.cisa.gov/known-exploited-vulnerabilities-catalog
- OWASP Top 10 for LLMs: https://owasp.org/www-project-top-10-for-large-language-model-applications/
- AWS IAM Best Practices: https://docs.aws.amazon.com/IAM/latest/UserGuide/best-practices.html
- NetworkX Docs: https://networkx.org/documentation/stable/
- ScoutSuite (reference codebase): https://github.com/nccgroup/ScoutSuite

---

*Last updated: June 2026*
