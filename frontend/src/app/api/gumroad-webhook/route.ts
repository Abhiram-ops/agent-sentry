/**
 * POST /api/gumroad-webhook
 * Handles Gumroad sale webhooks. On each successful purchase:
 *   1. Verifies the Gumroad ping secret (if configured)
 *   2. Generates a signed license key from the sale ID
 *   3. Emails the key to the buyer via Gmail
 *
 * Required Vercel environment variables:
 *   AS_LICENSE_SECRET      — shared with Python CLI for offline key validation
 *   GUMROAD_PING_SECRET    — set in Gumroad product > Advanced > Webhook secret
 *   GMAIL_USER             — Gmail address (already configured)
 *   GMAIL_APP_PASSWORD     — Gmail app password (already configured)
 */

import { createHmac, createHash, timingSafeEqual } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

const LICENSE_SECRET = process.env.AS_LICENSE_SECRET!;
const PING_SECRET    = process.env.GUMROAD_PING_SECRET;
const GMAIL_USER     = process.env.GMAIL_USER!;
const GMAIL_PASS     = process.env.GMAIL_APP_PASSWORD!;

const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

function base32Encode(buf: Buffer): string {
  let result = '';
  let bits = 0;
  let value = 0;
  for (let i = 0; i < buf.length; i++) {
    value = (value << 8) | buf[i];
    bits += 8;
    while (bits >= 5) {
      result += BASE32_ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) result += BASE32_ALPHABET[(value << (5 - bits)) & 31];
  return result;
}

/**
 * Generate a signed license key from a purchase ID.
 * Must produce the same key as generate_key() in agentsentry/license.py.
 */
function generateKey(purchaseId: string): string {
  const nonce = createHash('sha256').update(purchaseId).digest().slice(0, 4);
  const mac   = createHmac('sha256', LICENSE_SECRET).update(nonce).digest().slice(0, 6);
  const raw   = Buffer.concat([mac, nonce]); // 10 bytes
  const enc   = base32Encode(raw);           // 16 chars
  return `AS-${enc.slice(0, 4)}-${enc.slice(4, 8)}-${enc.slice(8, 12)}-${enc.slice(12, 16)}`;
}

function verifySignature(body: string, signature: string, secret: string): boolean {
  try {
    const expected = createHmac('sha256', secret).update(body).digest('hex');
    const sigBuf   = Buffer.from(signature.replace('sha256=', ''), 'hex');
    const expBuf   = Buffer.from(expected, 'hex');
    if (sigBuf.length !== expBuf.length) return false;
    return timingSafeEqual(sigBuf, expBuf);
  } catch {
    return false;
  }
}

async function sendLicenseEmail(toEmail: string, key: string, buyerName: string) {
  const firstName = (buyerName || '').split(' ')[0] || 'there';

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user: GMAIL_USER, pass: GMAIL_PASS },
  });

  await transporter.sendMail({
    from: `"AgentSentry" <${GMAIL_USER}>`,
    to: toEmail,
    subject: 'Your AgentSentry Pro license key',
    text: [
      `Hey ${firstName},`,
      '',
      'Thanks for purchasing AgentSentry Pro. Here\'s your license key:',
      '',
      `  ${key}`,
      '',
      'Activate it in your terminal:',
      '',
      `  agentsentry activate ${key}`,
      '',
      'What you\'ve unlocked:',
      '  --visualize   interactive HTML attack graph',
      '  --enrich      CISA KEV threat intelligence',
      '  --json        JSON output for pipelines',
      '  interactive   guided multi-cloud scan mode',
      '',
      'Keep this key safe — it\'s tied to your purchase.',
      'Questions? Reply to this email.',
      '',
      '— Abhiram, AgentSentry',
      'agentsentry.tool',
    ].join('\n'),
    html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family:'Courier New',monospace;background:#0a0f0a;color:#e0e0e0;max-width:600px;margin:0 auto;padding:40px 20px;">
<div style="border:1px solid #00ff88;padding:32px;border-radius:4px;">

<h1 style="color:#00ff88;font-size:20px;margin:0 0 8px 0;">&#x2B21; AgentSentry Pro</h1>
<p style="color:#666;margin:0 0 32px 0;font-size:13px;">License Key Delivery</p>

<p style="margin:0 0 24px 0;">Hey ${firstName},</p>
<p style="margin:0 0 24px 0;line-height:1.6;">Thanks for purchasing AgentSentry Pro. Here's your license key:</p>

<div style="background:#0d1a0d;border:1px solid #00ff88;border-radius:4px;padding:20px;text-align:center;margin:0 0 32px 0;">
  <code style="color:#00ff88;font-size:18px;letter-spacing:2px;">${key}</code>
</div>

<p style="margin:0 0 12px 0;font-size:14px;color:#999;">Activate in your terminal:</p>
<div style="background:#0d1a0d;border-radius:4px;padding:16px;margin:0 0 32px 0;">
  <code style="color:#e0e0e0;font-size:14px;">agentsentry activate ${key}</code>
</div>

<p style="margin:0 0 8px 0;font-size:14px;color:#999;">What you've unlocked:</p>
<ul style="color:#e0e0e0;font-size:14px;line-height:2;padding-left:20px;">
  <li><code style="color:#00ff88;">--visualize</code> &mdash; interactive HTML attack graph</li>
  <li><code style="color:#00ff88;">--enrich</code> &mdash; CISA KEV threat intelligence</li>
  <li><code style="color:#00ff88;">--json</code> &mdash; JSON output for pipelines</li>
  <li><code style="color:#00ff88;">interactive</code> &mdash; guided multi-cloud scan mode</li>
</ul>

<hr style="border:none;border-top:1px solid #1a2a1a;margin:32px 0;">
<p style="font-size:13px;color:#666;margin:0;">
  Keep this key safe &mdash; it's tied to your purchase.<br>
  Questions? Reply to this email.
</p>

</div>
</body>
</html>`,
  });
}

export async function POST(req: NextRequest) {
  const rawBody = await req.text();

  // GUMROAD_PING_SECRET must always be configured — fail closed if missing.
  if (!PING_SECRET) {
    console.error('[gumroad-webhook] GUMROAD_PING_SECRET is not set — rejecting request');
    return NextResponse.json({ error: 'Webhook not configured' }, { status: 500 });
  }
  const sig = req.headers.get('x-gumroad-signature') ?? '';
  if (!sig || !verifySignature(rawBody, sig, PING_SECRET)) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }

  // Parse Gumroad form-encoded payload
  const params     = new URLSearchParams(rawBody);
  const saleId     = params.get('sale_id')   ?? params.get('id')          ?? '';
  const email      = params.get('email')     ?? '';
  const buyerName  = params.get('full_name') ?? params.get('buyer_name')   ?? '';
  const refunded   = params.get('refunded')  === 'true';

  if (refunded) {
    return NextResponse.json({ received: true, skipped: 'refund' });
  }

  if (!saleId || !email) {
    return NextResponse.json({ error: 'Missing sale_id or email' }, { status: 400 });
  }

  if (!LICENSE_SECRET || !GMAIL_USER || !GMAIL_PASS) {
    console.error('[gumroad-webhook] Missing env vars');
    return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 });
  }

  try {
    const key = generateKey(saleId);
    await sendLicenseEmail(email, key, buyerName);
    console.log(`[gumroad-webhook] Delivered key to ${email} for sale ${saleId}`);
    return NextResponse.json({ received: true, delivered: true });
  } catch (err) {
    console.error('[gumroad-webhook] Error:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
