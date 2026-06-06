/**
 * POST /api/validate-key
 * Validates an AgentSentry Pro license key server-side.
 *
 * Body: { key: string }
 * Response: { valid: boolean, plan?: string }
 *
 * The same HMAC algorithm is used here and in the Python CLI.
 * Secret must be set as AS_LICENSE_SECRET in Vercel environment variables.
 */

import { createHmac, createHash, timingSafeEqual } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';

const SECRET = process.env.AS_LICENSE_SECRET;
const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

function base32Decode(encoded: string): Buffer {
  let bits = 0;
  let value = 0;
  const output: number[] = [];
  const upper = encoded.toUpperCase().replace(/=/g, '');

  for (let i = 0; i < upper.length; i++) {
    const idx = BASE32_ALPHABET.indexOf(upper[i]);
    if (idx === -1) throw new Error(`Invalid base32 char: ${upper[i]}`);
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      output.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }
  return Buffer.from(output);
}

function validateKey(key: string, secret: string): boolean {
  try {
    // Strip prefix and dashes → 16 base32 chars
    const payload = key.toUpperCase().replace('AS-', '').replace(/-/g, '');
    if (payload.length !== 16) return false;

    const raw = base32Decode(payload); // should be 10 bytes
    if (raw.length < 10) return false;

    const macStored  = raw.slice(0, 6);
    const nonce      = raw.slice(6, 10);
    const macExpected = createHmac('sha256', secret).update(nonce).digest().slice(0, 6);

    return timingSafeEqual(macStored, macExpected);
  } catch {
    return false;
  }
}

export async function POST(req: NextRequest) {
  if (!SECRET) {
    return NextResponse.json(
      { valid: false, error: 'License validation not configured' },
      { status: 500 }
    );
  }

  let body: { key?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ valid: false, error: 'Invalid JSON' }, { status: 400 });
  }

  const key = (body.key ?? '').trim().toUpperCase();
  if (!key.match(/^AS-([A-Z2-7]{4}-){3}[A-Z2-7]{4}$/i)) {
    return NextResponse.json({ valid: false, error: 'Invalid key format' });
  }

  const valid = validateKey(key, SECRET);
  return NextResponse.json({ valid, plan: valid ? 'pro' : undefined });
}
