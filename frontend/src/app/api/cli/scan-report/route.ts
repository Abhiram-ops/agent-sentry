import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest, insertScanReport, type ScanReportSummary } from '@/lib/db';
import { checkRateLimit } from '@/lib/rateLimit';
import { sendScanReportEmail } from '@/lib/email';

function isValidSummary(body: unknown): body is ScanReportSummary {
  if (!body || typeof body !== 'object') return false;
  const b = body as Record<string, unknown>;
  return (
    typeof b.schedule_id === 'string' &&
    typeof b.target === 'string' &&
    typeof b.scan_timestamp === 'string' &&
    Array.isArray(b.new_nhis) &&
    Array.isArray(b.newly_zombie) &&
    Array.isArray(b.rotation_due)
  );
}

/**
 * CLI automation endpoint. The scheduled-scan runner (`agentsentry _run-scheduled`)
 * POSTs a diff summary here when --notify-email is enabled, so it can be stored
 * for the dashboard and emailed to the user.
 */
export async function POST(req: NextRequest) {
  try {
    const user = await getUserFromRequest(req);
    if (!user) {
      return NextResponse.json({ error: 'Invalid or missing API key.' }, { status: 401 });
    }

    if (user.subscription_status !== 'active') {
      return NextResponse.json(
        { error: 'An active Automation subscription is required.' },
        { status: 403 },
      );
    }

    const allowed = await checkRateLimit(`user:${user.id}`, '/api/cli/scan-report', 24, 1440);
    if (!allowed) {
      return NextResponse.json({ error: 'Rate limit exceeded.' }, { status: 429 });
    }

    const body = await req.json();
    if (!isValidSummary(body)) {
      return NextResponse.json({ error: 'Invalid scan report payload.' }, { status: 400 });
    }

    const report = await insertScanReport(user.id, body);
    await sendScanReportEmail(user.email, body);

    return NextResponse.json({ stored: true, id: report.id });
  } catch (err) {
    console.error('[/api/cli/scan-report]', err);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}
