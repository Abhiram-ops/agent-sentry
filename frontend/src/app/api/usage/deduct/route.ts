import { NextRequest, NextResponse } from 'next/server';
import { deductCredits, getUserFromRequest } from '@/lib/db';

interface DeductBody {
  action?: string;
  credits_required?: number;
}

export async function POST(req: NextRequest) {
  try {
    const user = await getUserFromRequest(req);
    if (!user) {
      return NextResponse.json({ error: 'Invalid or missing API key.' }, { status: 401 });
    }

    const body = (await req.json()) as DeductBody;
    const { action, credits_required: creditsRequired } = body;

    if (!action || typeof creditsRequired !== 'number' || creditsRequired <= 0) {
      return NextResponse.json(
        { error: 'action and a positive credits_required are required.' },
        { status: 400 },
      );
    }

    const result = await deductCredits(user.id, creditsRequired, action);

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          remaining_credits: result.remaining_credits,
          error: 'Insufficient credits.',
        },
        { status: 402 },
      );
    }

    return NextResponse.json({ success: true, remaining_credits: result.remaining_credits });
  } catch (err) {
    console.error('[/api/usage/deduct]', err);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}
