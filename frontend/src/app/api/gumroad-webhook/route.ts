/**
 * POST /api/gumroad-webhook
 * Handles Gumroad sale webhooks. On each successful purchase:
 *   1. Verifies the Gumroad ping secret
 *   2. Generates a unique license key from the sale ID
 *   3. Emails the key to the buyer via Resend
 *
 * Required Vercel environment variables:
 *   AS_LICENSE_SECRET      — shared with the Python CLI for key validation
 *   GUMROAD_PING_SECRET    — set in Gumroad product > Advanced > Webhook secret
 *   RESEND_API_KEY         — already configured
 *   RESEND_FROM_EMAIL      — already configured (e.g. noreply@agentsentry.tool)
 */

import { createHmac, createHash, timingSafeEqual } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';

const LICENSE_SECRET   = process.env.AS_LICENSE_SECRET!;
const PING_SECRET      = process.env.GUMROAD_PING_SECRET;
const RESEND_API_KEY   = process.env.RESEND_API_KEY!;
const FROM_EMAIL       = process.env.RESEND_FROM_EMAIL ?? 'noreply@agentsentry.tool';

const resend = new Resend(RESEND_API_KEY);

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

function verifyGumroadSignature(body: string, signature: string, secret: string): boolean {
  try {
    const expected = createHmac('sha256', secret).update(body).digest('hex');
    return timingSafeEqual(Buffer.from(signature, 'hex'), Buffer.from(expected, 'hex'));
  } catch {
    return false;
  }
}

async function sendLicenseEmail(email: string, key: string, buyerName: string) {
  const firstName = buyerName?.split(' ')[0] || 'there';

  await resend.emails.send({
    from: FROM_EMAIL,
    to:   email,
    subject: 'Your AgentSentry Pro license key',
    html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: 'Courier New', monospace; background: #0a0f0a; color: #e0e0e0; max-width: 600px; margin: 0 auto; padding: 40px 20px;">

  <div style="border: 1px solid #00ff88; padding: 32px; border-radius: 4px;">

    <h1 style="color: #00ff88; font-size: 20px; margin: 0 0 8px 0;">⬡ AgentSentry Pro</h1>
    <p style="color: #666; margin: 0 0 32px 0; font-size: 13px;">License Key Delivery</p>

    <p style="margin: 0 0 24px 0;">Hey ${firstName},</p>
    <p style="margin: 0 0 24px 0; line-height: 1.6;">
      Thanks for purchasing AgentSentry Pro. Here's your license key:
    </p>

    <div style="background: #0d1a0d; border: 1px solid #00ff88; border-radius: 4px; padding: 20px; text-align: center; margin: 0 0 32px 0;">
      <code style="color: #00ff88; font-size: 18px; letter-spacing: 2px;">${key}</code>
    </div>

    <p style="margin: 0 0 12px 0; font-size: 14px; color: #999;">Activate in your terminal:</p>
    <div style="background: #0d1a0d; border-radius: 4px; padding: 16px; margin: 0 0 32px 0;">
      <code style="color: #e0e0e0; font-size: 14px;">agentsentry activate ${key}</code>
    </div>

    <p style="margin: 0 0 8px 0; font-size: 14px; color: #999;">What you've unlocked:</p>
    <ul style="color: #e0e0e0; font-size: 14px; line-height: 2; padding-left: 20px;">
      <li><code style="color: #00ff88;">--visualize</code> — interactive HTML attack graph</li>
      <li><code style="color: #00ff88;">--enrich</code> — CISA KEV threat intelligence</li>
      <li><code style="color: #00ff88;">--json</code> — JSON output for pipelines</li>
      <li><code style="color: #00ff88;">interactive</code> — guided multi-cloud scan mode</li>
    </ul>

    <hr style="border: none; border-top: 1px solid #1a2a1a; margin: 32px 0;">

    <p style="font-size: 13px; color: #666; margin: 0;">
      Keep this key safe — it's tied to your purchase and can't be reissued.<br>
      Questions? Reply to this email or reach us at
      <a href="mailto:support@agentsentry.tool" style="color: #00ff88;">support@agentsentry.tool</a>
    </p>

  </div>

</body>
</html>
    `.trim(),
  });
}

export async function POST(req: NextRequest) {
  const rawBody = await req.text();

  // Verify Gumroad signature if secret is configured
  if (PING_SECRET) {
    const sig = req.headers.get('x-gumroad-signature') ?? '';
    if (!sig || !verifyGumroadSignature(rawBody, sig, PING_SECRET)) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }
  }

  // Parse Gumroad's form-encoded payload
  const params = new URLSearchParams(rawBody);
  const saleId      = params.get('sale_id')     ?? params.get('id') ?? '';
  const email       = params.get('email')        ?? '';
  const buyerName   = params.get('full_name')    ?? params.get('buyer_name') ?? '';
  const refunded    = params.get('refunded')     === 'true';
  const testPurchase = params.get('test')        === 'true';

  // Ignore refunds and test purchases (uncomment testPurchase check in prod)
  if (refunded) {
    return NextResponse.json({ received: true, skipped: 'refund' });
  }
  // if (testPurchase) {
  //   return NextResponse.json({ received: true, skipped: 'test' });
  // }

  if (!saleId || !email) {
    return NextResponse.json({ error: 'Missing sale_id or email' }, { status: 400 });
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
