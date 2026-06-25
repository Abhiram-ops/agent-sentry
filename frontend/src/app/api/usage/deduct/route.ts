import { NextRequest, NextResponse } from 'next/server';
import { deductCredits, getUserFromRequest } from '@/lib/db';

// Server-authoritative credit costs. The client sends only the action name;
// the server resolves the cost. This prevents clients from under-reporting cost.
const CREDIT_COSTS: Record<string, number> = {
  scan_local:  0,
  scan_mock:   0,
  scan_aws:    1,
  scan_azure:  1,
  scan_gcp:    1,
  scan_github: 1,
  scan_k8s:    1,
  scan_all:    5,
  visualize:   0.5,
};
const DEFAULT_CREDIT_COST = 1; // fallback for unlisted actions

interface DeductBody {
  action?: string;
}

export async function POST(req: NextRequest) {
  try {
    const user = await getUserFromRequest(req);
    if (!user) {
      return NextResponse.json({ error: 'Invalid or missing API key.' }, { status: 401 });
    }

    const body = (await req.json()) as DeductBody;
    const { action } = body;

    if (!action || typeof action !== 'string' || !action.trim()) {
      return NextResponse.json({ error: 'action is required.' }, { status: 400 });
    }

    // Resolve cost server-side — never trust the client-supplied amount.
    const creditsRequired = CREDIT_COSTS[action] ?? DEFAULT_CREDIT_COST;

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
