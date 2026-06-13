import { NextRequest, NextResponse } from 'next/server';
import { getUserByEmail } from '@/lib/db';
import { getEmailChange, applyEmailChange } from '@/lib/auth';

/**
 * Confirms an email change from the link sent to the new address. On success,
 * updates the user's email and redirects to the dashboard with a flag.
 */
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const token = url.searchParams.get('token')?.trim();

  const fail = NextResponse.redirect(new URL('/dashboard?email_error=1', req.url));

  if (!token) return fail;

  try {
    const row = await getEmailChange(token);
    if (!row) return fail;
    if (new Date(row.expires_at).getTime() < Date.now()) return fail;

    // Guard against the address being claimed between request and confirmation.
    const taken = await getUserByEmail(row.new_email);
    if (taken && taken.id !== row.user_id) return fail;

    await applyEmailChange(row);

    return NextResponse.redirect(new URL('/dashboard?email_updated=1', req.url));
  } catch (err) {
    console.error('[/api/auth/verify-email]', err);
    return fail;
  }
}
