# AgentSentry Launch Copy

## Product Hunt

**Tagline (60 chars max):**
Open-source scanner for AI agent & cloud identity risks

**Description:**
Hey PH! I built AgentSentry after noticing that most security teams focus entirely on human accounts while machine identities — IAM roles, API keys, service accounts, AI agents — run completely ungoverned in the background.

The ratio is 45 machine identities for every 1 human in a typical large org. Almost none of them are monitored.

AgentSentry fixes that. It scans across AWS, Azure, GCP, GitHub, Kubernetes, and your local machine, then scores every identity it finds using a four-component formula: Privilege × Reachability × Exposure × AI-Amplification.

The AI-Amplification factor is the part I'm most proud of. It's the first formal attempt to quantify how much more dangerous an autonomous AI agent makes a compromised identity. A fully autonomous LangChain agent with delete access scores 60× higher than the same identity without the agent — because the agent acts at machine speed with no human in the loop.

**Features:**
- Discovers all NHIs across 6 cloud environments
- Scores risk with P×R×E×A (including AI-Amplification Factor)
- Builds an interactive attack graph showing blast radius
- Enriches findings with CISA KEV threat intel
- Ships as a CLI, a web dashboard, and a standalone .exe (no Python needed)
- 100% free and open source

`pip install nhi-audit` then `agentsentry scan local` — no credentials needed to try it.

**First comment:**
Happy to answer any questions about the risk model or implementation. The research paper formalizing the AI-Amplification Factor is currently under arXiv review if anyone wants to dig into the math.

---

## Hacker News — Show HN

**Title:**
Show HN: AgentSentry – open-source scanner for AI agent and cloud identity risks

**Post body:**
I built this after spending time in cloud security and realizing that every org I looked at had the same blind spot: they governed human accounts carefully and ignored machine identities almost entirely.

The tool scans AWS, Azure, GCP, GitHub, K8s, and local machines for every non-human identity it can find, then scores each one using Privilege × Reachability × Exposure × AI-Amplification. The last factor is the novel part — it quantifies how an autonomous AI agent (LangChain, CrewAI, AutoGen) running under a compromised identity multiplies the blast radius, because the agent can take irreversible actions at machine speed with no human checkpoint.

In testing: a fully autonomous CRM agent with database delete access scores 60× higher than an equivalent static IAM role at the same privilege level. That difference is invisible to every CIEM tool I've seen.

Try it with no cloud credentials:
  pip install nhi-audit
  agentsentry scan mock
  agentsentry interactive  ← guided mode

GitHub: https://github.com/Abhiram-ops/agent-sentry
Site: https://agent-sentry-beta.vercel.app

Built in Python, AGPL-3.0 licensed. Would love feedback on the scoring model — I have a research paper formalizing it but I'm genuinely uncertain whether the multiplicative formulation is the right choice vs additive.

---

## Reddit — r/netsec

**Title:**
I built a free open-source scanner that finds AI agents and scores their blast radius if compromised

**Body:**
Been working on this for a few weeks. AgentSentry scans your cloud environments for non-human identities (IAM roles, API keys, service accounts, AI agents) and scores the risk of each one being compromised.

The piece I haven't seen elsewhere: an AI-Amplification Factor that quantifies how much more dangerous an autonomous AI agent makes a compromised identity. If a LangChain agent with delete_record access gets hijacked via prompt injection, it doesn't just expose whatever the underlying IAM role can reach — it can act on that access immediately, repeatedly, at machine speed, with no human review. That's a different risk class than a static credential.

**What it scans:**
- AWS IAM, Lambda, S3, Secrets Manager
- Azure Managed Identities, Service Principals
- GCP Service Accounts, downloaded key files
- GitHub PATs, deploy keys, Actions secrets
- Kubernetes ServiceAccounts, ClusterRoleBindings
- Local machine: env vars, SSH keys, .env files, source code

**No credentials needed to try it:**
```
pip install nhi-audit
agentsentry scan mock
```

AGPL-3.0 licensed: https://github.com/Abhiram-ops/agent-sentry

Feedback welcome, especially on the scoring model. I'm aware the permission weight table is manually curated and that's a weakness.

---

## Reddit — r/devops

**Title:**
Tool for auditing AI agent permissions and cloud identity risk — open source

**Body:**
Quick share: built a CLI tool that scans your cloud environments for over-privileged identities and autonomous AI agents.

The motivation was practical: we deploy LangChain/CrewAI agents that have access to production databases and email APIs. I wanted to know what happens if one gets hijacked via prompt injection. Turns out existing tools have no answer for that — they only score static IAM permissions.

AgentSentry adds an AI-Amplification Factor to the risk score. A fully autonomous agent with irreversible tool access gets flagged as CRITICAL even if the underlying IAM role looks clean.

Works across AWS, Azure, GCP, GitHub, K8s, and local. Interactive mode walks you through setup:
```
pip install nhi-audit
agentsentry interactive
```

https://github.com/Abhiram-ops/agent-sentry

---

## LinkedIn Post

Just shipped AgentSentry — an open-source security tool I've been building to address something I kept seeing in cloud environments.

The problem: enterprises have roughly 45 machine identities for every human identity. IAM roles, API keys, service accounts, AI agents running in the background. Almost none of them are governed the way human accounts are.

The tool discovers every non-human identity across AWS, Azure, GCP, GitHub, and Kubernetes, then scores each one using a four-component risk model I developed: Privilege × Reachability × Exposure × AI-Amplification.

The AI-Amplification part is what makes this different from existing CIEM tools. When an autonomous AI agent runs under a compromised identity, the risk isn't just what that identity can access — it's everything the agent can do with that access, at machine speed, without a human in the loop. I formalized this as a scoring variable and validated it against live AWS environments.

Key results: a fully autonomous LangChain CRM agent scores 60× higher than an equivalent static IAM role at identical privilege levels. That vulnerability is completely invisible to privilege-only scoring tools.

Open source, AGPL-3.0 licensed, free forever. Try it in 30 seconds:

pip install nhi-audit
agentsentry scan mock

GitHub: https://github.com/Abhiram-ops/agent-sentry
Live tool: https://agent-sentry-beta.vercel.app

Would love to hear from anyone working on NHI security or AI agent governance — this is a space that needs more open tooling.

#cybersecurity #cloudsecurity #AIagents #opensourcesecurity #NHI

---

## Dev.to / Medium Article Title Options

1. "Why Your AI Agents Are Your Biggest Security Blind Spot (and How to Score Their Risk)"
2. "I Built a Risk Scoring Model for Autonomous AI Agents. Here's What I Found."
3. "45 Machine Identities Per Human, Almost None Governed: Building AgentSentry"
4. "The AI-Amplification Factor: Quantifying How Autonomous Agents Multiply Security Risk"

