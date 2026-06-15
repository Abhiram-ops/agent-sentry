import { NextRequest, NextResponse } from 'next/server';
import { deleteSession, SESSION_COOKIE, sessionCookieOptions } from '@/lib/auth';
import { isSameOrigin } from '@/lib/origin';

/**
 * Logout. Deletes the server session and clears the cookie. Called via fetch
 * from the client, which handles the redirect to "/" after a 200.
 */
export async function POST(req: NextRequest) {
  try {
    if (!isSameOrigin(req)) {
      return NextResponse.json({ error: 'Invalid origin.' }, { status: 403 });
    }

    const token = req.cookies.get(SESSION_COOKIE)?.value;
    if (token) {
      await deleteSession(token);
    }

    const res = NextResponse.json({ success: true });
    // Expire the cookie immediately.
    res.cookies.set(SESSION_COOKIE, '', sessionCookieOptions(0));
    return res;
  } catch (err) {
    console.error('[/api/auth/logout]', err);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}
