# Real-World User Testing Plan

**Scope:** the combined prototype — website signup, CLI activation, running a
scan, and reading results (CLI output + dashboard). Goal: find friction points
in the *first 15 minutes* of a new user's experience, before building the
"final version."

**Timing:** runs alongside [SOCIAL_MEDIA_CALENDAR.md](SOCIAL_MEDIA_CALENDAR.md)
Week 3-4 (the public-call weeks), but the feedback form and recruitment can go
live as soon as this plan is approved — no need to wait.

---

## 1. The Test Script (what a tester actually does)

This is the exact flow we're asking testers to run, end-to-end. Keep it under
15 minutes total.

1. **Sign up** at agentsentry.org/signup (email + password).
2. **Land on the dashboard** — find the activation code and API key.
3. **Install the CLI**: `pip install nhi-audit`
4. **Activate**: `agentsentry activate <code-from-dashboard>`
   - Confirm it shows "License activated successfully" with the right tier
     (Community/Pro).
5. **Run a scan** — give testers a choice based on comfort level:
   - No-credentials option: `agentsentry scan mock` (safe demo, always works)
   - Real option: `agentsentry scan local` (scans their own machine/repo for
     SSH keys, `.env` files, Docker configs — read-only)
   - For the more technical/security-engineer testers:
     `agentsentry scan aws` / `agentsentry scan github --enrich` (their own
     cloud/GitHub, with whatever credentials they already have configured)
6. **Read the results** — in the terminal output, and then back on
   agentsentry.org/dashboard to see if/how results surface there.
7. **Fill out the feedback form** (link provided in every recruitment post —
   see Section 3).

---

## 2. What We're Trying to Learn (maps to feedback form sections)

- **Install friction**: did `pip install nhi-audit` just work? Python version
  issues, PATH issues, OS-specific problems (especially Windows)?
- **Activation friction**: was the activation code easy to find on the
  dashboard? Did `agentsentry activate` give a clear success/error message?
- **Scan experience**: which scan command did they run? Did it run in a
  reasonable time? Did the output make sense without reading docs first?
- **Output clarity**: do they understand what a "risk score" of 42.5 means
  without explanation? Is the PREA breakdown (P/R/E/A) self-explanatory or
  confusing?
- **False positives / surprises**: did the scan flag something they disagreed
  with, or miss something they expected it to catch?
- **Dashboard vs. CLI**: do they expect scan results to show up in the
  dashboard? Is the disconnect between "CLI does the work" and "dashboard
  shows account/billing" confusing?
- **Would they use it again / recommend it**: simple NPS-style question.

---

## 3. Recruitment (three channels, run in parallel)

### A. Beehiiv newsletter + existing social followers
- Add a short call-to-action to Blast Radius #002 (sends Tue, June 16, 2026)
  and to the Week 1-2 social posts: "We're looking for 10-15 people to test
  the full signup → scan → results flow and tell us what's confusing. 15
  minutes, free, and the first 10 get a 1:1 walkthrough." Link to the
  feedback form (which doubles as the signup for testing).
- Low volume (6 subscribers) but highest-quality responses — these are people
  already engaged with the project.

### B. Public call (Reddit / Hacker News / Show HN)
- **Show HN** post (Week 3, Monday — see SOCIAL_MEDIA_CALENDAR.md): "Show HN:
  AgentSentry — open-source NHI & AI agent risk scanner, looking for testers
  for the new dashboard + CLI flow."
- **r/netsec** and **r/devops**: problem-first framing per GTM_STRATEGY.md
  templates ("I ran this on my own AWS account and found X — looking for
  people to try it on theirs and tell me what's broken").
- Each post links directly to the feedback form. Respond to every comment
  within the first few hours (per GTM_STRATEGY.md's "respond to everyone"
  principle) — early responsiveness drives more signups than the post itself.

### C. Structured feedback form
- Build in Tally (free, faster to set up than Google Forms, nicer UI) or
  Google Forms if Tally isn't accessible.
- Form does double duty: **first question asks for email** (optional) so we
  can follow up / send the walkthrough invite to the first 10 responders.
- See Section 4 for the question list.

---

## 4. Feedback Form — Question List

**Intro text:** "This takes about 10-15 minutes if you run through the test
script, or 2 minutes if you just want to give feedback on the idea. Everything
is anonymous unless you give us your email."

1. Email (optional — for walkthrough invite / follow-up)
2. Did you complete the full flow (signup → CLI activate → scan → results)?
   - Yes, all of it / Partially — got stuck at [free text] / No, just
     skimming the site
3. OS / environment: Windows / Mac / Linux / WSL
4. **Install**: Did `pip install nhi-audit` work without issues? (Yes / No +
   free text for the error)
5. **Activation**: Was the activation code easy to find on the dashboard?
   (1-5 scale) + Did `agentsentry activate` give a clear result? (Yes/No)
6. **Scan**: Which command did you run? (`scan mock` / `scan local` /
   `scan aws` / `scan github` / other)
7. **Output clarity**: On a scale of 1-5, how well did you understand the
   risk score and findings without reading docs?
8. **False positives/negatives**: Did anything in the results seem wrong,
   surprising, or like it was missing? (free text)
9. **Dashboard**: Did you expect to see your scan results on the
   agentsentry.org dashboard? Were you confused about what the dashboard
   does vs. the CLI? (free text)
10. **Overall**: How likely are you to use AgentSentry again or recommend it?
    (1-10)
11. What's the ONE thing that would make this better? (free text — this is
    the most important question)
12. Anything else? (free text)

---

## 5. Timeline

| Week | Activity |
|------|----------|
| Now | Build feedback form, finalize this plan |
| Week 1-2 (social calendar) | Soft-mention testing program is coming (Post 7 teaser) |
| Week 3 | Public call goes live (Show HN, r/netsec, r/devops) + Beehiiv/social CTA. Aim for 10-15 responses. |
| Week 4 | Continue collecting responses, do 1:1 walkthroughs with first 10 responders, post early findings (Post 10) |
| Week 5+ | Synthesize feedback (Section 6), prioritize, start building the "final version" |

---

## 6. From Feedback to "Final Version" (next phase, not started)

Once responses come in:
- Group feedback into: (a) bugs/blockers (fix immediately, doesn't wait for a
  "version"), (b) clarity issues in CLI output or dashboard copy (cheap UX
  fixes), (c) feature gaps (e.g. "I wanted to see scan history in the
  dashboard") — these define the "final version" scope.
- The most common single ask across responses becomes the headline feature
  for the next release; report it in Blast Radius #003+ as "here's what
  testers told us, here's what we built."
- This phase isn't scoped yet — revisit after Week 4 results are in.
