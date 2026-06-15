import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser, createAccountDeletionRequest } from '@/lib/auth';
import { sendAccountDeletionEmail } from '@/lib/email';
import { isSameOrigin } from '@/lib/origin';

function baseUrl(req: NextRequest): string {
  return (
    req.headers.get('origin') ??
    process.env.NEXT_PUBLIC_SITE_URL ??
    req.nextUrl.origin
  );
}

/**
 * Starts a GDPR account-deletion request. Emails the signed-in user a
 * confirmation link (24h expiry); the account is only anonymized once that
 * link is visited (GET /api/auth/confirm-delete).
 */
export async function POST(req: NextRequest) {
  try {
    if (!isSameOrigin(req)) {
      return NextResponse.json({ error: 'Invalid origin.' }, { status: 403 });
    }

    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated.' }, { status: 401 });
    }

    const token = await createAccountDeletionRequest(user.id);
    const link = `${baseUrl(req)}/api/auth/confirm-delete?token=${token}`;
    await sendAccountDeletionEmail(user.email, link);

    return NextResponse.json({
      success: true,
      message: `A confirmation link has been sent to ${user.email}.`,
    });
  } catch (err) {
    console.error('[/api/user/delete]', err);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}
