import { NextRequest, NextResponse } from 'next/server';

// Next 16 renamed the "middleware" file convention to "proxy". This runs on the
// edge before /dashboard renders. It's hardcoded (not importing lib/auth) so it
// stays edge-safe — no @vercel/postgres. The cookie's presence is a cheap gate;
// the data routes (/api/user/*) do the real session validation against the DB.
const SESSION_COOKIE = 'agentsentry_session';

export function proxy(req: NextRequest) {
  const hasSession = Boolean(req.cookies.get(SESSION_COOKIE)?.value);

  if (!hasSession) {
    const loginUrl = new URL('/login', req.url);
    loginUrl.searchParams.set('next', req.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*'],
};
