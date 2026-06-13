# AgentSentry: Bootstrapped Build Roadmap
### An Open-Source Non-Human Identity & AI Agent Risk Auditor
**For: Fresh Graduate | Budget: $0 | Stack: Python + Open Source**

---

## First — The Hard Truth About Scope

The unified platform described earlier is a 3-year, $5M journey. That is not your starting point.

Your starting point is **one tool that does one thing undeniably well**, that someone can `pip install` or `git clone` and run against their environment in 10 minutes, and that produces an output that makes a senior security engineer say *"I didn't know this — and I should have."*

That moment — that reaction — is your research contribution, your GitHub star, your conference talk, your first user, and eventually your first investor conversation. Everything starts there.

**The one thing we build first: AgentSentry.**

---

## What Is AgentSentry?

> AgentSentry is an open-source auditing tool that discovers, maps, and risk-scores every non-human identity (NHI) and AI agent in a cloud or local environment — and surfaces the attack paths an adversary could exploit through them.

It answers three questions that no free tool answers today:

1. **What machine identities exist in my environment that I don't know about?**
2. **Which AI agents have permissions beyond what they need, and what can they reach?**
3. **If one of these is compromised, what is the blast radius?**

It runs locally. It costs nothing. It produces a report and a graph visualization. It is publishable as a research paper because it defines a new measurement methodology for NHI risk.

---

## Why This Specific Tool?

| Criterion | Why AgentSentry fits |
|---|---|
| **Novel enough to publish** | No existing academic paper defines a risk-scoring methodology for AI agent permissions. You write the first one. |
| **Demonstrable in a demo** | The graph visualization of NHI blast radius is visceral. People see it and immediately want it. |
| **Buildable solo in Python** | Every library you need is free and well-documented. |
| **No cloud costs required** | Works against local Docker environments, AWS free tier, or GitHub repos. |
| **Natural growth path** | Version 1 is a CLI audit tool. Version 2 adds continuous monitoring. Version 3 is the startup. |

---

## The Concept You Must Understand: The NHI Attack Graph

Before writing a line of code, understand what you're modeling.

### What is a Non-Human Identity (NHI)?

Every automated process that needs to *authenticate* to something creates an identity. Examples:

```
├── AWS IAM Roles          → used by EC2 instances, Lambda functions
├── Service Accounts       → used by Kubernetes pods
├── API Keys               → used by scripts, CI/CD pipelines
├── OAuth 2.0 Tokens       → used by SaaS integrations
├── SSH Keys               → used by automation scripts
├── GitHub Actions Secrets → used by CI/CD workflows
├── AI Agent Identities    → LangChain agents, CrewAI agents, AutoGen agents
└── Docker Registry Tokens → used by container build systems
```

In a typical mid-size company there are **45 machine identities for every 1 human identity.** Almost none of them are actively governed.

### What is the Attack Graph?

When an attacker compromises an NHI, they don't just get *that* identity's access — they get everything *reachable through* it. The attack graph models this:

```
Compromised GitHub Actions API Key
        │
        ▼
Write access to production S3 bucket
        │
        ├──▶ S3 bucket stores model weights for internal AI agent
        │           │
        │           ▼
        │    AI agent has tool: send_email, query_database, call_api
        │           │
        │           ▼
        │    Database contains PII for 2M customers  ← CROWN JEWEL
        │
        └──▶ S3 bucket is source for Lambda deployment package
                    │
                    ▼
             Lambda has VPC access to internal network  ← LATERAL MOVEMENT
```

**AgentSentry builds this graph automatically, from API calls, and scores the blast radius of every NHI node.**

That is the research contribution. That is the demo. That is the paper.

---

## The Tech Stack — 100% Free

