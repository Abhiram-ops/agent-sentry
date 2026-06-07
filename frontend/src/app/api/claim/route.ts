import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';
import { createHmac, createHash } from 'crypto';

// ── Vercel KV ────────────────────────────────────────────────────────────────
async function getKV() {
  const { kv } = await import('@vercel/kv');
  return kv;
}

// ── Key generation (mirrors Python HMAC logic) ───────────────────────────────
const FREE_SECRET = process.env.FREE_LICENSE_SECRET!;

function base32Encode(buf: Buffer): string {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  let bits = 0, value = 0, output = '';
  for (const byte of buf) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      output += alphabet[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) output += alphabet[(value << (5 - bits)) & 31];
  return output;
}

function generateFreeKey(email: string): string {
  const nonce = createHash('sha256').update(email.toLowerCase()).digest().subarray(0, 4);
  const mac   = createHmac('sha256', Buffer.from(FREE_SECRET)).update(nonce).digest().subarray(0, 6);
  const raw   = Buffer.concat([mac, nonce]); // 10 bytes → 16 base32 chars
  const enc   = base32Encode(raw);
  return `AF-${enc.slice(0, 4)}-${enc.slice(4, 8)}-${enc.slice(8, 12)}-${enc.slice(12, 16)}`;
}

// ── Password hashing ─────────────────────────────────────────────────────────
function hashPassword(password: string): string {
  const salt = process.env.PASSWORD_SALT || 'agentsentry-salt-2026';
  return createHash('sha256').update(password + salt).digest('hex');
}

// ── Email template ───────────────────────────────────────────────────────────
function emailHtml(name: string, key: string): string {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="background:#0a0f0d;color:#fff;font-family:monospace;padding:40px 20px;max-width:600px;margin:0 auto;">
  <div style="text-align:center;margin-bottom:32px;">
    <span style="color:#00ff88;font-size:2rem;">&#11041;</span>
    <h1 style="color:#00ff88;margin:8px 0;font-size:1.4rem;letter-spacing:0.1em;">AGENTSENTRY</h1>
    <p style="color:rgba(255,255,255,0.5);margin:0;font-size:0.85rem;">NHI &amp; AI Agent Risk Auditor</p>
  </div>

  <p style="color:rgba(255,255,255,0.9);font-size:1rem;">Hi ${name},</p>
  <p style="color:rgba(255,255,255,0.7);">Here&apos;s your free AgentSentry key:</p>

  <div style="background:#000;border:1px solid #00ff88;border-radius:8px;padding:20px;margin:24px 0;text-align:center;">
    <p style="color:rgba(255,255,255,0.5);margin:0 0 8px;font-size:0.75rem;letter-spacing:0.2em;">YOUR FREE KEY</p>
    <p style="color:#00ff88;font-size:1.4rem;font-weight:700;margin:0;letter-spacing:0.05em;">${key}</p>
  </div>

  <p style="color:rgba(255,255,255,0.7);">Activate it with:</p>
  <div style="background:#000;border-radius:6px;padding:16px;margin:16px 0;">
    <code style="color:#00ff88;font-size:0.9rem;">agentsentry activate ${key}</code>
  </div>

  <p style="color:rgba(255,255,255,0.5);font-size:0.85rem;">
    This unlocks all scanner commands (AWS, Azure, GCP, GitHub, K8s, AI agents).
    For Pro features like interactive graphs and KEV enrichment,
    <a href="https://sentryagent.gumroad.com/l/eawugx" style="color:#00ff88;">upgrade to Pro — $49 one-time</a>.
  </p>

  <hr style="border:none;border-top:1px solid rgba(255,255,255,0.1);margin:32px 0;">
  <p style="color:rgba(255,255,255,0.3);font-size:0.75rem;text-align:center;">
    AgentSentry &middot;
    <a href="https://agent-sentry-beta.vercel.app" style="color:rgba(255,255,255,0.4);">agent-sentry-beta.vercel.app</a>
  </p>
</body>
</html>`;
}

// ── Route handler ─────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const { name, email, password } = await req.json();

    if (!name || !email || !password) {
      return NextResponse.json({ error: 'Name, email, and password are required.' }, { status: 400 });
    }
    if (password.length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters.' }, { status: 400 });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: 'Invalid email address.' }, { status: 400 });
    }

    const kv       = await getKV();
    const kvKey    = `user:${email.toLowerCase()}`;
    const existing = await kv.get<{ key: string; name: string }>(kvKey);

    let freeKey: string;
    let alreadyClaimed = false;

    if (existing) {
      freeKey        = existing.key;
      alreadyClaimed = true;
    } else {
      freeKey = generateFreeKey(email);
      await kv.set(kvKey, {
        name,
        email: email.toLowerCase(),
        passwordHash: hashPassword(password),
        key: freeKey,
        plan: 'free',
        createdAt: new Date().toISOString(),
      });
      await kv.set(`key:${freeKey}`, { email: email.toLowerCase(), plan: 'free' });
    }

    const resend = new Resend(process.env.RESEND_API_KEY);
    await resend.emails.send({
      from: 'AgentSentry <noreply@agentsentry.tool>',
      to: email,
      subject: `Your AgentSentry free key — ${freeKey}`,
      html: emailHtml(name, freeKey),
    });

    return NextResponse.json({ success: true, alreadyClaimed });

  } catch (err) {
    console.error('[/api/claim]', err);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}
