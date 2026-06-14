# Build-in-Public Post Queue

Drafts for "post our journey regularly." Each is sized for LinkedIn (works on X/Threads too,
trim if needed). Suggested cadence: 2 posts/week (matches the GTM "3-2-1 rule" in
GTM_STRATEGY.md). Post Mon/Thu, or right after something ships.

Every post should end with one CTA — alternate between "subscribe to Blast Radius"
and "try the CLI" so it doesn't feel like a constant sales pitch.

---

## Post 1 — Ship announcement (v0.1.7 + redesign)

Shipped two things this week:

→ AgentSentry v0.1.7 — Postgres-backed rate limiting, stricter validation,
and CLI license files now locked down with chmod 600
→ A full redesign of agentsentry.org — new look, and the homepage now runs
a live interactive terminal demo of the scanner

Both came out of dogfooding the tool on our own infra and finding the gaps.

Free, open source (AGPL-3.0), works in 30 seconds:

pip install nhi-audit
agentsentry scan mock

agentsentry.org

---

## Post 2 — The licensing story (behind the scenes)

Spent part of this week fixing something embarrassing: half our docs and
website said "MIT license." The actual LICENSE file has always been AGPL-3.0.

Why it matters if you're evaluating open-source security tools: AGPL means
if someone takes AgentSentry, modifies it, and runs it as a hosted service,
they have to share those modifications back. MIT wouldn't require that.

We picked AGPL-3.0 on purpose — keeping the scanner free *and* keeping
improvements in the open. Just took a sweep to make sure every doc actually
said so.

Small thing, but "say what you mean in your license" is table stakes for
trust in security tooling.

github.com/Abhiram-ops/agent-sentry

---

## Post 3 — Dogfooding finding (ties to Blast Radius #002)

We ran AgentSentry against our own GitHub repo this week.

Found: a CI bot token with full read/write/admin `repo` scope, used for
exactly one job — tagging releases.

Risk score: 42.5 (HIGH). Not a breach, not an attack — just a token that was
scoped for "whatever, it'll work" instead of "what does this job actually need."

This is the finding I see most often, on other people's repos and now on ours.

Full breakdown (plus an AI-agent-credential story) in this week's Blast Radius
newsletter → [link to blast-radius.beehiiv.com]

Subscribe: blast-radius.beehiiv.com

---

## Post 4 — Traction / ask (use after Blast Radius #002 sends)

Blast Radius (our weekly NHI security newsletter) just sent issue #2.

We're at 6 subscribers. Every single person who got issue #1 opened it.

If you work in security, DevOps, or you're building with LangChain/CrewAI/
AutoGen and have access to production systems — this is written for you.
One real finding, one AI-agent risk story, one command, every Tuesday.

blast-radius.beehiiv.com

---

## Post 5 — AI agent angle (evergreen, reuse anytime engagement dips)

Your LangChain agent is probably running under a token that has more access
than the agent's job description.

"Look up account info" often quietly comes with write access to the same
table, because nobody scoped the credential — they just reused the one
that worked.

A static over-permissioned key is a known risk. An autonomous agent with
that same key, acting at machine speed with no human checkpoint after a
prompt injection, is a different category of risk.

We built a scorer for exactly this:

agentsentry scan agents --path .

Free, open source, no cloud credentials needed to try it.

---

## Notes on growth (Beehiiv)

- **Referral program is enabled but has no milestones configured.** Add 1-2
  reward tiers (e.g. "refer 3 friends → early access to a future Pro feature"
  or a shoutout in the newsletter) at app.beehiiv.com → Grow → Referral Program.
  This is the single highest-leverage lever right now since the program exists
  but isn't incentivizing anything.
- Acquisition so far: 3 of 6 subscribers came from the website signup form,
  2 direct, 1 from a t.co (Twitter/X) link — so the website form + social
  posts are both already converting. More social volume = more signups.
- Every social post above should link to either agentsentry.org (which has
  the signup form in the footer/newsletter section) or directly to
  blast-radius.beehiiv.com.
