# Security Policy

AgentSentry takes the security of its CLI, API, and web platform seriously.
We appreciate the efforts of security researchers and the community in
helping us keep AgentSentry and its users safe.

## Reporting a Vulnerability

If you discover a security vulnerability, please report it privately —
**do not open a public GitHub issue**.

- **Email:** security@agentsentry.org
- **Response SLA:** We aim to acknowledge reports within **24 hours** and
  provide a status update or remediation plan within **5 business days**.

Please include as much of the following as you can:

- A description of the vulnerability and its potential impact
- Steps to reproduce, or a proof-of-concept
- The affected component (web app, API, CLI/`nhi-audit` package)
- Any relevant logs, screenshots, or request/response samples

We ask that you give us a reasonable amount of time to investigate and
remediate an issue before any public disclosure, and that you do not access,
modify, or exfiltrate data belonging to other users while researching an
issue.

## Supported Versions

AgentSentry is under active development (currently in beta). Security fixes
are applied to the latest release of the web platform (deployed
continuously) and the latest published version of the `nhi-audit` CLI
package on PyPI. We recommend always running `pip install -U nhi-audit` to
stay on the latest version.

## Scope

In scope:

- `agentsentry.org` and its subdomains
- The AgentSentry API (`/api/*` routes)
- The `nhi-audit` CLI package (PyPI)
- This repository's source code

Out of scope:

- Third-party services we depend on (Vercel, Stripe, Resend) — please report
  those issues directly to the relevant provider
- Denial-of-service, spam, or social-engineering attacks
- Issues that require physical access to a user's device

## A Note on Authentication & Brute-Force Protection

AgentSentry's web dashboard uses **passwordless, magic-link authentication**
— there is no password to brute-force, so a traditional
"N failed login attempts → lockout" control does not apply. Instead:

- Login-link requests are rate-limited per IP address
  (`/api/auth/login`, `/api/auth/signup`).
- Magic-link tokens are single-use, cryptographically random, and expire
  after 24 hours.
- Responses to login/signup requests are generic and do not reveal whether
  an account exists for a given email, mitigating account enumeration.

## Known Accepted Risks

- `npm audit` reports a moderate-severity advisory in `postcss`, which is
  bundled as a transitive dependency of `next` (used only at build time).
  Resolving it requires a major downgrade of the Next.js framework, which is
  a larger breaking change than the risk warrants for a build-time-only
  tool with no untrusted input. We re-evaluate this when Next.js ships an
  update that resolves it.

## Acknowledgements

We're happy to credit researchers who report valid vulnerabilities (with
your permission) once a fix has shipped.
