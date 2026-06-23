import LegalShell from "@/components/legal/LegalShell";

export const metadata = {
  title: "Security — AgentSentry",
  description:
    "How AgentSentry protects your data and how to report a vulnerability. Stateless scans, magic-link auth, responsible disclosure.",
};

export default function SecurityPage() {
  return (
    <LegalShell
      eyebrow="Trust"
      title="Security"
      intro="AgentSentry is a security tool, so we hold our own platform to the same bar we help you measure."
      lastUpdated="June 23, 2026"
    >
      <div className="legal-callout">
        <p>
          <strong>Stateless by design.</strong> Scans run on your machine with your credentials. We never
          receive your cloud keys and never store your scan results — the data that would be most valuable to
          an attacker simply isn&rsquo;t on our servers.
        </p>
      </div>

      <h2>How we protect your data</h2>
      <ul>
        <li><strong>Data in transit</strong> — all traffic to the hosted service is encrypted with TLS.</li>
        <li><strong>Data at rest</strong> — we store the minimum (account email, license tier, billing reference). No credentials, no scan contents.</li>
        <li><strong>Authentication</strong> — passwordless magic-link sign-in. There is no password to phish or brute-force. Tokens are single-use, cryptographically random, and expire after 24 hours.</li>
        <li><strong>Abuse controls</strong> — login/signup requests are rate-limited per IP, and responses are generic to prevent account enumeration.</li>
        <li><strong>Open source</strong> — the CLI is AGPL-3.0 and fully auditable. You never have to take our word for what it does.</li>
      </ul>

      <h2>What the CLI sends home</h2>
      <p>
        The only network calls the CLI makes to us are license activation and (for Pro automation) a
        subscription-status check. These transmit your license key and plan — never your credentials or
        findings. Cloud API calls go directly from your machine to your cloud provider.
      </p>

      <h2>Reporting a vulnerability</h2>
      <p>
        If you discover a security issue, please report it privately — <strong>do not open a public GitHub
        issue</strong>.
      </p>
      <ul>
        <li><strong>Email:</strong> <a href="mailto:security@agentsentry.org">security@agentsentry.org</a></li>
        <li><strong>Acknowledgement:</strong> within 24 hours.</li>
        <li><strong>Status / remediation plan:</strong> within 5 business days.</li>
      </ul>
      <p>Please include a description and impact, steps to reproduce or a proof-of-concept, the affected component, and any relevant logs or samples.</p>

      <h2>Scope</h2>
      <h3>In scope</h3>
      <ul>
        <li><code>agentsentry.org</code> and its subdomains</li>
        <li>The AgentSentry API (<code>/api/*</code> routes)</li>
        <li>The <code>nhi-audit</code> CLI package on PyPI</li>
        <li>This project&rsquo;s source repository</li>
      </ul>
      <h3>Out of scope</h3>
      <ul>
        <li>Third-party services we depend on (Vercel, Stripe, Resend) — report those to the relevant provider</li>
        <li>Denial-of-service, spam, or social-engineering attacks</li>
        <li>Issues requiring physical access to a user&rsquo;s device</li>
      </ul>

      <h2>Responsible disclosure</h2>
      <p>
        Please give us a reasonable window to investigate and fix an issue before any public disclosure, and
        do not access, modify, or exfiltrate other users&rsquo; data while researching. We&rsquo;re happy to
        credit researchers who report valid issues, with your permission, once a fix has shipped.
      </p>

      <p style={{ marginTop: 36, fontSize: 14, color: "var(--text-faint)" }}>
        Machine-readable contact details are published at{" "}
        <a href="/.well-known/security.txt">/.well-known/security.txt</a>.
      </p>
    </LegalShell>
  );
}