```
Layer               Tool                    Why
─────────────────────────────────────────────────────────────────
Language            Python 3.11+            Dominant in security tooling
Graph Database      NetworkX                Free, pure Python graph library
                    (Neo4j Community        Optional upgrade, still free)
Visualization       Pyvis / Plotly          Interactive graph rendering, free
Cloud Scanning      boto3 (AWS SDK)         Free, uses AWS free tier credentials
                    azure-identity          Free Azure SDK
                    google-cloud-sdk        Free GCP SDK
Local Scanning      GitPython               Scans local repos for secrets/keys
                    truffleHog (library)    Open-source secret detection
AI Agent Scanning   LangChain               Open source, scan agent tool configs
Threat Intel        CISA KEV JSON feed      Free, public, daily updated
                    NVD API                 Free, no auth required
                    MITRE ATT&CK (Stix2)    Free Python library
Reporting           Jinja2 templates        Free HTML report generation
                    Rich (terminal)         Beautiful terminal output, free
Dashboard           Streamlit               Free, deploy to Streamlit Cloud free
Testing             pytest                  Free
CI/CD              GitHub Actions           Free for public repos
Hosting             GitHub Pages            Free for the docs site
Package             PyPI                    Free to publish
```

**Total monthly cost: $0.** AWS free tier gives you 12 months of Lambda, S3, and IAM API calls at zero cost for development.

---

## Project Structure

```
agentsentry/
│
├── agentsentry/
│   ├── __init__.py
│   ├── core/
│   │   ├── graph.py          # NHI attack graph builder (NetworkX)
│   │   ├── scorer.py         # Risk scoring engine
│   │   └── models.py         # Data models for NHIs, agents, edges
│   │
│   ├── scanners/
│   │   ├── aws.py            # AWS IAM, Lambda, S3 scanner
│   │   ├── azure.py          # Azure AD service principals
│   │   ├── gcp.py            # GCP service accounts
│   │   ├── github.py         # GitHub Actions secrets, tokens
│   │   ├── kubernetes.py     # K8s service accounts
│   │   ├── langchain.py      # LangChain agent config scanner
│   │   └── local.py          # Local file system secret detection
│   │
│   ├── enrichment/
│   │   ├── cisa_kev.py       # Pull CISA Known Exploited Vulnerabilities
│   │   ├── mitre.py          # Map TTPs to NHI attack patterns
│   │   └── intel.py          # Threat intelligence enrichment
│   │
│   ├── reporting/
│   │   ├── terminal.py       # Rich terminal output
│   │   ├── html.py           # HTML report generator
│   │   └── templates/        # Jinja2 HTML templates
│   │
│   └── cli.py                # Click-based CLI entry point
│
├── dashboard/
│   └── app.py                # Streamlit dashboard
│
├── tests/
│   ├── fixtures/             # Mock AWS/GitHub environments
│   └── test_*.py
│
├── docs/                     # GitHub Pages documentation
├── examples/                 # Example outputs, demo environments
├── paper/                    # Your research paper (LaTeX)
├── pyproject.toml
└── README.md
```

---

## The Risk Scoring Model — Your Research Contribution

This is the academically novel part. You need to define a scoring methodology that doesn't exist yet. Here is the framework you'll publish:

### NHI Risk Score = f(Privilege, Reachability, Exposure, AI-Amplification)

**Component 1: Privilege Score (P)**
```
P = (permissions_count × permission_weight) / least_privilege_baseline

permission_weight:
  - Read-only access         → 1.0
  - Write access             → 2.5
  - Delete/destructive       → 4.0
  - IAM/permission-granting  → 8.0  ← most dangerous
  - Cross-account access     → 6.0
```

**Component 2: Reachability Score (R)**
```
R = internet_facing_factor × path_length_factor × lateral_movement_potential

internet_facing_factor:
  - Directly internet-exposed NHI  → 3.0
  - Reachable via 1 hop            → 2.0
  - Internal only                  → 1.0
```

**Component 3: Exposure Score (E)**
```
E = staleness_factor × rotation_factor × governance_factor

staleness_factor:
  - Never rotated, >365 days  → 3.0
  - Never rotated, >90 days   → 2.0
  - Rotated regularly         → 1.0
  - No rotation policy        → 2.5
```

