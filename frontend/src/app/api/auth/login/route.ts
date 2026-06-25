import { NextRequest, NextResponse } from 'next/server';
import { getUserByEmail } from '@/lib/db';
import { createLoginToken } from '@/lib/auth';
import { sendLoginLinkEmail } from '@/lib/email';

interface LoginBody {
  email?: string;
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function baseUrl(): string {
  // Never trust the Origin header for auth link construction — an attacker
  // could set Origin to their own domain and capture the one-time token.
  return process.env.NEXT_PUBLIC_SITE_URL ?? 'https://agentsentry.org';
}

/**
 * Magic-link login. Sends a one-time sign-in link to the email if an account
 * exists. Always returns the same success response so the endpoint can't be
 * used to enumerate which emails are registered.
 */
export async function POST(req: NextRequest) {
  const genericOk = NextResponse.json({
    success: true,
    message: 'If that email has an account, a sign-in link is on its way.',
  });

  try {
    const body = (await req.json()) as LoginBody;
    const email = body.email?.trim().toLowerCase();

    if (!email || !isValidEmail(email)) {
      return NextResponse.json({ error: 'A valid email is required.' }, { status: 400 });
    }

    const user = await getUserByEmail(email);
    if (!user) {
      return genericOk;
    }

    const token = await createLoginToken(user.id);
    if (!token) {
      return NextResponse.json(
        { error: 'Too many sign-in attempts. Try again in an hour.' },
        { status: 429 },
      );
    }

    const link = `${baseUrl()}/auth/callback?token=${token}&email=${encodeURIComponent(email)}`;
    await sendLoginLinkEmail(email, link);

    return genericOk;
  } catch (err) {
    console.error('[/api/auth/login]', err);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}
