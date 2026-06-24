import Stripe from 'stripe';
import { NextRequest, NextResponse } from 'next/server';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2026-05-27.dahlia',
});

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export async function OPTIONS() {
  return NextResponse.json({}, { headers: CORS_HEADERS });
}

export async function POST(req: NextRequest) {
  try {
    const { priceId, email, name, company, plan } = await req.json();

    if (!priceId || !email) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400, headers: CORS_HEADERS }
      );
    }

    // Create or retrieve Stripe customer
    const customers = await stripe.customers.list({ email, limit: 1 });
    let customer = customers.data[0];

    if (!customer) {
      customer = await stripe.customers.create({
        email,
        name,
        metadata: { company, plan },
      });
    }

    // Determine success URL — send back to innomind landing or finapp
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://innomind.app';

    // Create Checkout Session with 14-day free trial
    const session = await stripe.checkout.sessions.create({
      customer: customer.id,
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      subscription_data: {
        trial_period_days: 14,
        metadata: { plan, company, email },
      },
      success_url: `${appUrl}?pago=exitoso&plan=${plan}`,
      cancel_url: `${appUrl}?pago=cancelado`,
      metadata: { plan, company, email },
      locale: 'es-419',
    });

    return NextResponse.json({ url: session.url }, { headers: CORS_HEADERS });
  } catch (error: any) {
    console.error('Stripe checkout error:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500, headers: CORS_HEADERS }
    );
  }
}