**Component 4: AI-Amplification Factor (A)** ← THIS IS YOUR NOVEL CONTRIBUTION
```
A = agent_autonomy_level × tool_blast_radius × reversibility_factor

agent_autonomy_level:
  - Human-in-the-loop required    → 1.0
  - Semi-autonomous               → 2.0
  - Fully autonomous              → 4.0

tool_blast_radius:
  - Read-only tools               → 1.0
  - Write/send/create tools       → 2.0
  - Execute/deploy/delete tools   → 4.0
  - Cross-system orchestration    → 6.0

reversibility_factor:
  - All actions reversible        → 1.0
  - Some irreversible actions     → 1.5
  - Primarily irreversible        → 2.5  (send email, delete data, transfer funds)
```

**Final Score:**
```
NHI_Risk_Score = P × R × E × A

Score ranges:
  Critical  : > 100
  High      :  50–100
  Medium    :  20–50
  Low       :   < 20
```

**Why this is publishable:** No paper has formally defined an AI-Amplification Factor for NHI risk scoring. You're introducing a new variable into an existing risk modeling domain. That's a legitimate research contribution at conferences like IEEE S&P, USENIX Security, or ACM CCS — and more realistically for a first paper, at academic security workshops or arXiv as a preprint.

---

## Build Phases

### Phase 0: Foundation (Weeks 1–2)
**Goal:** Working scaffold, nothing fancy.

```bash
# Your day 1 commands
pip install boto3 networkx pyvis click rich jinja2 pytest
git init agentsentry
cd agentsentry
# Set up pyproject.toml, basic CLI skeleton, GitHub repo
```

Deliverable: `agentsentry scan --help` works. No actual scanning yet. Just the structure.

**Learning to do in parallel:**
- Read the AWS IAM documentation — specifically IAM policies, roles, and trust relationships
- Read the LangChain docs on Tools and Agents — understand what a "tool call" is
- Read the CISA KEV catalog — understand what a "known exploited vulnerability" is

---

### Phase 1: AWS NHI Scanner (Weeks 3–6)
**Goal:** Scan a real (or mocked) AWS environment and list every NHI.

What you build in `scanners/aws.py`:

```python
import boto3
from agentsentry.core.models import NonHumanIdentity, NHIType

class AWSScanner:
    """
    Discovers all non-human identities in an AWS account.
    Requires read-only IAM credentials (SecurityAudit policy).
    """
    
    def scan(self) -> list[NonHumanIdentity]:
        identities = []
        identities.extend(self._scan_iam_roles())
        identities.extend(self._scan_iam_users_with_keys())
        identities.extend(self._scan_lambda_execution_roles())
        identities.extend(self._scan_ec2_instance_profiles())
        return identities
    
    def _scan_iam_roles(self) -> list[NonHumanIdentity]:
        iam = boto3.client('iam')
        roles = iam.list_roles()['Roles']
        
        nhis = []
        for role in roles:
            # Get attached policies
            policies = iam.list_attached_role_policies(RoleName=role['RoleName'])
            
            # Check last used date
            role_detail = iam.get_role(RoleName=role['RoleName'])
            last_used = role_detail['Role'].get('RoleLastUsed', {})
            
            nhi = NonHumanIdentity(
                id=role['RoleId'],
                name=role['RoleName'],
                type=NHIType.IAM_ROLE,
                created_date=role['CreateDate'],
                last_used=last_used.get('LastUsedDate'),
                attached_policies=[p['PolicyName'] for p in policies['AttachedPolicies']],
                trust_policy=role['AssumeRolePolicyDocument'],
                arn=role['Arn']
            )
            nhis.append(nhi)
        
        return nhis
    
    # ... _scan_iam_users_with_keys(), _scan_lambda_execution_roles(), etc.
```

**Test environment (free):** Use AWS free tier. Create a mock environment with intentionally over-permissioned roles. Run AgentSentry against it. Take a screenshot. That is your first demo.

Deliverable: `agentsentry scan aws` outputs a table of every IAM role, its permissions, when it was last used, and a preliminary risk flag.

---

### Phase 2: Graph Builder + Blast Radius (Weeks 7–10)
**Goal:** Connect the dots. Build the attack graph.

What you build in `core/graph.py`:

