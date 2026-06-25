import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { getStripe, BILLING_PAUSED, BILLING_PAUSED_MESSAGE } from '@/lib/stripe';

export async function POST(req: NextRequest) {
  try {
    if (BILLING_PAUSED) {
      return NextResponse.json({ error: BILLING_PAUSED_MESSAGE }, { status: 503 });
    }

    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated.' }, { status: 401 });
    }

    if (user.tier !== 'pro') {
      return NextResponse.json(
        { error: 'Automated scans require an active Pro license.' },
        { status: 403 },
      );
    }

    if (user.subscription_status === 'active') {
      return NextResponse.json(
        { error: 'Automation subscription is already active.' },
        { status: 409 },
      );
    }

    const priceId = process.env.STRIPE_AUTOMATION_PRICE_ID;
    if (!priceId) {
      console.error('[/api/billing/subscribe] STRIPE_AUTOMATION_PRICE_ID is not configured');
      return NextResponse.json({ error: 'Automation billing is not configured.' }, { status: 500 });
    }

    const origin = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://agentsentry.org';
    const stripe = getStripe();

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${origin}/dashboard?subscription=success`,
      cancel_url: `${origin}/dashboard?subscription=cancelled`,
      client_reference_id: String(user.id),
      customer: user.stripe_customer_id ?? undefined,
      customer_email: user.stripe_customer_id ? undefined : user.email,
      metadata: { user_id: String(user.id) },
      subscription_data: {
        metadata: { user_id: String(user.id) },
      },
    });

    if (!session.url) {
      return NextResponse.json({ error: 'Failed to create checkout session.' }, { status: 502 });
    }

    return NextResponse.json({ checkout_url: session.url });
  } catch (err) {
    console.error('[/api/billing/subscribe]', err);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}
