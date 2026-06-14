# Blast Radius #002 — Draft

**Status:** Draft for Beehiiv (paste into a new post at https://app.beehiiv.com — publication "Blast Radius by AgentSentry")
**Suggested send:** Tuesday, June 16, 2026, 14:00 UTC (keeps the weekly Tuesday cadence from #001)
**Subject line:** Blast Radius #002 — We Scanned Our Own Repo
**Preview text:** What AgentSentry found when we pointed it at agent-sentry itself

---

Hey,

Last week I promised one finding, one AI angle, and one command, every Tuesday. This week I turned the scanner on the thing that builds it.

Here's what happened when I ran AgentSentry against our own GitHub repo.

THIS WEEK'S BLAST RADIUS

Finding: a CI bot's Personal Access Token with full `repo` scope (read + write + admin on hooks), used for exactly one job — tagging releases.

Score: P=8.5, R=2.0, E=2.5, A=1.0 → Risk ≈ 42.5 (HIGH)

Why it matters: the token could push to any branch, delete the repo, or rewrite Actions workflows — but the workflow that actually uses it only needs `contents: write` on tags. Classic over-provisioning: someone picked the broadest token because it was the fastest to set up, and it's been sitting in a repo secret ever since.

The fix: swap the PAT for a fine-grained token scoped to "Contents: write" only, or better, use GitHub's built-in `GITHUB_TOKEN` with explicit `permissions:` in the workflow YAML. Either way:

```
agentsentry scan github --enrich
```

AgentSentry flags every token/secret with broader scope than its workflow needs, and tells you exactly which permission to drop.

THE AI ANGLE

A pattern I keep seeing as AI coding assistants get repo access: the assistant is given a token "to open PRs," and that token turns out to have `repo` (full read/write) instead of `pull_requests: write` + `contents: read`.

Normally that's a shrug. Then someone pastes an issue with a hidden instruction into the repo, the assistant reads it as part of "context," and now a prompt injection has write access to your default branch — not because the AI was compromised, but because the credential it was handed was never scoped to what it actually does.

This is the same AI-Amplification math as always: the agent doesn't just have the access, it *acts* on it, repeatedly, at machine speed, with no human checkpoint. Scope the token to the task, not the convenience.

TOOL UPDATE

v0.1.7 is live — and so is the new site (agentsentry.org got a full redesign this week: new look, working interactive terminal demo on the homepage, updated docs).

What's new in v0.1.7:

* Postgres-backed rate limiting on signup/contact endpoints (no more spammable forms)
* Stricter email validation across the web dashboard
* CLI license file now written with `chmod 600` on Linux/Mac — your activation key isn't world-readable anymore
* License cleared up across the board: AgentSentry is **AGPL-3.0**, matching what's actually in the `LICENSE` file (previously some docs said MIT — fixed everywhere)

Install or upgrade:

```
pip install nhi-audit --upgrade
agentsentry scan github --enrich
```

ONE COMMAND

If you maintain any GitHub repo with Actions, run this against it:

```
agentsentry scan github --enrich
```

It'll list every PAT, deploy key, and Actions secret it can see, flag the ones with more scope than their workflow uses, and enrich CRITICAL findings with CISA KEV intel.

BUILDING IN PUBLIC

Quick numbers update, because building in public means sharing the unglamorous parts too: Blast Radius has 6 subscribers as I write this. Small, but every one of you opened issue #1 (50% open rate — thank you).

If this newsletter is useful, the highest-leverage thing you can do is forward this issue to one person who manages cloud or GitHub access at their company. That's literally how #1 got its first new subscribers.

COMMUNITY

Got a finding from your own repo or cloud account you want broken down? Hit reply (anonymized output welcome) and I'll cover it in #003.

Repo's open, issues and PRs welcome: [github.com/Abhiram-ops/agent-sentry](https://github.com/Abhiram-ops/agent-sentry)

Until next Tuesday,

Abhiram Lanka
Builder of AgentSentry | Andhra University CS
