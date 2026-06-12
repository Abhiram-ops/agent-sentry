import { NextRequest, NextResponse } from 'next/server';
import { getCreditPackageById, getUserFromRequest } from '@/lib/db';
import { getStripe } from '@/lib/stripe';

interface CreateCheckoutBody {
  package_id?: number;
}

export async function POST(req: NextRequest) {
  try {
    const user = await getUserFromRequest(req);
    if (!user) {
      return NextResponse.json({ error: 'Invalid or missing API key.' }, { status: 401 });
    }

    const body = (await req.json()) as CreateCheckoutBody;
    const packageId = body.package_id;

    if (typeof packageId !== 'number') {
      return NextResponse.json({ error: 'package_id is required.' }, { status: 400 });
    }

    const pkg = await getCreditPackageById(packageId);
    if (!pkg) {
      return NextResponse.json({ error: 'Unknown credit package.' }, { status: 404 });
    }

    const origin = req.headers.get('origin') ?? new URL(req.url).origin;
    const stripe = getStripe();

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: [{ price: pkg.stripe_price_id, quantity: 1 }],
      success_url: `${origin}/dashboard?checkout=success`,
      cancel_url: `${origin}/dashboard?checkout=cancelled`,
      client_reference_id: String(user.id),
      metadata: {
        user_id: String(user.id),
        package_id: String(pkg.id),
        credits: String(pkg.credits),
      },
    });

    if (!session.url) {
      return NextResponse.json({ error: 'Failed to create checkout session.' }, { status: 502 });
    }

    return NextResponse.json({ checkout_url: session.url });
  } catch (err) {
    console.error('[/api/billing/create-checkout]', err);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}
