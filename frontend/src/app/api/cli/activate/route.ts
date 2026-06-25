import { NextRequest, NextResponse } from 'next/server';
import { getUserByActivationCode, markCliActivated, recordConsent } from '@/lib/db';
import { sendProGuideEmail } from '@/lib/email';
import { POLICY_VERSION } from '@/lib/policy';
import { checkRateLimit } from '@/lib/rateLimit';

interface ActivateBody {
  activation_code?: string;
  consent?: {
    document?: string;
    version?: string;
    accepted_at?: string;
    source?: string;
  };
}

/**
 * CLI activation endpoint. The Python CLI POSTs the activation code the user
 * received by email; we validate it against the DB, record the activation, and
 * return the tier so the CLI can gate commands locally.
 */
export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get('x-forwarded-for') ?? 'unknown';
    const allowed = await checkRateLimit(ip, 'cli/activate', 10, 60);
    if (!allowed) {
      return NextResponse.json({ error: 'Too many activation attempts. Try again later.' }, { status: 429 });
    }

    const body = (await req.json()) as ActivateBody;
    const code = body.activation_code?.trim();

    if (!code) {
      return NextResponse.json({ error: 'activation_code is required.' }, { status: 400 });
    }

    const user = await getUserByActivationCode(code);
    if (!user) {
      return NextResponse.json({ error: 'Invalid activation code.' }, { status: 404 });
    }

    // Record the CLI consent the user gave at the activation prompt. Best-effort:
    // a consent-logging failure must not block a valid activation.
    if (body.consent) {
      const ip = req.headers.get('x-forwarded-for');
      try {
        await recordConsent(
          user.id,
          'cli_activation',
          body.consent.version || POLICY_VERSION,
          ip,
          body.consent.document || 'terms_and_privacy',
        );
      } catch (e) {
        console.error('[/api/cli/activate] consent log failed', e);
      }
    }

    const firstActivation = await markCliActivated(user.id);

    // Trigger 2: first time a Pro code activates the CLI, send the usage guide.
    if (firstActivation && user.tier === 'pro') {
      await sendProGuideEmail(user.email);
    }

    return NextResponse.json({
      tier: user.tier,
      email: user.email,
      activated: true,
    });
  } catch (err) {
    console.error('[/api/cli/activate]', err);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}
