# AgentSentry Pre-Launch Security, Privacy & GTM Checklist

**Ship Security Tools, Not Security Liabilities.**

A comprehensive checklist for launching AgentSentry with strong legal, privacy, security, and commercial readiness. Check off items as you complete them.

---

## 01 — Legal & Open Source

- [ ] **AGPL-3.0 License properly declared**
  - LICENSE file exists at repo root ✓
  - package.json has `"license": "AGPL-3.0-or-later"` ✓
  - GitHub repo shows license badge in README
  - CONTRIBUTING.md explains license terms to contributors

- [ ] **Terms of Service page exists**
  - Covers free tier usage limits
  - Covers Pro tier obligations
  - Explains data handling (what we store, what we don't)
  - Specifies that scan output is NOT stored on our servers (CLI runs locally)
  - Limits liability for security findings accuracy

- [ ] **Privacy Policy page exists**
  - Clearly states what data we collect: emails (signup, claims, contact), usage metadata (scan counts, not scan data)
  - States where data is stored: Vercel Postgres (US region), Resend (email), Stripe (payments)
  - Specifies we do NOT collect or store scan output, credentials, or cloud provider data
  - Includes GDPR/CCPA compliance info
  - Includes data deletion request procedure
  - Includes cookie consent banner (for Cloudflare analytics if enabled)

- [ ] **README has security disclaimer**
  - Clearly states: "AgentSentry outputs risk scores. Security findings are indicators, not guarantees. Always verify with your security team."
  - Explains the PREA scoring model is heuristic-based
  - Links to full documentation for score interpretation

- [ ] **Contact info available for security issues**
  - Have a security.txt file or security contact email
  - Respond to security reports within 24 hours
  - Have a responsible disclosure policy

---

## 02 — Security Basics

### Web Infrastructure

- [ ] **HTTPS everywhere**
  - All pages and APIs are HTTPS-only ✓ (Vercel auto-enables)
  - No mixed content (no http:// resources on https pages)
  - HSTS header is set (Vercel default: max-age=31536000)

- [ ] **Security headers configured**
  - Content-Security-Policy: Restrict script/style/image sources
  - X-Frame-Options: DENY (prevent clickjacking)
  - X-Content-Type-Options: nosniff
  - Referrer-Policy: strict-origin-when-cross-origin
  - Permissions-Policy: Disable unnecessary features

- [ ] **CORS is properly configured**
  - API endpoints only accept requests from known origins
  - Credentials marked HttpOnly, Secure, SameSite=Strict

### Authentication & Authorization

- [ ] **API key handling is secure**
  - API keys generated as cryptographically random strings (64+ chars)
  - Keys hashed before storage (never plaintext)
  - Keys marked HttpOnly, Secure
  - API key rotation supported

- [ ] **Session security is sound**
  - Session tokens expire after 24 hours inactivity
  - Sessions invalidate on logout
  - Tokens are cryptographically random
  - Sessions tied to user ID, not email

### Input Validation

- [ ] **All user inputs validated**
  - Email format validation (frontend + backend)
  - Credit amounts are positive integers only
  - Scan metadata JSON schema validated
  - SQL queries use parameterized statements (no string concat)

- [ ] **No SQL injection possible**
  - All database queries use prepared statements
  - Test with: `' OR 1=1 --`, `"; DROP TABLE --`
  - Example: `SELECT * FROM users WHERE api_key = ?` (NOT string interpolation)

- [ ] **No XSS (Cross-Site Scripting) possible**
  - All user-generated content HTML-escaped
  - No `dangerouslySetInnerHTML` in React
  - Content-Security-Policy blocks inline scripts
  - Test: try `<script>alert('xss')</script>` in signup email

---

## 03 — Secrets & API Keys

### Environment Variables

- [ ] **All secrets in .env files, NOT in code**
  - `grep -r 'sk_' frontend/src` → no hardcoded Stripe keys
  - All secrets from `process.env.*` only

- [ ] **`.env.local` and `.env.*.local` in `.gitignore`**
  - `git status` → should NOT show .env files
  - `git log --all --full-history -- .env` → empty

- [ ] **No secrets in frontend/client code**
  - STRIPE_PUBLISHABLE_KEY is OK (public)
  - STRIPE_SECRET_KEY backend-only
  - RESEND_API_KEY backend-only
  - DevTools → no `sk_test_` visible

- [ ] **API responses don't leak sensitive data**
  - Error messages generic ("Invalid email or password", not "Email not found")
  - No database structure exposure in errors

### Third-Party Integrations

- [ ] **Stripe keys server-side only**
  - STRIPE_SECRET_KEY only in `/api/billing/webhook` and `/api/billing/create-checkout`
  - Webhook signing verified: `stripe.webhooks.constructEvent(body, sig, secret)`

- [ ] **Resend API key server-side only**
  - RESEND_API_KEY only in email routes
  - Rate limited

- [ ] **Vercel Postgres connection server-side only**
  - `@vercel/postgres` imported only in API routes
  - `POSTGRES_URL` NOT in frontend bundles
  - `npm run build` → check `.next/static` (should be absent)

---

## 04 — Abuse Prevention

### Rate Limiting

- [ ] **All public API endpoints have rate limits**
  - `/api/auth/signup`: 5 per IP per hour
  - `/api/usage/deduct`: 100 per API key per hour
  - `/api/contact`: 3 per IP per day

- [ ] **Auth endpoints have strict limits**
  - `/api/auth/login`: 5 failed attempts → 15 min lockout
  - Lockout by IP (prevents email enumeration)

- [ ] **Billing protection in place**
  - Stripe spend limit set ($100/month or custom)
  - Billing alerts enabled (> $50/day)
  - Monitor unusual patterns (1000 requests in 1 min = bot)

### Input Abuse

- [ ] **No spam in contact forms**
  - Honeypot field: hidden "website" input
  - Rate limit: 3 per IP per day
  - Content check: block spam patterns

- [ ] **Email validation prevents abuse**
  - Block disposable domains (tempmail, 10minutemail)
  - Verification email before activation
  - Unverified emails can't claim free keys

### Suspicious Activity Monitoring

- [ ] **Logging for unusual patterns**
  - Log all `/api/usage/deduct` calls (user_id, credits, timestamp)
  - Alert if user burns 100+ credits in < 1 hour
  - Alert if same IP creates 50+ accounts in 1 day

- [ ] **Abuse response plan exists**
  - Process to ban accounts (set `disabled_at` flag)
  - Process to refund fraudulent Stripe charges
  - Response template for security incidents

---

## 05 — Open Source & Community Security

- [ ] **Security policy documented**
  - SECURITY.md in repo root
  - Explains how to report vulnerabilities privately
  - SLA: "We'll respond within 24 hours"

- [ ] **Dependencies checked for vulns**
  - `npm audit` passes (no critical/high severity)
  - Dependabot alerts enabled on GitHub
  - `package-lock.json` locked

- [ ] **Code review process in place**
  - All merges to master require review
  - Security-sensitive changes need 2 approvals

- [ ] **Public transparency about limitations**
  - README warns: PREA scoring is heuristic-based
  - Docs explain: AgentSentry finds identities, not vulnerabilities
  - Known limitations documented

---

## 06 — Data Handling & GDPR

- [ ] **We only collect what we need**
  - Signup: email only ✓
  - Contact form: name, email, message only ✓
  - Usage tracking: user_id, action, credits_consumed (no scan output)

- [ ] **Data retention policy set**
  - Inactive users (1 year): delete after 30-day notice
  - Contact submissions: delete after 90 days
  - Credit transactions: retain 3 years (tax requirement)

- [ ] **GDPR compliance**
  - Data deletion endpoint: `/api/user/delete` (requires email verification)
  - Data export endpoint: `/api/user/export` (returns JSON)
  - Privacy policy explains DPA terms

- [ ] **We don't store scan output**
  - CLI runs locally; we never see scan data ✓
  - `/api/usage/deduct` only logs metadata
  - Cloud enumeration data never leaves user's machine

---

## 07 — CLI-Specific Security

- [ ] **API key security in CLI**
  - Key stored in `~/.agentsentry/config` (chmod 600)
  - Key never logged or echoed to stdout
  - Verbose output doesn't reveal key

- [ ] **Credential handling during scans**
  - AWS/Azure/GCP credentials via env vars (not stored by CLI)
  - CLI never sends credentials to our servers
  - Scan output is local-only (not uploaded unless user explicitly does so)

- [ ] **Scan output safety**
  - Results printed to stdout
  - Export (JSON, HTML) saves locally
  - If `--send-results` exists: requires explicit confirmation

---

## 08 — Monitoring & Incident Response

- [ ] **Error tracking enabled**
  - Sentry or similar configured (optional but recommended)
  - Backend errors logged (stack traces not shown to users)
  - Review logs weekly for patterns

- [ ] **Incident response plan exists**
  - Contact list (you, co-founders, legal)
  - Breach notification template
  - Plan for revoking compromised API keys

- [ ] **Backup & disaster recovery**
  - Vercel Postgres has automated backups ✓
  - Can restore to point-in-time
  - Test restoration process

---

## 09 — Compliance & Security Verification (Market-Ready)

- [ ] **Third-Party Security Audit**
  - Schedule pentest with reputable firm (HackerOne, Intigriti, or similar)
  - Fix critical/high findings before launch
  - Keep audit report for enterprise sales materials

- [ ] **Source Code Audit**
  - Review for hardcoded secrets, insecure patterns
  - Check dependencies for known CVEs
  - Document audit results for customer requests

- [ ] **Data Privacy Compliance**
  - Privacy Policy covers GDPR, CCPA, LGPD
  - Data residency: document where Vercel Postgres stores data (US)
  - Ability to delete user data on request
  - Data retention policy for logs/transactions (90 days for logs, 3 years for billing)

- [ ] **Industry Certifications (Enterprise)**
  - SOC 2 Type II: if targeting enterprise (expensive, but worth it for $50k+ deals)
  - ISO 27001: optional but adds credibility
  - Start SOC 2 process before launch (takes 6 months)

- [ ] **Responsible Disclosure Policy**
  - Security.md in repo with contact email (security@agentsentry.org)
  - Clear process: researcher reports → you investigate → patch → credit researcher
  - SLA: respond within 24 hours

---

## 10 — Product & Technical Readiness (Go-To-Market)

- [ ] **MVP Feature Complete**
  - CLI scans AWS, Azure, GCP (minimum 3 cloud providers)
  - PREA scoring works end-to-end
  - Dashboard shows results + credits + usage
  - API is stable and documented

- [ ] **Integration Ecosystem**
  - API is REST, documented, rate-limited, versioned
  - Webhooks for scan completion (optional, nice to have)
  - Integration examples: curl, Python SDK, Node.js SDK (at least curl in docs)
  - SIEM/SOAR integrations: not MVP, but plan for roadmap

- [ ] **Scalability & Performance**
  - Benchmark scan speed (target: <30s for small AWS account)
  - API response time <200ms (p95)
  - Handle 1000 concurrent users without degradation
  - Load test before launch (k6, artillery, or similar)

- [ ] **Deployment Options**
  - SaaS: agentsentry.org (primary) ✓
  - CLI: `pip install agentsentry` (primary) ✓
  - Docker: optional Dockerfile for local scanning
  - On-premises: document how to run locally (no cloud communication required)

- [ ] **False Positive Rate**
  - Document expected accuracy (e.g., "PREA scoring has X% false positive rate in Y test cases")
  - Compare to industry benchmarks (Prowler, CloudMapper, similar tools)
  - Be honest about limitations: PREA is heuristic, not ground truth

---

## 11 — Pricing & Licensing (Business Model)

- [ ] **Pricing Strategy Defined**
  - Free tier: 1 scan/day, basic report (drive adoption)
  - Pro tier: $15/month, unlimited scans, export to JSON/PDF (convert power users)
  - Enterprise: custom pricing, MSP support, SLA (land big deals)
  - OR: Credit-based (current model) — document per-scan costs clearly

- [ ] **Free Trial / POC Framework**
  - Free tier available without credit card (low friction)
  - Pro trial: 14 days free (requires card, no charge)
  - POC checklist: "Scan your AWS account, see results in 5 min"
  - Case study template: before/after PREA scores

- [ ] **Licensing & Terms Clear**
  - AGPL-3.0 license is explicit in Terms of Service
  - If customers fork: they must open-source modifications
  - Commercial exception available (e.g., "pay $X/month for closed-source license")
  - Document for legal/procurement teams

---

## 12 — Go-To-Market (GTM) & Sales Enablement

- [ ] **Value Proposition Documented**
  - Unique differentiator: "Only tool that audits AI agent codebases" or "10x faster NHI discovery"
  - ROI story: "Identify agent escalation risk before production deployment"
  - Comparison matrix: AgentSentry vs. Prowler, CloudMapper, etc.
  - Customer testimonial or case study (even from friendly beta user)

- [ ] **Sales Collateral Ready**
  - Data sheet (1-pager): what it does, features, pricing, contact
  - ROI calculator: "If your team spends 2h/week on manual audit, save $X/month with AgentSentry"
  - Battlecard: "When competing against X tool, here's why you win"
  - Demo video: 2–3 min walkthrough (optional but effective)

- [ ] **Technical Documentation Complete**
  - API reference: all endpoints, auth, rate limits, examples
  - Deployment guide: SaaS, CLI, Docker, on-premises
  - Troubleshooting: common errors, FAQ
  - Video tutorials: scan your first account, read PREA scores, export results

- [ ] **Partner Programs (Optional for MVP)**
  - MSP/MSSP partnerships: approach 5–10 managed security service providers
  - Integration partners: Slack, PagerDuty, DataDog (optional, post-MVP)
  - Referral program: offer discount for customer referrals (simple to start)
  - Reseller agreement: allow consultancies to bundle AgentSentry

- [ ] **Brand & Website**
  - Homepage clearly explains: what it does, who it's for, pricing
  - Blog/content: "AI Agent Security in 2026", "Why NHI Auditing Matters", case studies
  - Social proof: GitHub stars badge, testimonials, customer logos (even anon: "Fortune 500 company")
  - Media kit: press release template, screenshots, logos for press coverage

---

## 13 — Launch & Post-Launch Support

- [ ] **Beta Testing Program**
  - 10–20 friendly beta users (security practitioners, DevOps teams, AI engineers)
  - Private Slack or Discord for feedback
  - Collect: feature requests, pain points, early wins
  - Generate case study: "Company X discovered Y risk with AgentSentry"
  - Offer free Pro tier or discount in exchange for testimonial

- [ ] **Customer Support Ready**
  - Email support (support@agentsentry.org via ImprovMX)
  - Discord/Slack community (optional but builds engagement)
  - SLA: respond within 24 hours for Tier 1
  - Support runbook: common issues, troubleshooting steps
  - Escalation path: you → co-founders → paid support (if enterprise)

- [ ] **Telemetry & Monitoring**
  - Sentry or similar for error tracking (log exceptions, not PII)
  - Product telemetry: track signups, scans, feature usage (anonymized)
  - Dashboard: daily active users, MRR, churn rate, support tickets
  - Weekly review: adoption trends, bottlenecks, feature requests

- [ ] **Continuous Improvement**
  - Weekly: review user feedback, prioritize bugs
  - Monthly: product updates, feature releases
  - Quarterly: security updates, dependency updates, SOC 2 evidence collection
  - Yearly: retrospective, roadmap planning, pricing review

- [ ] **Post-Launch Marketing**
  - Day 1: Twitter/LinkedIn announcement (target: security influencers, DevSecOps community)
  - Week 1: ProductHunt submission (organic upvote from friendly users)
  - Month 1: blog post "We're in beta", case study, guest post on security blogs
  - Month 2+: talks at conferences, podcast appearances, thought leadership

- [ ] **Customer Feedback Loop**
  - NPS survey: monthly (target: >40 for SaaS)
  - Exit interview: when users churn, understand why
  - Feature request tracker: public roadmap (https://roadmap.agentsentry.org)
  - Community engagement: respond to GitHub issues, Reddit mentions, HN comments

---

## Pre-Launch Checklist (Compliance + Commercial)

**Security & Compliance:**
- [ ] Privacy Policy live and accurate
- [ ] Terms of Service live
- [ ] Security.md exists (responsible disclosure)
- [ ] Third-party pentest complete (or scheduled)
- [ ] Source code audit done
- [ ] No hardcoded secrets in codebase

**Commercial Readiness:**
- [ ] Pricing clearly defined and documented
- [ ] Data sheet and sales materials ready
- [ ] Free tier / trial experience is frictionless
- [ ] API documentation complete
- [ ] Beta users onboarded (at least 5)
- [ ] Support process documented

**Technical:**
- [ ] `npm run build` passes
- [ ] `npx tsc --noEmit` passes
- [ ] Scans complete without errors
- [ ] PREA scores are accurate (manual validation against test cases)
- [ ] CLI and web interface are stable
- [ ] Monitoring/telemetry is active

---

## Launch Day Checklist

- [ ] Deploy to production (`git push origin master`)
- [ ] All health checks passing (uptime monitor, error tracking)
- [ ] Send announcement email to beta users
- [ ] Post on Twitter/LinkedIn/ProductHunt
- [ ] Monitor error logs for first 24 hours
- [ ] Respond to early feedback within 1 hour

---

## Post-Launch (First Month)

- [ ] Daily: check support emails, Slack, error logs
- [ ] Weekly: user feedback review, bug prioritization
- [ ] Week 2: first public case study or blog post
- [ ] Week 3: feature update (show momentum)
- [ ] Week 4: retrospective (what worked, what didn't, adjust)

---

**Ship security tools, not security liabilities.**
