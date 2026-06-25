import Stripe from 'stripe';
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2026-05-27.dahlia',
});

async function updateCompanyProfileByEmail(
  supabase: ReturnType<typeof createClient>,
  email: string,
  data: Record<string, unknown>
) {
  // Find workspace by email from users table
  const { data: userData, error: userError } = await supabase
    .from('users')
    .select('workspace_id')
    .eq('email', email)
    .single();

  if (userError || !userData?.workspace_id) {
    console.warn(`No user/workspace found for email: ${email}`);
    return;
  }

  const { error } = await supabase
    .from('company_profiles')
    .update(data)
    .eq('workspace', userData.workspace_id);

  if (error) {
    console.error('Error updating company_profiles:', error);
  }
}

export async function POST(req: NextRequest) {
  const body = await req.text();
  const sig = req.headers.get('stripe-signature')!;

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('Webhook signature verification failed:', message);
    return NextResponse.json({ error: `Webhook error: ${message}` }, { status: 400 });
  }

  try {
    switch (event.type) {

      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        const email = subscription.metadata?.email;

        if (email) {
          const currentPeriodEnd = new Date((subscription as unknown as { current_period_end: number }).current_period_end * 1000).toISOString();
          await updateCompanyProfileByEmail(supabase, email, {
            stripe_customer_id: subscription.customer as string,
            stripe_subscription_id: subscription.id,
            subscription_status: subscription.status,
            subscription_plan: subscription.metadata?.plan || null,
            current_period_end: currentPeriodEnd,
            cancel_at_period_end: subscription.cancel_at_period_end,
          });
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        const email = subscription.metadata?.email;
        if (email) {
          await updateCompanyProfileByEmail(supabase, email, {
            subscription_status: 'canceled',
            cancel_at_period_end: false,
          });
        }
        break;
      }

      case 'customer.subscription.paused': {
        const subscription = event.data.object as Stripe.Subscription;
        const email = subscription.metadata?.email;
        if (email) {
          await updateCompanyProfileByEmail(supabase, email, {
            subscription_status: 'paused',
          });
        }
        break;
      }

      case 'customer.subscription.resumed': {
        const subscription = event.data.object as Stripe.Subscription;
        const email = subscription.metadata?.email;
        if (email) {
          await updateCompanyProfileByEmail(supabase, email, {
            subscription_status: subscription.status,
          });
        }
        break;
      }

      case 'customer.subscription.trial_will_end': {
        const subscription = event.data.object as Stripe.Subscription;
        const email = subscription.metadata?.email;
        if (email) {
          await updateCompanyProfileByEmail(supabase, email, {
            subscription_status: 'trialing',
          });
        }
        break;
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId = invoice.customer as string;
        const customer = await stripe.customers.retrieve(customerId) as Stripe.Customer;
        const email = customer.email;

        if (email) {
          // Get the subscription ID from the invoice
          const subscriptionId = (invoice as unknown as { subscription: string }).subscription;
          if (subscriptionId) {
            const subscription = await stripe.subscriptions.retrieve(subscriptionId);
            const currentPeriodEnd = new Date((subscription as unknown as { current_period_end: number }).current_period_end * 1000).toISOString();
            await updateCompanyProfileByEmail(supabase, email, {
              subscription_status: 'active',
              stripe_customer_id: customerId,
              stripe_subscription_id: subscriptionId,
              current_period_end: currentPeriodEnd,
            });
          }
        }
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        const customer = await stripe.customers.retrieve(invoice.customer as string) as Stripe.Customer;
        const email = customer.email;
        if (email) {
          await updateCompanyProfileByEmail(supabase, email, {
            subscription_status: 'past_due',
          });
        }
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('Webhook handler error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
