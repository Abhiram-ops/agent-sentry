import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/db';

/**
 * Polled by the CLI's `_require_automation()` gate before registering or
 * running a scheduled scan, so it can locally enforce the Automation
 * subscription without re-checking on every command.
 */
export async function GET(req: NextRequest) {
  try {
    const user = await getUserFromRequest(req);
    if (!user) {
      return NextResponse.json({ error: 'Invalid or missing API key.' }, { status: 401 });
    }

    return NextResponse.json({
      active: user.subscription_status === 'active',
      tier: user.tier,
      subscription_status: user.subscription_status,
      subscription_current_period_end: user.subscription_current_period_end,
    });
  } catch (err) {
    console.error('[/api/cli/subscription-status]', err);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}
