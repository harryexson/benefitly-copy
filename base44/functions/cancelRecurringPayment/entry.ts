import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import Stripe from 'npm:stripe@17.5.0';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'), {
  apiVersion: '2024-12-18.acacia',
});

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { member_id } = await req.json();

    if (!member_id) {
      return Response.json({ error: 'Member ID required' }, { status: 400 });
    }

    const member = await base44.asServiceRole.entities.Member.get(member_id);
    if (!member) {
      return Response.json({ error: 'Member not found' }, { status: 404 });
    }

    if (!member.stripe_subscription_id) {
      return Response.json({ error: 'No active subscription found' }, { status: 400 });
    }

    const associationAccount = await base44.asServiceRole.entities.AssociationAccount.get(user.association_account_id);
    if (!associationAccount?.stripe_account_id) {
      return Response.json({ 
        error: 'Association Stripe account not connected' 
      }, { status: 400 });
    }

    // Cancel subscription at period end
    await stripe.subscriptions.update(
      member.stripe_subscription_id,
      { cancel_at_period_end: true },
      { stripeAccount: associationAccount.stripe_account_id }
    );

    // Update member record
    await base44.asServiceRole.entities.Member.update(member.id, {
      recurring_contribution_enabled: false
    });

    return Response.json({ 
      success: true,
      message: 'Recurring payment will be cancelled at the end of the billing period'
    });

  } catch (error) {
    console.error('Cancel recurring payment error:', error);
    return Response.json({ 
      error: error.message || 'Failed to cancel recurring payment'
    }, { status: 500 });
  }
});