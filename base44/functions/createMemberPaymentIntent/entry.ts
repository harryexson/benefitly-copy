import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import Stripe from 'npm:stripe@14.18.0';

Deno.serve(async (req) => {
  try {
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY"));
    const base44 = createClientFromRequest(req);

    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { amount, contribution_id } = await req.json();

    if (!amount || amount <= 0) {
      return Response.json({ error: 'Invalid amount' }, { status: 400 });
    }

    // Get association account for connected account
    const accounts = await base44.asServiceRole.entities.AssociationAccount.list();
    const userAccount = accounts.find(a => a.id === user.association_account_id);

    if (!userAccount?.stripe_account_id) {
      return Response.json({ error: 'Stripe account not connected' }, { status: 400 });
    }

    // Create payment intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount), // amount in cents
      currency: 'usd',
      automatic_payment_methods: { enabled: true },
      metadata: {
        contribution_id: contribution_id || '',
        user_email: user.email
      }
    }, {
      stripeAccount: userAccount.stripe_account_id
    });

    return Response.json({ 
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id
    });
  } catch (error) {
    console.error('Payment intent error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});