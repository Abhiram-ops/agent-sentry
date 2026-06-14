# 4-Week Social Media Ramp-Up — LinkedIn + X

**Narrative arc:** don't open with the product. Spend Week 1 building
intensity around the real-world problem — how big the machine-identity gap
is, and how dangerous it gets once AI agents hold the keys. Only after a full
week of that does Week 2 reveal AgentSentry, explicitly framed as "the
prototype we built to close this gap." Weeks 3-4 open it up for testing and
report back.

Cross-posts: every LinkedIn post should also go to X (trim to ~250 chars,
drop hashtags except 1-2) and Bluesky (`agentsentry.bsky.social`). Same
content, three platforms, no extra writing.

Posting cadence: Mon / Wed / Fri target, 2-3 posts/week is fine if Friday
slips. Restart the Blast Radius newsletter cadence only at the milestone
defined at the bottom of this doc.

---

## Week 1 — The Problem (no product mention)

Goal: make the reader feel "oh — that's actually true and nobody's talking
about it," before they know who's talking. No CTA to try anything, no link to
AgentSentry. The only thing earning attention here is the problem itself.

- **Mon — Post 1 (Scale of the gap)**:
  > For every human employee at your company, there are roughly 45 non-human
  > identities: API keys, service accounts, OAuth tokens, CI/CD bots, IAM
  > roles, and now AI agents.
  >
  > Most of them were created to "make something work" — during a deploy, a
  > migration, a one-off script three years ago. Almost none have been
  > reviewed since.
  >
  > They don't show up in your headcount. They don't go through onboarding or
  > offboarding. But a lot of them have access — sometimes admin access — to
  > your production systems, your databases, your cloud accounts.
  >
  > This is the part of your attack surface nobody owns.

- **Tue (not a social post)**: Blast Radius #002 sends as planned (existing
  schedule, June 16, 2026).

- **Wed — Post 2 (The AI agent danger)**:
  > Your LangChain, CrewAI, or AutoGen agent is probably running under a
  > credential that has more access than its job description.
  >
  > "Look up account info" often quietly comes with write access to that same
  > table — because nobody scoped the credential, they just reused the one
  > that already worked.
  >
  > A static, over-permissioned key sitting unused is a known risk, but a
  > bounded one — a human has to find it and decide to misuse it.
  >
  > An autonomous agent holding that same key is a different category. If a
  > prompt injection convinces it to act, it acts immediately, repeatedly, at
  > machine speed — no human in the loop, no second thoughts.
  >
  > Same credential. Very different risk.

- **Fri — Post 3 (Why now, + soft teaser)**:
  > Three things from the last 12 months:
  >
  > → 88% of organizations running AI agents in production reported a
  > confirmed security incident in 2025
  > → OWASP published its first-ever Top 10 for Agentic AI in 2026 — this is
  > now a formally recognized category of risk
  > → Google paid $32B for Wiz — cloud security is consolidating into
  > platforms that cost $50K-$500K/year, putting them further out of reach for
  > smaller teams
  >
  > The gap: most teams already sense they have a machine-identity problem,
  > and an even bigger one once AI agents enter the picture — but there's no
  > affordable way to even measure how bad it is.
  >
  > We've been building something for exactly this gap. More next week.

No CTA on any of these beyond engagement (likes/replies/shares). If someone
asks "what are you building?" in the comments, it's fine to answer honestly —
just don't lead with it.

---

## Week 2 — The Prototype (reveal)

Goal: cash in the attention from Week 1. Every post this week explicitly
calls AgentSentry "a prototype" — sets expectations correctly for Week 3-4's
testing call, and makes it feel like an invitation rather than a sales pitch.

- **Mon — Post 4 (The reveal)**:
  > Last week: 45 non-human identities per human, most never reviewed — and
  > AI agents turning over-permissioned credentials into a much faster-moving
  > risk.
  >
  > Here's the prototype we've been building to close that gap: **AgentSentry**.
  >
  > It's free and open-source (AGPL-3.0). One CLI scans AWS, Azure, GCP,
  > GitHub, Kubernetes, and your local machine — finds every machine identity,
  > and scores its risk with a formula (more on that Wednesday). For AI agent
  > codebases specifically (LangChain/CrewAI/AutoGen), it computes an
  > "AI-Amplification Factor" for exactly the danger from Wednesday's post.
  >
  > It's a prototype — actively evolving, and in a couple weeks we're opening
  > it up for real-world testing on other people's infra (more on that soon).
  >
  > Try it: `pip install nhi-audit && agentsentry scan mock`

- **Wed — Post 5 (How the prototype scores risk — PREA explainer)**:
  > Most "AI risk scores" are vibes. The prototype's isn't.
  >
  > PREA = Privilege × Reachability × Exposure × AI-Amplification.
  >
  > Every factor is derived from something you can point to: the IAM policy
  > JSON, network reachability, public exposure, and how irreversible the
  > agent's tools are.
  >
  > A static, unused IAM role tops out around 20 (LOW). The same role attached
  > to an autonomous agent with shell + write access can hit 200+ (CRITICAL) —
  > same permissions, very different risk. That's the AI-Amplification factor
  > from Wednesday's post, as a number.
  >
  > Try it: `agentsentry scan local`
  > Full methodology: agentsentry.org (Research section)

