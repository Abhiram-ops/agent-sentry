import Stripe from 'stripe';

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
