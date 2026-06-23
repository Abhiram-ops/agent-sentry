import LegalShell from "@/components/legal/LegalShell";

export const metadata = {
  title: "Privacy Policy — AgentSentry",
  description:
    "How AgentSentry handles your data. Your cloud credentials never leave your machine — scans run entirely on your own infrastructure.",
};

export default function PrivacyPage() {
  return (
    <LegalShell
      eyebrow="Legal"
      title="Privacy Policy"
      intro="The short version: your cloud credentials never leave your machine, and we never see the resources you scan."
      lastUpdated="June 23, 2026"
    >
      <div className="legal-callout">
        <p>
          <strong>Your credentials never leave your machine.</strong> The AgentSentry CLI
          (<code>nhi-audit</code>) makes every cloud API call locally, using credentials that stay on
          your own infrastructure. We never receive, store, or transmit your AWS, Azure, GCP, GitHub,
          or Kubernetes credentials — and we never see the identities, policies, or resources a scan finds.
        </p>
      </div>

      <h2>1. Who we are</h2>
      <p>
        AgentSentry (&ldquo;we&rdquo;, &ldquo;us&rdquo;) is an open-source security tool and the hosted
        account service available at <a href="https://agentsentry.org">agentsentry.org</a>. This policy
        explains what data the <strong>hosted service</strong> collects. The CLI is open source
        (AGPL-3.0) and you can audit exactly what it does at any time.
      </p>

      <h2>2. What we collect</h2>
      <p>We collect the minimum needed to run accounts, licensing, and billing:</p>
      <ul>
        <li><strong>Account data</strong> — your email address, used for passwordless (magic-link) sign-in.</li>
        <li><strong>License data</strong> — your license key/tier and activation timestamps, so the CLI can verify your plan.</li>
        <li><strong>Billing data</strong> — handled by Stripe. We store a customer reference and subscription status, never your card details.</li>
        <li><strong>Basic web logs</strong> — standard request metadata (IP, user agent, timestamps) for security and abuse prevention.</li>
      </ul>

      <h2>3. What we do NOT collect</h2>
      <ul>
        <li>Your cloud credentials or API keys.</li>
        <li>The contents of any scan — the identities, roles, policies, secrets, or resources AgentSentry finds.</li>
        <li>Any secret <em>values</em>. The CLI flags risky secrets locally; it never transmits them.</li>
      </ul>
      <p>
        Scan results live only on your machine (printed to your terminal, or written to the output file
        you choose). If you use the optional automation/scheduled-scan add-on, only the summary fields you
        explicitly opt into emailing are sent — never raw findings.
      </p>

      <h2>4. How we use your data</h2>
      <ul>
        <li>To authenticate you and operate your account.</li>
        <li>To validate your license tier when the CLI activates or checks your subscription.</li>
        <li>To process payments and manage subscriptions (via Stripe).</li>
        <li>To detect and prevent abuse, fraud, and security incidents.</li>
      </ul>
      <p>We do not sell your data, and we do not use it for advertising.</p>

      <h2>5. Subprocessors</h2>
      <p>We rely on a small set of trusted providers to run the hosted service:</p>
      <table>
        <thead>
          <tr><th>Provider</th><th>Purpose</th><th>Data shared</th></tr>
        </thead>
        <tbody>
          <tr><td>Vercel</td><td>Web hosting &amp; API</td><td>Account email, request logs</td></tr>
          <tr><td>Stripe</td><td>Payments &amp; subscriptions</td><td>Email, billing details</td></tr>
          <tr><td>Resend</td><td>Transactional email (magic links)</td><td>Account email</td></tr>
        </tbody>
      </table>

      <h2>6. Data retention</h2>
      <p>
        We keep account, license, and billing data for as long as your account is active. Request logs are
        retained for a limited period for security purposes and then rotated out. When you delete your
        account, we remove your personal data within 30 days, except where we are required to retain
        records (e.g. tax/billing) by law.
      </p>

      <h2>7. Your rights</h2>
      <p>
        You can request access to, correction of, or deletion of your personal data at any time. If you
        are in the EU/UK, you have rights under the GDPR including access, rectification, erasure, and
        portability. To exercise any of these, email{" "}
        <a href="mailto:privacy@agentsentry.org">privacy@agentsentry.org</a>.
      </p>

      <h2>8. Changes to this policy</h2>
      <p>
        We&rsquo;ll update this page when our practices change and revise the &ldquo;last updated&rdquo;
        date above. Material changes affecting account holders will be communicated by email.
      </p>

      <h2>9. Contact</h2>
      <p>
        Questions about privacy? Email{" "}
        <a href="mailto:privacy@agentsentry.org">privacy@agentsentry.org</a>. For security issues, see our{" "}
        <a href="/security">Security Policy</a>.
      </p>
    </LegalShell>
  );
}
