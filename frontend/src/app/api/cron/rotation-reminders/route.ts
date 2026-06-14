import { NextRequest, NextResponse } from 'next/server';
import { getUsersDueForRotationReminder, markRotationReminderSent } from '@/lib/db';
import { sendApiKeyRotationReminderEmail } from '@/lib/email';

/**
 * Daily Vercel cron (see vercel.json). Reminds active Automation subscribers
 * whose AgentSentry API key hasn't been rotated in 90+ days, at most once
 * every 90 days per user.
 */
export async function GET(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    console.error('[/api/cron/rotation-reminders] CRON_SECRET is not configured');
    return NextResponse.json({ error: 'Cron not configured.' }, { status: 500 });
  }

  if (req.headers.get('authorization') !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  }

  try {
    const users = await getUsersDueForRotationReminder();
    let sent = 0;

    for (const user of users) {
      const ok = await sendApiKeyRotationReminderEmail(user.email);
      if (ok) {
        await markRotationReminderSent(user.id);
        sent++;
      }
    }

    return NextResponse.json({ checked: users.length, sent });
  } catch (err) {
    console.error('[/api/cron/rotation-reminders]', err);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}
