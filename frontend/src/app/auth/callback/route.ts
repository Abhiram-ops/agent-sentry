import { NextRequest, NextResponse } from 'next/server';
import { getUserById } from '@/lib/db';
import {
  getLoginToken,
  markLoginTokenUsed,
  recordLogin,
  createSession,
  SESSION_COOKIE,
  SESSION_MAX_AGE_SECONDS,
  sessionCookieOptions,
} from '@/lib/auth';

/**
 * Magic-link callback. Validates the one-time token from the sign-in email,
 * establishes a server session, sets the HTTP-only cookie, and redirects to
 * the dashboard. Any failure redirects back to /login with an error flag.
 */
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const token = url.searchParams.get('token')?.trim();
  const email = url.searchParams.get('email')?.trim().toLowerCase();

  const fail = NextResponse.redirect(new URL('/login?error=invalid_link', req.url));

  if (!token || !email) return fail;

  try {
    const row = await getLoginToken(token);
    if (!row || row.used_at) return fail;
    if (new Date(row.expires_at).getTime() < Date.now()) return fail;

    const user = await getUserById(row.user_id);
    if (!user || user.email.toLowerCase() !== email) return fail;

    await markLoginTokenUsed(row.id);
    await recordLogin(user.id);

    const sessionToken = await createSession(user.id);
    const res = NextResponse.redirect(new URL('/dashboard', req.url));
    res.cookies.set(SESSION_COOKIE, sessionToken, sessionCookieOptions(SESSION_MAX_AGE_SECONDS));
    return res;
  } catch (err) {
    console.error('[/auth/callback]', err);
    return fail;
  }
}
