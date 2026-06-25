import Stripe from 'stripe';
import { NextRequest, NextResponse } from 'next/server';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export async function OPTIONS() {
  return NextResponse.json({}, { headers: CORS_HEADERS });
}

export async function GET(req: NextRequest) {
  try {
    const secretKey = process.env.STRIPE_SECRET_KEY;
    if (!secretKey) {
      return NextResponse.json(
        { error: 'Stripe not configured' },
        { status: 500, headers: CORS_HEADERS }
      );
    }

    const email = req.nextUrl.searchParams.get('email');
    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400, headers: CORS_HEADERS }
      );
    }

    const stripe = new Stripe(secretKey, { apiVersion: '2026-05-27.dahlia' });

    // Find customer by email
    const customers = await stripe.customers.list({ email, limit: 1 });
    const customer = customers.data[0];

    if (!customer) {
      return NextResponse.json(
        { subscription: null, status: 'no_customer' },
        { headers: CORS_HEADERS }
      );
    }

    // Get their subscriptions
    const subscriptions = await stripe.subscriptions.list({
      customer: customer.id,
      status: 'all',
      limit: 5,
      expand: ['data.default_payment_method'],
    });

    // Find the most relevant subscription (active or trialing first, then most recent)
    const priority = ['active', 'trialing', 'past_due', 'paused', 'unpaid', 'canceled'];
    const sorted = [...subscriptions.data].sort((a, b) => {
      return priority.indexOf(a.status) - priority.indexOf(b.status);
    });

    const sub = sorted[0];

    if (!sub) {
      return NextResponse.json(
        { subscription: null, status: 'no_subscription', customerId: customer.id },
        { headers: CORS_HEADERS }
      );
    }

    const subWithPeriod = sub as unknown as {
      current_period_end: number;
      trial_end: number | null;
    };

    const currentPeriodEnd = new Date(subWithPeriod.current_period_end * 1000);
    const trialEnd = subWithPeriod.trial_end ? new Date(subWithPeriod.trial_end * 1000) : null;
    const now = new Date();

    // Compute days remaining
    const referenceDate = sub.status === 'trialing' && trialEnd ? trialEnd : currentPeriodEnd;
    const diffMs = referenceDate.getTime() - now.getTime();
    const daysRemaining = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));

    // Get recent invoices
    const invoices = await stripe.invoices.list({
      customer: customer.id,
      limit: 5,
    });

    const invoiceList = invoices.data.map((inv) => ({
      id: inv.id,
      amount: inv.amount_paid / 100,
      currency: inv.currency,
      status: inv.status,
      date: inv.created ? new Date(inv.created * 1000).toISOString() : null,
      pdfUrl: inv.invoice_pdf,
      hostedUrl: inv.hosted_invoice_url,
    }));

    return NextResponse.json(
      {
        customerId: customer.id,
        subscriptionId: sub.id,
        status: sub.status,
        plan: sub.metadata?.plan || null,
        currentPeriodEnd: currentPeriodEnd.toISOString(),
        trialEnd: trialEnd?.toISOString() || null,
        cancelAtPeriodEnd: sub.cancel_at_period_end,
        daysRemaining,
        invoices: invoiceList,
      },
      { headers: CORS_HEADERS }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Subscription status error:', message);
    return NextResponse.json(
      { error: message },
      { status: 500, headers: CORS_HEADERS }
    );
  }
}
