import { NextRequest, NextResponse } from 'next/server';
import type Stripe from 'stripe';
import {
  addCredits,
  setSubscriptionActive,
  updateSubscriptionStatus,
  type SubscriptionStatus,
} from '@/lib/db';
import { getStripe } from '@/lib/stripe';

function mapSubscriptionStatus(status: Stripe.Subscription.Status): SubscriptionStatus {
  switch (status) {
    case 'active':
    case 'trialing':
      return 'active';
    case 'past_due':
    case 'unpaid':
    case 'incomplete':
      return 'past_due';
    default:
      return 'canceled';
  }
}

function subscriptionPeriodEnd(subscription: Stripe.Subscription): Date | null {
  const ts = subscription.items.data[0]?.current_period_end;
  return ts ? new Date(ts * 1000) : null;
}

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
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;

        if (session.mode === 'subscription') {
          const userId = session.metadata?.user_id;
          const customerId = session.customer;
          const subscriptionId = session.subscription;

          if (!userId || typeof customerId !== 'string' || typeof subscriptionId !== 'string') {
            console.error('[/api/billing/webhook] missing subscription data on session', session.id);
            break;
          }

          const subscription = await stripe.subscriptions.retrieve(subscriptionId);
          const periodEnd = subscriptionPeriodEnd(subscription) ?? new Date();
          await setSubscriptionActive(Number(userId), customerId, subscriptionId, periodEnd);
          break;
        }

        const userId = session.metadata?.user_id;
        const credits = session.metadata?.credits;

        if (!userId || !credits) {
          console.error('[/api/billing/webhook] missing metadata on session', session.id);
          break;
        }

        const costUsd = session.amount_total !== null ? session.amount_total / 100 : 0;
        const result = await addCredits(Number(userId), Number(credits), costUsd, session.id);

        if (result.alreadyProcessed) {
          console.log('[/api/billing/webhook] duplicate event, skipping', session.id);
        }
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        await updateSubscriptionStatus(
          subscription.id,
          mapSubscriptionStatus(subscription.status),
          subscriptionPeriodEnd(subscription),
        );
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        await updateSubscriptionStatus(subscription.id, 'canceled', null);
        break;
      }

      default:
        break;
    }

    return NextResponse.json({ received: true });
  } catch (err) {
    console.error('[/api/billing/webhook]', err);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}
