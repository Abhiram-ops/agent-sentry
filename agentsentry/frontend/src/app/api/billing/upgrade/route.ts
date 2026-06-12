import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest, upgradeUserToPro } from '@/lib/db';
import { getStripe } from '@/lib/stripe';
import { sendProCodeEmail } from '@/lib/email';

interface UpgradeBody {
  stripe_transaction_id?: string;
  dev_approval_code?: string;
}

/**
 * Verifies a Stripe identifier (checkout session or payment intent) actually
 * represents a completed payment. Returns true only on a confirmed-paid status.
 */
async function isStripePaymentValid(transactionId: string): Promise<boolean> {
  const stripe = getStripe();

  if (transactionId.startsWith('cs_')) {
    const session = await stripe.checkout.sessions.retrieve(transactionId);
    return session.payment_status === 'paid';
  }

  if (transactionId.startsWith('pi_')) {
    const intent = await stripe.paymentIntents.retrieve(transactionId);
    return intent.status === 'succeeded';
  }

  // Fall back to a charge lookup for ch_ / other ids.
  try {
    const charge = await stripe.charges.retrieve(transactionId);
    return charge.paid === true && charge.status === 'succeeded';
  } catch {
    return false;
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getUserFromRequest(req);
    if (!user) {
      return NextResponse.json({ error: 'Invalid or missing API key.' }, { status: 401 });
    }

    const body = (await req.json()) as UpgradeBody;
    const txnId = body.stripe_transaction_id?.trim();
    const devCode = body.dev_approval_code?.trim();

    let approved = false;

    if (devCode) {
      const expected = process.env.DEV_APPROVAL_CODE;
      if (expected && devCode === expected) {
        approved = true;
      } else {
        return NextResponse.json({ error: 'Invalid dev approval code.' }, { status: 403 });
      }
    } else if (txnId) {
      approved = await isStripePaymentValid(txnId);
      if (!approved) {
        return NextResponse.json(
          { error: 'Payment could not be verified.' },
          { status: 402 },
        );
      }
    } else {
      return NextResponse.json(
        { error: 'A stripe_transaction_id or dev_approval_code is required.' },
        { status: 400 },
      );
    }

    if (user.tier === 'pro') {
      return NextResponse.json({
        tier: 'pro',
        activation_code: user.activation_code,
        already_pro: true,
      });
    }

    const upgraded = await upgradeUserToPro(user.id);
    if (!upgraded || !upgraded.activation_code) {
      return NextResponse.json({ error: 'Upgrade failed.' }, { status: 500 });
    }

    // Email the freshly-issued AS-PRO code.
    await sendProCodeEmail(upgraded.email, upgraded.activation_code);

    return NextResponse.json({
      tier: upgraded.tier,
      activation_code: upgraded.activation_code,
    });
  } catch (err) {
    console.error('[/api/billing/upgrade]', err);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}
