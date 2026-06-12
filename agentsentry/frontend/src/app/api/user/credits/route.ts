import { NextRequest, NextResponse } from 'next/server';
import { getTransactionHistory, getUserFromRequest } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const user = await getUserFromRequest(req);
    if (!user) {
      return NextResponse.json({ error: 'Invalid or missing API key.' }, { status: 401 });
    }

    const transactions = await getTransactionHistory(user.id);

    return NextResponse.json({
      credits_balance: user.credits_balance,
      email: user.email,
      created_at: new Date(user.created_at).toISOString(),
      tier: user.tier,
      activation_code: user.activation_code,
      is_cli_activated: user.is_cli_activated,
      transactions,
    });
  } catch (err) {
    console.error('[/api/user/credits]', err);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}
