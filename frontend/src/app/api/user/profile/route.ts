import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';

/**
 * Returns the signed-in user's profile. Includes the full api_key (the user's
 * own key, behind session auth) so the dashboard can call the Bearer-token
 * billing routes, plus a short preview for display.
 */
export async function GET() {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated.' }, { status: 401 });
    }

    return NextResponse.json({
      email: user.email,
      api_key_preview: `${user.api_key.slice(0, 6)}…${user.api_key.slice(-6)}`,
      credits_balance: user.credits_balance,
      tier: user.tier,
      activation_code: user.activation_code,
      is_cli_activated: user.is_cli_activated,
      created_at: new Date(user.created_at).toISOString(),
      subscription_status: user.subscription_status,
      subscription_current_period_end: user.subscription_current_period_end,
    });
  } catch (err) {
    console.error('[/api/user/profile]', err);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}
