import { NextRequest } from 'next/server';

const ALLOWED_ORIGINS = new Set([
  'https://agentsentry.org',
  'https://www.agentsentry.org',
  'https://agent-sentry-beta.vercel.app',
  process.env.NEXT_PUBLIC_SITE_URL,
].filter((origin): origin is string => Boolean(origin)));

/**
 * Defense-in-depth CSRF check for session-cookie-authenticated mutating
 * routes. SameSite=Lax already blocks cross-site cookie sends for POST, but
 * this rejects forged requests outright (e.g. if a future change loosens
 * cookie policy) by requiring the Origin header to match a known origin.
 */
export function isSameOrigin(req: NextRequest): boolean {
  const origin = req.headers.get('origin');
  if (!origin) {
    // Same-origin requests from non-browser clients (curl, server-to-server)
    // don't send an Origin header; only browsers do for cross-origin fetches.
    return true;
  }
  if (process.env.NODE_ENV !== 'production' && origin.startsWith('http://localhost')) {
    return true;
  }
  return ALLOWED_ORIGINS.has(origin);
}