```python
import networkx as nx
from agentsentry.core.models import NonHumanIdentity, Resource, Edge

class NHIAttackGraph:
    """
    Builds a directed graph where:
    - Nodes are NHIs, Resources, and AI Agents
    - Edges represent access relationships
    - Edge weights represent attack path cost (lower = easier to traverse)
    """
    
    def __init__(self):
        self.G = nx.DiGraph()
    
    def add_nhi(self, nhi: NonHumanIdentity):
        self.G.add_node(nhi.id, **{
            'label': nhi.name,
            'type': nhi.type.value,
            'risk_score': nhi.risk_score,
            'color': self._risk_color(nhi.risk_score)
        })
    
    def add_access_edge(self, from_nhi_id: str, to_resource_id: str, 
                        permission_level: str):
        weight = self._permission_weight(permission_level)
        self.G.add_edge(from_nhi_id, to_resource_id, 
                        permission=permission_level,
                        weight=weight)
    
    def compute_blast_radius(self, nhi_id: str) -> dict:
        """
        Given a compromised NHI, what can an attacker reach?
        Uses NetworkX shortest path algorithms.
        """
        reachable = nx.descendants(self.G, nhi_id)
        
        # Find crown jewels (high-value targets) in reachable set
        crown_jewels = [
            node for node in reachable 
            if self.G.nodes[node].get('is_crown_jewel', False)
        ]
        
        # Compute shortest attack paths to each crown jewel
        attack_paths = {}
        for cj in crown_jewels:
            path = nx.shortest_path(self.G, nhi_id, cj, weight='weight')
            attack_paths[cj] = path
        
        return {
            'total_reachable_nodes': len(reachable),
            'crown_jewels_at_risk': crown_jewels,
            'attack_paths': attack_paths,
            'blast_radius_score': len(reachable) * len(crown_jewels)
        }
    
    def visualize(self, output_path: str):
        """Generates interactive HTML visualization using Pyvis."""
        from pyvis.network import Network
        net = Network(height='750px', width='100%', directed=True)
        net.from_nx(self.G)
        net.save_graph(output_path)
```

Deliverable: `agentsentry scan aws --visualize` produces an interactive HTML graph you can open in a browser. This is your demo moment.

---

### Phase 3: AI Agent Scanner (Weeks 11–14)
**Goal:** Detect LangChain/CrewAI agents, map their tools, apply the AI-Amplification Factor.

This is where your research novelty lives. No tool does this yet.

```python
import ast
import os
from pathlib import Path

class LangChainScanner:
    """
    Statically analyzes Python codebases for LangChain agent definitions.
    Extracts: tools, permissions, memory configuration, autonomy level.
    """
    
    def scan_directory(self, path: str) -> list[AIAgent]:
        agents = []
        for py_file in Path(path).rglob('*.py'):
            agents.extend(self._scan_file(py_file))
        return agents
    
    def _scan_file(self, filepath: Path) -> list[AIAgent]:
        """
        Uses Python AST parsing to find agent instantiation patterns.
        Looks for: AgentExecutor, initialize_agent, ChatOpenAI+tools patterns.
        """
        with open(filepath) as f:
            source = f.read()
        
        tree = ast.parse(source)
        agents = []
        
        for node in ast.walk(tree):
            # Detect: agent = AgentExecutor(agent=..., tools=[...])
            if isinstance(node, ast.Call):
                if self._is_agent_constructor(node):
                    tools = self._extract_tools(node)
                    autonomy = self._assess_autonomy(node, tree)
                    
                    agent = AIAgent(
                        source_file=str(filepath),
                        tools=tools,
                        autonomy_level=autonomy,
                        has_memory=self._has_memory(node),
                        max_iterations=self._get_max_iterations(node)
                    )
                    agents.append(agent)
        
        return agents
    
    def _assess_autonomy(self, node, tree) -> AutonomyLevel:
        """
        Determines autonomy level based on:
        - max_iterations setting
        - presence of human_approval callbacks
        - early_stopping_method
        """
        # ... static analysis logic
        pass
    
    def compute_ai_amplification_factor(self, agent: AIAgent) -> float:
        """
        Computes the A factor from the NHI risk scoring model.
        This is the academically novel computation.
        """
        autonomy_score = {
            AutonomyLevel.HUMAN_IN_LOOP: 1.0,
            AutonomyLevel.SEMI_AUTONOMOUS: 2.0,
            AutonomyLevel.FULLY_AUTONOMOUS: 4.0
        }[agent.autonomy_level]
        
        tool_blast = max(
            self._tool_blast_score(tool) for tool in agent.tools
        ) if agent.tools else 1.0
        
        reversibility = self._reversibility_score(agent.tools)
        
        return autonomy_score * tool_blast * reversibility
```

