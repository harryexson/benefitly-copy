import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import Stripe from 'npm:stripe@17.5.0';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'));

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Authenticate user
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { tier_id, billing_cycle, association_account_id } = await req.json();

    if (!tier_id || !billing_cycle) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Fetch the subscription tier
    const tiers = await base44.asServiceRole.entities.SubscriptionTier.list();
    const tier = tiers.find(t => t.id === tier_id);

    if (!tier) {
      return Response.json({ error: 'Invalid subscription tier' }, { status: 404 });
    }

    // Get the appropriate price ID
    const priceId = billing_cycle === 'monthly' 
      ? tier.stripe_monthly_price_id 
      : tier.stripe_yearly_price_id;

    if (!priceId) {
      return Response.json({ 
        error: `No Stripe price ID configured for ${billing_cycle} billing` 
      }, { status: 400 });
    }

    // Create or retrieve Stripe customer
    let customerId;
    const existingCustomers = await stripe.customers.list({
      email: user.email,
      limit: 1
    });

    if (existingCustomers.data.length > 0) {
      customerId = existingCustomers.data[0].id;
    } else {
      const customer = await stripe.customers.create({
        email: user.email,
        name: user.full_name,
        metadata: {
          user_id: user.id,
          association_account_id: association_account_id || ''
        }
      });
      customerId = customer.id;
    }

    // Use custom domain
    const appDomain = 'https://benefitly.app';

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      mode: 'subscription',
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: `${appDomain}/SubscriptionSuccess?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appDomain}/Billing?canceled=true`,
      metadata: {
        user_id: user.id,
        association_account_id: association_account_id || '',
        tier_id: tier_id,
        billing_cycle: billing_cycle
      },
      subscription_data: {
        metadata: {
          user_id: user.id,
          association_account_id: association_account_id || '',
          tier_id: tier_id
        }
      }
    });

    return Response.json({ 
      url: session.url,
      session_id: session.id 
    });

  } catch (error) {
    console.error('Checkout creation failed:', error);
    return Response.json({ 
      error: error.message || 'Failed to create checkout session' 
    }, { status: 500 });
  }
});