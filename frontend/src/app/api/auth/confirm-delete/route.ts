import { NextRequest, NextResponse } from 'next/server';
import {
  getAccountDeletionRequest,
  anonymizeUser,
  SESSION_COOKIE,
  sessionCookieOptions,
} from '@/lib/auth';

/**
 * Confirms a GDPR account-deletion request from the emailed link. On
 * success, anonymizes the account, clears the session cookie, and redirects
 * home with a confirmation flag.
 */
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const token = url.searchParams.get('token')?.trim();

  const fail = NextResponse.redirect(new URL('/?account_delete_error=1', req.url));

  if (!token) return fail;

  try {
    const row = await getAccountDeletionRequest(token);
    if (!row) return fail;
    if (new Date(row.expires_at).getTime() < Date.now()) return fail;

    await anonymizeUser(row.user_id);

    const res = NextResponse.redirect(new URL('/?account_deleted=1', req.url));
    res.cookies.set(SESSION_COOKIE, '', sessionCookieOptions(0));
    return res;
  } catch (err) {
    console.error('[/api/auth/confirm-delete]', err);
    return fail;
  }
}
