import { NextRequest, NextResponse } from 'next/server';
import { getUserByEmail } from '@/lib/db';
import { getSessionUser, createEmailChange } from '@/lib/auth';
import { sendEmailChangeVerification } from '@/lib/email';

interface CredentialsBody {
  new_email?: string;
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function baseUrl(req: NextRequest): string {
  return (
    req.headers.get('origin') ??
    process.env.NEXT_PUBLIC_SITE_URL ??
    req.nextUrl.origin
  );
}

/**
 * Starts an email change. Validates the new address, ensures it's free, then
 * emails a confirmation link to the NEW address. The change only takes effect
 * once that link is visited (GET /api/auth/verify-email).
 */
export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated.' }, { status: 401 });
    }

    const body = (await req.json()) as CredentialsBody;
    const newEmail = body.new_email?.trim().toLowerCase();

    if (!newEmail || !isValidEmail(newEmail)) {
      return NextResponse.json({ error: 'A valid email is required.' }, { status: 400 });
    }
    if (newEmail === user.email.toLowerCase()) {
      return NextResponse.json({ error: 'That is already your email.' }, { status: 400 });
    }

    const existing = await getUserByEmail(newEmail);
    if (existing) {
      return NextResponse.json({ error: 'That email is already in use.' }, { status: 409 });
    }

    const token = await createEmailChange(user.id, newEmail);
    const link = `${baseUrl(req)}/api/auth/verify-email?token=${token}`;
    await sendEmailChangeVerification(newEmail, link);

    return NextResponse.json({
      success: true,
      message: `Confirmation sent to ${newEmail}`,
    });
  } catch (err) {
    console.error('[/api/user/credentials]', err);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}
