# AgentSentry Pre-Launch Security & Privacy Checklist

**Ship Security Tools, Not Security Liabilities.**

A comprehensive checklist for launching AgentSentry with strong legal, privacy, and security posture. Check off items as you complete them.

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

## Pre-Launch Verification (Day Before)

- [ ] HTTPS working on production domain
- [ ] Privacy Policy is live and accurate
- [ ] Terms of Service are live
- [ ] Security headers correct (https://securityheaders.com)
- [ ] Database backups configured
- [ ] Error logging configured
- [ ] Stripe webhooks verified (test event successful)
- [ ] All env vars set in Vercel (no missing secrets)
- [ ] `npm run build` passes (zero errors)
- [ ] `npx tsc --noEmit` passes (zero errors)
- [ ] Manual test: signup → claim key → receive email
- [ ] Manual test: buy credits → balance updates
- [ ] Manual test: API key works with curl
- [ ] Cloudflare DNS pointing to Vercel correctly
- [ ] Rate limiting active (test: `for i in {1..10}; do curl...; done`)

---

## Launch Day

- [ ] Deploy to production (`git push origin master`)
- [ ] Verify production URL loads (no 500 errors)
- [ ] Run curl tests against production
- [ ] Check Vercel logs (Deployments → View Log)
- [ ] Monitor Stripe dashboard for first transactions
- [ ] Send announcement with Privacy Policy + Terms links

---

## Ongoing (Monthly)

- [ ] Review error logs for patterns
- [ ] Check Stripe for failed charges
- [ ] Review rate limiting logs (bots?)
- [ ] `npm update` and `npm audit`
- [ ] Check OWASP Top 10 for new CVEs
- [ ] Review user feedback for security concerns

---

**Ship security tools, not security liabilities.**
