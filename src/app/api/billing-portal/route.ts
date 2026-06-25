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
  try {
    const secretKey = process.env.STRIPE_SECRET_KEY;
    if (!secretKey) {
      return NextResponse.json(
        { error: 'Stripe not configured' },
        { status: 500, headers: CORS_HEADERS }
      );
    }

    const { email } = await req.json();
    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400, headers: CORS_HEADERS }
      );
    }

    const stripe = new Stripe(secretKey, { apiVersion: '2026-05-27.dahlia' });
    const innomindUrl = process.env.NEXT_PUBLIC_INNOMIND_URL || 'https://innomind-erp.vercel.app';

    // Find or create customer
    const customers = await stripe.customers.list({ email, limit: 1 });
    let customer = customers.data[0];

    if (!customer) {
      customer = await stripe.customers.create({ email });
    }

    const portalSession = await stripe.billingPortal.sessions.create({
      customer: customer.id,
      return_url: `${innomindUrl}/configuracion`,
    });

    return NextResponse.json({ url: portalSession.url }, { headers: CORS_HEADERS });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Billing portal error:', message);
    return NextResponse.json(
      { error: message },
      { status: 500, headers: CORS_HEADERS }
    );
  }
}
