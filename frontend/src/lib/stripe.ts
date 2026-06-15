import Stripe from 'stripe';

/**
 * AgentSentry is still in active development. New Pro purchases/subscriptions
 * are paused — the dashboard points users to support instead of checkout, and
 * these billing routes refuse new checkout sessions as defense-in-depth.
 * Set BILLING_PAUSED=false once Pro is ready to sell.
 */
export const BILLING_PAUSED = process.env.BILLING_PAUSED !== 'false';
export const BILLING_PAUSED_MESSAGE =
  'AgentSentry is in beta and new purchases are temporarily paused. Contact support@agentsentry.org if you need Pro access.';

let stripeInstance: Stripe | null = null;

/**
 * Lazily constructs the Stripe client so a missing STRIPE_SECRET_KEY only
 * throws when a billing route actually runs, not at module-import time
 * (which would break `next build`).
 */
export function getStripe(): Stripe {
  if (!stripeInstance) {
    const secretKey = process.env.STRIPE_SECRET_KEY;
    if (!secretKey) {
      throw new Error('STRIPE_SECRET_KEY environment variable is not set');
    }
    stripeInstance = new Stripe(secretKey);
  }
  return stripeInstance;
}