- **Fri — Post 6 (Dogfooding finding + transition to Week 3)**:
  > We pointed the prototype at our own GitHub repo this week.
  >
  > Found: a CI bot's Personal Access Token with full `repo` scope (read +
  > write + admin), used for exactly one job — tagging releases.
  >
  > Risk score: 42.5 (HIGH). This is the over-permissioned-credential pattern
  > from last week's posts — found on our own infra, by our own tool.
  >
  > `agentsentry scan github --enrich`
  >
  > Next week we're opening this prototype up for real-world testing — if you
  > run AWS, GitHub, K8s, or an AI agent codebase and want a free 15-minute
  > audit (plus a say in what we build next), watch this space.

**Optional bonus post (use as filler if a 3rd weekly slot is needed, or as a
Bluesky/X-only addition):** the AGPL licensing story from
[BUILD_IN_PUBLIC_POSTS.md](BUILD_IN_PUBLIC_POSTS.md) Post 2 — "why AGPL and
not MIT for a security scanner."

---

## Week 3 — Public Call for Testers

Ties directly into [USER_TESTING_PLAN.md](USER_TESTING_PLAN.md). Post the
Show HN / Reddit threads first (mornings, per GTM_STRATEGY.md timing
guidance), then amplify on LinkedIn/X same day or the day after.

- **Mon — Show HN + r/netsec / r/devops**: "Show HN: AgentSentry — open-source
  NHI & AI agent risk scanner (prototype, looking for testers)." Body: 2-3
  sentence pitch (reuse the Week 2 reveal framing) + direct link to the
  feedback form + "happy to do a free walkthrough for the first 10-15 people
  who try it on their real AWS/GitHub setup."

- **Tue — Post 7 (LinkedIn/X amplification, "scary stat" template)**:
  > I ran the AgentSentry prototype on our own AWS account this morning.
  >
  > [X] findings in under a minute. [Y] of them HIGH or CRITICAL.
  > [One specific example, e.g. "an IAM role with AdministratorAccess that
  > hasn't been used in 6 months."]
  >
  > It's free and takes 30 seconds: `pip install nhi-audit`
  >
  > We're also looking for 10-15 people to run it on their own setup and tell
  > us what's confusing — 15 minutes, feedback form linked below. First 10
  > responders get a 1:1 walkthrough.
  >
  > [feedback form link]

- **Fri — Post 8 (community engagement / 3-2-1 rule check-in)**: Short post
  recapping any interesting findings testers reported so far (anonymized),
  thanking early responders by name (with permission) if any signed up
  publicly. CTA: feedback form (repeat the ask — most people need 2-3
  touches).

Also: per GTM_STRATEGY.md's "3-2-1 rule," spend 10-15 min/day this week
leaving 3 genuinely useful comments/week on relevant HN or Reddit threads
about cloud security, AI agents, or NHI — mention AgentSentry only where it's
the natural answer, link to the feedback form when relevant.

---

## Week 4 — Traction, Feedback Loop, Milestone Check

- **Mon — Post 9 (early feedback teaser)**:
  > A week into opening the AgentSentry prototype up for real-world testing,
  > here's what people are telling us: [1-2 anonymized quotes/findings from
  > the feedback form — e.g. "install was smooth but the JSON output needs a
  > `--summary` flag" or "found a stale Lambda execution role nobody
  > remembered"].
  >
  > Already shipping fixes based on this. If you haven't tried it yet, here's
  > the same 15-minute test: [feedback form link]

- **Wed — Post 10 (traction/ask, adapted from BUILD_IN_PUBLIC_POSTS.md Post 4)**:
  Update subscriber count and mention the tester program results. If the
  newsletter-restart milestone (below) has been hit by this point, fold the
  "Blast Radius #003 is coming Tuesday" announcement into this post.

- **Fri — Post 11 (reassessment / what's next)**:
  > 4 weeks of building in public: here's where things stand — [follower
  > counts, subscriber counts, # of testers, top 1-2 pieces of feedback].
  >
  > Based on what testers told us, here's what's going into the next version:
  > [1-2 concrete items from USER_TESTING_PLAN.md's feedback synthesis].
  >
  > Blast Radius restarts Tuesday — subscribe for the full breakdown.
  > (or, if milestone not yet hit: "We're keeping this ramp-up going for
  > another couple weeks before bringing the newsletter back — here's why.")

---

## Newsletter Restart Milestone

Restart the weekly Blast Radius cadence (issue #003) at the **first** of these
to be hit, but no earlier than the end of Week 3:

- Combined LinkedIn + X follower growth reaches **+50 net new** since Week 1, Day 1, OR
- Beehiiv subscribers reach **21** (current 6 + 15 new), OR
- **8 completed** user-testing feedback form responses (from
  [USER_TESTING_PLAN.md](USER_TESTING_PLAN.md))

Whichever hits first becomes the lead story for Blast Radius #003 (e.g. "We
hit X — here's what we learned from the people who got us there").

If none of these are hit by end of Week 4, don't force it — extend the social
ramp-up by another 1-2 weeks rather than sending a newsletter with nothing new
to report. The 3-2-1 rule (3 comments/week, 2-3 social posts/week) continues
either way.

---

## Tracking

After each week, jot down (in this file or a quick note):
- Follower counts (LinkedIn, X, Bluesky) — start and end of week
- New Beehiiv subscribers
- New GitHub stars
- # of feedback form responses
- Any inbound DMs/replies worth following up on individually
- Week 1 specifically: engagement (likes/comments/shares) on the
  problem-framing posts — this tells you whether the "intensity" framing is
  landing before the reveal in Week 2

This is the data that feeds the Week 4 reassessment and the milestone check
above.
