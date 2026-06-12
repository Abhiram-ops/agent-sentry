import { Resend } from 'resend';
import type { Tier } from '@/lib/db';

const FROM = 'AgentSentry <noreply@agentsentry.tool>';

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
    await resend.emails.send({ from: FROM, to, subject, html });
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
       Questions? Just reply to this email.
     </p>`,
  );
  return send(email, 'Your AgentSentry Pro usage guide', html);
}
