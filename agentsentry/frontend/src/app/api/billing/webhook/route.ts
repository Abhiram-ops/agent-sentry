import { NextRequest, NextResponse } from 'next/server';
import type Stripe from 'stripe';
import { addCredits } from '@/lib/db';
import { getStripe } from '@/lib/stripe';

export async function POST(req: NextRequest) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error('[/api/billing/webhook] STRIPE_WEBHOOK_SECRET is not configured');
    return NextResponse.json({ error: 'Webhook not configured.' }, { status: 500 });
  }

  const signature = req.headers.get('stripe-signature');
  if (!signature) {
    return NextResponse.json({ error: 'Missing stripe-signature header.' }, { status: 400 });
  }

  const payload = await req.text();
  const stripe = getStripe();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(payload, signature, webhookSecret);
  } catch (err) {
    console.error('[/api/billing/webhook] signature verification failed', err);
    return NextResponse.json({ error: 'Invalid signature.' }, { status: 400 });
  }

  try {
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;

      const userId = session.metadata?.user_id;
      const credits = session.metadata?.credits;

      if (!userId || !credits) {
        console.error('[/api/billing/webhook] missing metadata on session', session.id);
        return NextResponse.json({ received: true });
      }

      const costUsd = session.amount_total !== null ? session.amount_total / 100 : 0;
      const result = await addCredits(Number(userId), Number(credits), costUsd, session.id);

      if (result.alreadyProcessed) {
        console.log('[/api/billing/webhook] duplicate event, skipping', session.id);
      }
    }

    return NextResponse.json({ received: true });
  } catch (err) {
    console.error('[/api/billing/webhook]', err);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}
