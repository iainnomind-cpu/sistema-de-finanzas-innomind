import Stripe from 'stripe';
import { NextRequest, NextResponse } from 'next/server';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export async function OPTIONS() {
  return NextResponse.json({}, { headers: CORS_HEADERS });
}

export async function POST(req: NextRequest) {
  // Always return CORS headers, even on early errors
  try {
    const secretKey = process.env.STRIPE_SECRET_KEY;
    if (!secretKey) {
      return NextResponse.json(
        { error: 'Stripe not configured on server' },
        { status: 500, headers: CORS_HEADERS }
      );
    }

    const stripe = new Stripe(secretKey, {
      apiVersion: '2026-05-27.dahlia',
    });

    const body = await req.json();
    const { planKey, email, name, company, plan } = body;

    let priceId = body.priceId;

    if (planKey) {
      if (planKey === 'core' || planKey === 'crm-erp') {
        priceId = process.env.STRIPE_PRICE_CORE_MONTHLY;
      } else if (planKey === 'trak' || planKey === 'project-tracker') {
        priceId = process.env.STRIPE_PRICE_TRAK_MONTHLY;
      }
    }

    if (!priceId || !email) {
      return NextResponse.json(
        { error: 'Missing required fields: planKey/priceId and email are required' },
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

    // Success URL — redirect back to Innomind after payment
    const innomindUrl = process.env.NEXT_PUBLIC_INNOMIND_URL || 'https://innomind.vercel.app';

    // Create Checkout Session with 15-day free trial, no card required upfront
    const session = await stripe.checkout.sessions.create({
      customer: customer.id,
      mode: 'subscription',
      payment_method_types: ['card'],
      payment_method_collection: 'if_required', // No card required during trial
      line_items: [{ price: priceId, quantity: 1 }],
      subscription_data: {
        trial_period_days: 15, // 15-day free trial
        trial_settings: {
          end_behavior: {
            missing_payment_method: 'pause', // Pause (not cancel) if no card at trial end
          },
        },
        metadata: { plan, company, email },
      },
      success_url: `${innomindUrl}?pago=exitoso&plan=${plan}`,
      cancel_url: `${innomindUrl}?pago=cancelado`,
      metadata: { plan, company, email },
      locale: 'es-419',
      allow_promotion_codes: true,
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
