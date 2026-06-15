import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { getTransactionHistory, getScanReports } from '@/lib/db';

/**
 * GDPR data export. Returns everything we hold about the signed-in user as
 * JSON: profile fields, credit transaction history, and scheduled-scan
 * report metadata. Does not include the plaintext api_key (not part of the
 * data export — rotate it separately if you need a fresh one).
 */
export async function GET() {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated.' }, { status: 401 });
    }

    const [transactions, scanReports] = await Promise.all([
      getTransactionHistory(user.id, 1000),
      getScanReports(user.id, 1000),
    ]);

    const data = {
      profile: {
        email: user.email,
        tier: user.tier,
        credits_balance: user.credits_balance,
        activation_code: user.activation_code,
        is_cli_activated: user.is_cli_activated,
        created_at: user.created_at,
        updated_at: user.updated_at,
        subscription_status: user.subscription_status,
        subscription_current_period_end: user.subscription_current_period_end,
        api_key_rotated_at: user.api_key_rotated_at,
      },
      credit_transactions: transactions,
      scan_reports: scanReports,
      exported_at: new Date().toISOString(),
    };

    return new NextResponse(JSON.stringify(data, null, 2), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': 'attachment; filename="agentsentry-data-export.json"',
      },
    });
  } catch (err) {
    console.error('[/api/user/export]', err);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}
