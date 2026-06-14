import { Resend } from 'resend';
import type { Tier, ScanReportSummary } from '@/lib/db';

const FROM = 'AgentSentry <noreply@agentsentry.org>';
const REPLY_TO = 'support@agentsentry.org';

function dashboardUrl(): string {
  return `${process.env.NEXT_PUBLIC_SITE_URL ?? 'https://agent-sentry-beta.vercel.app'}/dashboard`;
}

function shell(title: string, bodyHtml: string): string {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="background:#0a0f0d;color:#fff;font-family:monospace;padding:40px 20px;max-width:600px;margin:0 auto;">
  <div style="text-align:center;margin-bottom:32px;">
    <span style="color:#00ff88;font-size:2rem;">&#11041;</span>
    <h1 style="color:#00ff88;margin:8px 0;font-size:1.4rem;letter-spacing:0.1em;">AGENTSENTRY</h1>
    <p style="color:rgba(255,255,255,0.5);margin:0;font-size:0.85rem;">${title}</p>
  </div>
  ${bodyHtml}
  <hr style="border:none;border-top:1px solid rgba(255,255,255,0.1);margin:32px 0;">
  <p style="color:rgba(255,255,255,0.3);font-size:0.75rem;text-align:center;">
    AgentSentry &middot;
    <a href="https://agent-sentry-beta.vercel.app" style="color:rgba(255,255,255,0.4);">agent-sentry-beta.vercel.app</a>
  </p>
</body>
</html>`;
}

function codeBlock(label: string, code: string): string {
  return `<div style="background:#000;border:1px solid #00ff88;border-radius:8px;padding:20px;margin:24px 0;text-align:center;word-break:break-all;">
    <p style="color:rgba(255,255,255,0.5);margin:0 0 8px;font-size:0.75rem;letter-spacing:0.2em;">${label}</p>
    <p style="color:#00ff88;font-size:1.1rem;font-weight:700;margin:0;letter-spacing:0.03em;">${code}</p>
  </div>`;
}

/**
 * Sends an email via Resend. Returns false (and logs) on any failure or when
 * RESEND_API_KEY is unset, so callers never 500 because of a transient email
 * problem.
 */
async function send(to: string, subject: string, html: string): Promise<boolean> {
  if (!process.env.RESEND_API_KEY) {
    console.warn('[email] RESEND_API_KEY not set — skipping email to', to);
    return false;
  }
  try {
    const resend = new Resend(process.env.RESEND_API_KEY);
    await resend.emails.send({ from: FROM, to, subject, html, replyTo: REPLY_TO });
    return true;
  } catch (err) {
    console.error('[email] send failed', err);
    return false;
  }
}

/** Sends a plain-text email via Resend with a custom from/reply-to — used outside the branded shell (contact form, newsletter). */
export async function sendPlainEmail(opts: {
  to: string;
  subject: string;
  text: string;
  from: string;
  replyTo?: string;
}): Promise<boolean> {
  if (!process.env.RESEND_API_KEY) {
    console.warn('[email] RESEND_API_KEY not set — skipping email to', opts.to);
    return false;
  }
  try {
    const resend = new Resend(process.env.RESEND_API_KEY);
    await resend.emails.send({
      from: opts.from,
      to: opts.to,
      subject: opts.subject,
      text: opts.text,
      replyTo: opts.replyTo,
    });
    return true;
  } catch (err) {
    console.error('[email] send failed', err);
    return false;
  }
}

/** Trigger 1: emails a newly-signed-up user their free activation code. */
export function sendActivationCodeEmail(email: string, code: string, tier: Tier): Promise<boolean> {
  const label = tier === 'pro' ? 'YOUR PRO ACTIVATION CODE' : 'YOUR FREE ACTIVATION CODE';
  const tierName = tier === 'pro' ? 'Pro' : 'Free';
  const html = shell(
    `${tierName} activation code`,
    `<p style="color:rgba(255,255,255,0.9);font-size:1rem;">Welcome to AgentSentry ${tierName}.</p>
     <p style="color:rgba(255,255,255,0.7);">Activate the CLI on your machine with this code:</p>
     ${codeBlock(label, code)}
     <div style="background:#000;border-radius:6px;padding:16px;margin:16px 0;">
       <code style="color:#00ff88;font-size:0.9rem;">agentsentry activate ${code}</code>
     </div>
     <p style="color:rgba(255,255,255,0.5);font-size:0.85rem;">
       ${
         tier === 'pro'
           ? 'Pro unlocks every cloud scanner (AWS, Azure, GCP, GitHub, K8s) plus blast-radius analysis.'
           : 'Free includes <strong>scan local</strong> and <strong>scan mock</strong>. Upgrade to Pro for the cloud scanners and blast radius.'
       }
     </p>`,
  );
  return send(email, `Your AgentSentry ${tierName} activation code`, html);
}

/** Pro-upgrade flow: emails the freshly-issued AS-PRO code. */
export function sendProCodeEmail(email: string, code: string): Promise<boolean> {
  return sendActivationCodeEmail(email, code, 'pro');
}

function buttonBlock(label: string, href: string): string {
  return `<div style="text-align:center;margin:28px 0;">
    <a href="${href}" style="display:inline-block;background:#00ff88;color:#000;font-weight:700;text-decoration:none;padding:14px 32px;border-radius:8px;font-size:0.95rem;">${label}</a>
  </div>
  <p style="color:rgba(255,255,255,0.4);font-size:0.75rem;word-break:break-all;text-align:center;">
    Or paste this link into your browser:<br>
    <a href="${href}" style="color:rgba(0,255,136,0.7);">${href}</a>
  </p>`;
}

/** Web login: emails a one-time magic link that signs the user in. */
export function sendLoginLinkEmail(email: string, link: string): Promise<boolean> {
  const html = shell(
    'Sign in to your dashboard',
    `<p style="color:rgba(255,255,255,0.9);font-size:1rem;">Click the button below to sign in to your AgentSentry dashboard.</p>
     ${buttonBlock('Sign in to AgentSentry', link)}
     <p style="color:rgba(255,255,255,0.5);font-size:0.85rem;">
       This link expires in 24 hours and can only be used once. If you didn't request it, you can safely ignore this email.
     </p>`,
  );
  return send(email, 'Your AgentSentry sign-in link', html);
}

/** Email change: emails the NEW address a link confirming the change. */
export function sendEmailChangeVerification(newEmail: string, link: string): Promise<boolean> {
  const html = shell(
    'Confirm your new email',
    `<p style="color:rgba(255,255,255,0.9);font-size:1rem;">Confirm that you want to use this address for your AgentSentry account.</p>
     ${buttonBlock('Confirm new email', link)}
     <p style="color:rgba(255,255,255,0.5);font-size:0.85rem;">
       This link expires in 24 hours. If you didn't request an email change, ignore this message and your address stays the same.
     </p>`,
  );
  return send(newEmail, 'Confirm your new AgentSentry email', html);
}

/** Key rotation: emails the user their freshly-generated API key. */
export function sendApiKeyEmail(email: string, apiKey: string): Promise<boolean> {
  const html = shell(
    'Your new API key',
    `<p style="color:rgba(255,255,255,0.9);font-size:1rem;">You regenerated your AgentSentry API key. Your previous key no longer works.</p>
     ${codeBlock('YOUR NEW API KEY', apiKey)}
     <p style="color:rgba(255,255,255,0.5);font-size:0.85rem;">
       Update any scripts or CI that used the old key. If you didn't do this, regenerate it again from your dashboard immediately.
     </p>`,
  );
  return send(email, 'Your new AgentSentry API key', html);
}

/** Trigger 2: emails the Pro usage guide when the CLI first activates Pro. */
export function sendProGuideEmail(email: string): Promise<boolean> {
  const html = shell(
    'Pro usage guide',
    `<p style="color:rgba(255,255,255,0.9);font-size:1rem;">Your AgentSentry Pro CLI is active. Here's how to get the most out of it.</p>
     <p style="color:#00ff88;font-weight:700;margin-top:24px;">Scan your cloud</p>
     <div style="background:#000;border-radius:6px;padding:16px;margin:8px 0;">
       <code style="color:#00ff88;font-size:0.85rem;display:block;">agentsentry scan aws</code>
       <code style="color:#00ff88;font-size:0.85rem;display:block;">agentsentry scan all</code>
     </div>
     <p style="color:#00ff88;font-weight:700;margin-top:24px;">Map blast radius</p>
     <div style="background:#000;border-radius:6px;padding:16px;margin:8px 0;">
       <code style="color:#00ff88;font-size:0.85rem;">agentsentry blast &lt;nhi-name&gt;</code>
     </div>
     <p style="color:#00ff88;font-weight:700;margin-top:24px;">Pro reporting flags</p>
     <div style="background:#000;border-radius:6px;padding:16px;margin:8px 0;">
       <code style="color:#00ff88;font-size:0.85rem;display:block;">agentsentry scan all --visualize</code>
       <code style="color:#00ff88;font-size:0.85rem;display:block;">agentsentry scan all --enrich --json report.json</code>
     </div>
     <p style="color:rgba(255,255,255,0.5);font-size:0.85rem;margin-top:24px;">
       Questions? Reply to this email or reach us at support@agentsentry.org.
     </p>`,
  );
  return send(email, 'Your AgentSentry Pro usage guide', html);
}

/** Automation: emails the summary of a scheduled scan (new NHIs, newly-zombie creds, rotation-due creds). */
export function sendScanReportEmail(email: string, summary: ScanReportSummary): Promise<boolean> {
  const target = summary.target.toUpperCase();
  const sections: string[] = [];

  if (summary.new_nhis.length) {
    sections.push(`
     <p style="color:#ff4d4d;font-weight:700;margin:24px 0 8px;">New identities detected (${summary.new_nhis.length})</p>
     <div style="background:#000;border-radius:6px;padding:12px 16px;">
       ${summary.new_nhis
         .map(
           (n) => `<div style="margin:10px 0;padding-bottom:10px;border-bottom:1px solid rgba(255,255,255,0.08);">
             <p style="color:rgba(255,255,255,0.9);margin:0;font-size:0.9rem;"><strong>${n.name}</strong> &mdash; ${n.risk_level} (score ${n.risk_score.toFixed(1)})</p>
             <p style="color:rgba(255,255,255,0.5);margin:4px 0 0;font-size:0.8rem;">${n.suggestion}</p>
           </div>`,
         )
         .join('')}
     </div>`);
  }

  if (summary.newly_zombie.length) {
    sections.push(`
     <p style="color:#ffaa00;font-weight:700;margin:24px 0 8px;">Newly zombie credentials (${summary.newly_zombie.length})</p>
     <div style="background:#000;border-radius:6px;padding:12px 16px;">
       ${summary.newly_zombie
         .map(
           (z) => `<p style="color:rgba(255,255,255,0.8);margin:6px 0;font-size:0.85rem;">${z.name} &mdash; ${z.days_since_use === null ? 'never used' : `unused for ${z.days_since_use} days`}</p>`,
         )
         .join('')}
     </div>
     <p style="color:rgba(255,255,255,0.5);font-size:0.8rem;margin:8px 0 0;">Consider revoking these credentials if they're no longer needed.</p>`);
  }

  if (summary.rotation_due.length) {
    sections.push(`
     <p style="color:#ffaa00;font-weight:700;margin:24px 0 8px;">Rotation due (${summary.rotation_due.length})</p>
     <div style="background:#000;border-radius:6px;padding:12px 16px;">
       ${summary.rotation_due
         .map(
           (r) => `<p style="color:rgba(255,255,255,0.8);margin:6px 0;font-size:0.85rem;">${r.name} &mdash; ${r.days_since_rotation === null ? 'rotation date unknown' : `last rotated ${r.days_since_rotation} days ago`}</p>`,
         )
         .join('')}
     </div>
     <p style="color:rgba(255,255,255,0.5);font-size:0.8rem;margin:8px 0 0;">Target rotation interval: 90 days for service accounts.</p>`);
  }

  const body = sections.length
    ? sections.join('')
    : `<p style="color:rgba(255,255,255,0.7);">No new risks were found in this scan. Your environment looks clean.</p>`;

  const scanDate = new Date(summary.scan_timestamp).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' });
  const html = shell(
    `Scheduled scan report — ${target}`,
    `<p style="color:rgba(255,255,255,0.9);font-size:1rem;">Your scheduled <strong>${target}</strong> scan finished at ${scanDate}.</p>
     ${body}
     ${buttonBlock('View dashboard', dashboardUrl())}`,
  );
  return send(email, `AgentSentry scan report — ${target}`, html);
}

/** Automation: reminds active subscribers to rotate their AgentSentry API key (90-day cadence). */
export function sendApiKeyRotationReminderEmail(email: string): Promise<boolean> {
  const html = shell(
    'API key rotation reminder',
    `<p style="color:rgba(255,255,255,0.9);font-size:1rem;">Your AgentSentry API key hasn't been rotated in over 90 days.</p>
     <p style="color:rgba(255,255,255,0.7);">Regenerating it periodically limits the damage if a key is ever leaked. Generate a new one from your dashboard — scheduled scans will keep working once the new key is saved to <code style="color:#00ff88;">~/.agentsentry/schedules.json</code> (re-run <code style="color:#00ff88;">agentsentry schedule add --notify-email</code> to update it).</p>
     ${buttonBlock('Regenerate API key', dashboardUrl())}`,
  );
  return send(email, 'Rotate your AgentSentry API key', html);
}