---

### Phase 4: Threat Intelligence Enrichment (Weeks 15–17)
**Goal:** Connect your findings to real-world threat data. Free APIs only.

```python
import httpx
import json

class CISAKEVEnricher:
    """
    Pulls the CISA Known Exploited Vulnerabilities catalog (free, public).
    Correlates CVEs in your software dependencies against active exploitation.
    """
    KEV_URL = "https://www.cisa.gov/sites/default/files/feeds/known_exploited_vulnerabilities.json"
    
    def fetch_kev(self) -> list[dict]:
        response = httpx.get(self.KEV_URL)
        return response.json()['vulnerabilities']
    
    def enrich_nhi(self, nhi: NonHumanIdentity, kev_list: list[dict]) -> NonHumanIdentity:
        """
        Checks if any software used by this NHI's associated workloads
        has a known exploited CVE. Elevates risk score if so.
        """
        # ... correlation logic
        pass


class MITREEnricher:
    """
    Maps NHI attack patterns to MITRE ATT&CK techniques.
    Uses the free stix2 Python library.
    """
    
    NHI_TTP_MAPPING = {
        'over_permissioned_role': ['T1078.004'],  # Valid Accounts: Cloud Accounts
        'no_rotation': ['T1528'],                  # Steal Application Access Token
        'autonomous_agent': ['T1651'],             # Cloud Administration Command
        'cross_account_trust': ['T1199'],          # Trusted Relationship
    }
    
    def map_to_ttps(self, finding: str) -> list[str]:
        return self.NHI_TTP_MAPPING.get(finding, [])
```

---

### Phase 5: Reporting + Dashboard (Weeks 18–20)
**Goal:** Make the output beautiful enough to screenshot and share.

**Terminal output (using Rich):**
```
╭─────────────────────────────────────────────────────────────────╮
│                    AgentSentry Scan Report                      │
│              AWS Account: 123456789 | 2026-06-02                │
╰─────────────────────────────────────────────────────────────────╯

 NHIs Discovered: 47    Critical: 3    High: 8    Medium: 12    Low: 24

┌──────────────────────────────┬──────────┬───────────┬──────────────────────┐
│ Identity                     │ Type     │ Risk      │ Blast Radius         │
├──────────────────────────────┼──────────┼───────────┼──────────────────────┤
│ ml-pipeline-executor         │ IAM Role │ ● CRITICAL│ 847 nodes, 3 CJs     │
│ github-actions-deploy        │ API Key  │ ● CRITICAL│ prod S3, Lambda, VPC │
│ langchain-crm-agent          │ AI Agent │ ● CRITICAL│ CRM DB, email, Slack │
│ dev-readonly-role            │ IAM Role │ ○ LOW     │ 12 nodes, 0 CJs      │
└──────────────────────────────┴──────────┴───────────┴──────────────────────┘

⚠ CRITICAL FINDING: langchain-crm-agent has FULLY AUTONOMOUS execution
  with IRREVERSIBLE tools (send_email, delete_record) and NO human approval
  gate. AI-Amplification Factor: 10.0. Recommend: implement approval
  callback for all destructive tool calls immediately.
```

**Streamlit dashboard:** Deploy free to streamlit.io. Shows the interactive graph, risk scores, and remediation recommendations. This becomes your public demo link.

---

## The Research Paper

**Target venue:** arXiv preprint first, then submit to an academic workshop.

