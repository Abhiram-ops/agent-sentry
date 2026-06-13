import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import { getTransactionHistory } from '@/lib/db';
import { getSessionUser } from '@/lib/auth';

/** Returns the signed-in user's recent credit transactions + a total count. */
export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated.' }, { status: 401 });
    }

    const url = new URL(req.url);
    const parsed = Number(url.searchParams.get('limit'));
    const limit = Number.isFinite(parsed) && parsed > 0 ? Math.min(parsed, 100) : 10;

    const transactions = await getTransactionHistory(user.id, limit);

    const { rows } = await sql<{ count: string }>`
      SELECT COUNT(*)::text AS count FROM credit_transactions WHERE user_id = ${user.id}
    `;

    return NextResponse.json({
      transactions,
      total_count: Number(rows[0]?.count ?? '0'),
    });
  } catch (err) {
    console.error('[/api/user/transactions]', err);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}
