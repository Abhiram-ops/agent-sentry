import LegalShell from "@/components/legal/LegalShell";

export const metadata = {
  title: "Terms of Service — AgentSentry",
  description:
    "Terms of Service for AgentSentry. Use it only on environments you own or are authorized to audit.",
};

export default function TermsPage() {
  return (
    <LegalShell
      eyebrow="Legal"
      title="Terms of Service"
      intro="Use AgentSentry only on infrastructure you own or have explicit permission to audit."
      lastUpdated="June 23, 2026"
    >
      <div className="legal-callout">
        <p>
          <strong>Authorized use only.</strong> AgentSentry is a defensive security tool. You may run it
          only against cloud accounts, identities, and systems that you own or are explicitly authorized to
          assess. Scanning infrastructure you do not have permission to audit may be illegal and is strictly
          prohibited.
        </p>
      </div>

      <h2>1. Acceptance</h2>
      <p>
        By installing the <code>nhi-audit</code> CLI or using the hosted service at{" "}
        <a href="https://agentsentry.org">agentsentry.org</a>, you agree to these Terms. If you are using
        AgentSentry on behalf of an organization, you represent that you are authorized to accept these
        Terms for that organization.
      </p>

      <h2>2. Permitted use</h2>
      <ul>
        <li>Auditing non-human identities and AI-agent attack surface in environments you own.</li>
        <li>Auditing environments you have been explicitly authorized (in writing) to assess — e.g. as an employee, contractor, or engaged penetration tester.</li>
        <li>Security research and education on systems you control.</li>
      </ul>

      <h2>3. Prohibited use</h2>
      <ul>
        <li>Scanning, probing, or assessing any system you do not own or lack authorization to test.</li>
        <li>Using AgentSentry to gain unauthorized access, exfiltrate data, or cause harm.</li>
        <li>Reselling or rebranding the hosted service without a separate written agreement.</li>
        <li>Circumventing license enforcement or sharing paid license keys.</li>
      </ul>

      <h2>4. Licensing — open source and commercial</h2>
      <p>
        The AgentSentry CLI is free and open source under the{" "}
        <a href="https://www.gnu.org/licenses/agpl-3.0.html">GNU AGPL-3.0-or-later</a> license. You are free
        to use, modify, and self-host it under the terms of that license.
      </p>
      <p>
        <strong>Note on the AGPL:</strong> if you modify AgentSentry and make it available to others over a
        network (for example, building it into a hosted product), the AGPL requires you to release your
        corresponding source under a compatible license. Organizations that want to embed AgentSentry into a
        proprietary or closed-source product can obtain a separate commercial license that lifts this
        obligation — contact <a href="mailto:licensing@agentsentry.org">licensing@agentsentry.org</a>.
      </p>
      <p>
        Paid &ldquo;Pro&rdquo; and add-on features of the hosted service are provided under these Terms, not
        under the AGPL, and are subject to your active subscription.
      </p>

      <h2>5. Accounts &amp; billing</h2>
      <p>
        Paid plans are billed through Stripe on a recurring basis until cancelled. You can cancel anytime;
        access continues until the end of the current billing period. Fees are non-refundable except where
        required by law.
      </p>

      <h2>6. No warranty</h2>
      <p>
        AgentSentry is provided <strong>&ldquo;as is&rdquo;</strong>, without warranty of any kind. It is a
        risk-assessment aid, not a guarantee of security. A clean scan does not mean an environment is free
        of risk, and findings are heuristic. You remain responsible for your own security decisions.
      </p>

      <h2>7. Limitation of liability</h2>
      <p>
        To the maximum extent permitted by law, AgentSentry and its author shall not be liable for any
        indirect, incidental, or consequential damages arising from your use of the tool or service. For the
        hosted service, total liability is limited to the amount you paid in the 12 months preceding the
        claim.
      </p>

      <h2>8. Termination</h2>
      <p>
        We may suspend or terminate access to the hosted service for violations of these Terms, including
        unauthorized scanning. The open-source CLI remains available to you under the AGPL regardless.
      </p>

      <h2>9. Changes</h2>
      <p>
        We may update these Terms; the &ldquo;last updated&rdquo; date reflects the latest version. Continued
        use after changes constitutes acceptance.
      </p>

      <h2>10. Contact</h2>
      <p>
        Questions about these Terms? Email{" "}
        <a href="mailto:support@agentsentry.org">support@agentsentry.org</a>.
      </p>
    </LegalShell>
  );
}