**Title:** *"AgentSentry: A Risk Quantification Framework for Non-Human Identities and Autonomous AI Agents in Cloud Environments"*

**Structure:**

1. **Abstract** — Problem statement: NHI sprawl + agentic AI creates unquantified blast radius risk. We introduce a scoring framework and open-source tool.

2. **Introduction** — Why now. The 45:1 NHI-to-human ratio. Regulatory shifts (SEC, NIS2). Agentic AI deployment without security models.

3. **Related Work** — Existing IAM security papers. RBAC literature. What's missing: no paper addresses AI agent permission modeling.

4. **Threat Model** — Adversary goal: maximum blast radius from minimum initial access. Attack patterns on NHIs mapped to MITRE ATT&CK.

5. **The AgentSentry Framework** — Your scoring model. Define P, R, E, A formally. Prove properties (monotonicity, sensitivity to AI amplification).

6. **Implementation** — Architecture overview. Scanner modules. Graph construction algorithm. Complexity analysis.

7. **Evaluation** — Run against your mock AWS environment. Show score distributions. Validate that critical-scored NHIs correspond to real attack paths. Show case studies of the three converging risk scenarios.

8. **Discussion** — Limitations, future work, ethical considerations.

9. **Conclusion**

**Write it in LaTeX using the IEEE or ACM template — both free.**

---

## Your 6-Month Timeline

```
Month 1:  Understand the domain. Read papers. Build scaffold. AWS NHI scanner.
Month 2:  Graph builder. Blast radius computation. First demo screenshot.
Month 3:  AI agent scanner (LangChain). AI-Amplification Factor implementation.
Month 4:  Threat intel enrichment (CISA KEV, MITRE). Report generation.
Month 5:  Streamlit dashboard. Polish CLI. Write tests. Write README.
Month 6:  Write the paper. Submit to arXiv. Post on GitHub. Share on LinkedIn.
```

---

## Free Resources to Learn From

**Security concepts:**
- MITRE ATT&CK Framework — attack-techniques wiki, entirely free
- OWASP Top 10 for LLM Applications — directly relevant to your AI agent work
- AWS IAM documentation — the best IAM reference that exists
- CISA advisories — free, current, and directly citable in your paper

**Python security tooling (study these codebases):**
- `truffleHog` — secret detection, study how they scan repos
- `ScoutSuite` — cloud security auditing in Python, excellent reference
- `Prowler` — AWS/Azure/GCP security tool, read their scanner patterns
- `checkov` — IaC security scanning, good architectural patterns

**Graph theory (for your NetworkX work):**
- NetworkX documentation and tutorials — free
- "Graph Algorithms" by Needham & Hodler — O'Reilly, available free via many university libraries

**Academic writing:**
- Overleaf — free LaTeX editor, browser-based
- IEEE/ACM paper templates — free download
- Semantic Scholar — free academic paper search, find related NHI/IAM papers

**Cloud free tiers (what you actually get free):**
- AWS Free Tier: 12 months of IAM, S3, Lambda, EC2 micro
- GitHub: free repos, free Actions (2,000 minutes/month on public repos)
- Streamlit Cloud: free hosting for public apps
- PyPI: free package publishing

---

## What Success Looks Like at Month 6

- GitHub repo with 200+ stars (achievable with one good HackerNews or Reddit post)
- arXiv preprint published and shared
- One conference workshop submission in review
- A public Streamlit demo link that anyone can open
- A terminal GIF in your README that shows the scan running in real time
- The ability to say in any interview: *"I found a gap in the market, defined a novel risk scoring model, built a working tool, and published a paper — in six months, as a fresh grad, with zero budget."*

That is not a portfolio item. That is a career-defining signal.

---

## The One Rule

**Ship something ugly that works before you build something beautiful that doesn't.**

Week 6, you should have a terrible-looking Python script that actually scans an AWS account and outputs a list of IAM roles. Not a polished dashboard. Not a paper. A working, ugly scan.

Everything else is refinement. The working scan is the proof that the idea is real.

---

*Next step: Set up your development environment and build the scaffold. Everything above is designed to be tackled in order, one phase at a time.*
