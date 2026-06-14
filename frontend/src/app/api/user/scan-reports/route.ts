import { NextResponse } from 'next/server';
import { getScanReports } from '@/lib/db';
import { getSessionUser } from '@/lib/auth';

/** Recent scheduled-scan reports for the dashboard's "Automated scans" card. */
export async function GET() {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated.' }, { status: 401 });
    }

    const reports = await getScanReports(user.id, 10);
    return NextResponse.json({ reports });
  } catch (err) {
    console.error('[/api/user/scan-reports]', err);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}
