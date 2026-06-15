import { NextRequest, NextResponse } from 'next/server';
import { createUser, getUserByEmail } from '@/lib/db';
import { sendActivationCodeEmail } from '@/lib/email';
import { checkRateLimit } from '@/lib/rateLimit';
import { isDisposableEmail } from '@/lib/disposableEmail';
import {
  createSession,
  SESSION_COOKIE,
  SESSION_MAX_AGE_SECONDS,
  sessionCookieOptions,
} from '@/lib/auth';

interface SignupBody {
  email?: string;
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get('x-forwarded-for') || 'unknown';
    const allowed = await checkRateLimit(ip, '/api/auth/signup', 5, 60);
    if (!allowed) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }

    const body = (await req.json()) as SignupBody;
    const email = body.email?.trim().toLowerCase();

    if (!email || !isValidEmail(email)) {
      return NextResponse.json({ error: 'A valid email is required.' }, { status: 400 });
    }

    if (isDisposableEmail(email)) {
      return NextResponse.json(
        { error: 'Please use a permanent email address.' },
        { status: 400 },
      );
    }

    const existing = await getUserByEmail(email);
    if (existing) {
      return NextResponse.json(
        { error: 'An account with this email already exists.' },
        { status: 409 },
      );
    }

    // Creates the user with tier='free' and a fresh AS-FREE-... activation code.
    const user = await createUser(email);

    // Trigger 1: email the free activation code (best-effort, never blocks signup).
    if (user.activation_code) {
      await sendActivationCodeEmail(user.email, user.activation_code, 'free');
    }

    // Establish a web session immediately so "Go to dashboard" works without a
    // separate login step (the dashboard is gated by the session cookie).
    const sessionToken = await createSession(user.id);

    const res = NextResponse.json(
      {
        api_key: user.api_key,
        user_id: user.id,
        credits: user.credits_balance,
        tier: user.tier,
        activation_code: user.activation_code,
      },
      { status: 201 },
    );
    res.cookies.set(SESSION_COOKIE, sessionToken, sessionCookieOptions(SESSION_MAX_AGE_SECONDS));
    return res;
  } catch (err) {
    console.error('[/api/auth/signup]', err);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}
