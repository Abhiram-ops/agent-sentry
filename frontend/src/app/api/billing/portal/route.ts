import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/db';
import { getStripe } from '@/lib/stripe';

export async function POST(req: NextRequest) {
  try {
    const user = await getUserFromRequest(req);
    if (!user) {
      return NextResponse.json({ error: 'Invalid or missing API key.' }, { status: 401 });
    }

    if (!user.stripe_customer_id) {
      return NextResponse.json({ error: 'No billing account found.' }, { status: 404 });
    }

    const origin = req.headers.get('origin') ?? new URL(req.url).origin;
    const stripe = getStripe();

    const session = await stripe.billingPortal.sessions.create({
      customer: user.stripe_customer_id,
      return_url: `${origin}/dashboard`,
    });

    return NextResponse.json({ portal_url: session.url });
  } catch (err) {
    console.error('[/api/billing/portal]', err);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}
