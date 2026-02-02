import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import Stripe from 'npm:stripe@14.18.0';

Deno.serve(async (req) => {
  try {
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY"));
    const base44 = createClientFromRequest(req);

    const user = await base44.auth.me();
    if (!user || user.association_role !== 'Administrator') {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { member_id, amount, speed = 'standard' } = await req.json();

    if (!member_id || !amount || amount <= 0) {
      return Response.json({ error: 'Invalid parameters' }, { status: 400 });
    }

    // Get member and association
    const [member, accounts] = await Promise.all([
      base44.asServiceRole.entities.Member.get(member_id),
      base44.asServiceRole.entities.AssociationAccount.list()
    ]);

    const userAccount = accounts.find(a => a.id === user.association_account_id);

    if (!member) {
      return Response.json({ error: 'Member not found' }, { status: 404 });
    }

    if (!userAccount) {
      return Response.json({ error: 'Association account not found' }, { status: 404 });
    }

    if (!userAccount.stripe_account_id) {
      return Response.json({ error: 'Stripe account not connected. Please complete Stripe onboarding first.' }, { status: 400 });
    }

    if (!member.stripe_bank_account_id) {
      return Response.json({ error: `Member ${member.first_name} ${member.last_name} does not have a bank account set up. They must add their bank account in their profile first.` }, { status: 400 });
    }

    // Create payout to member's bank account
    // Re-tokenize the bank account for this payout
    const bankAccountToken = await stripe.tokens.create({
      bank_account: {
        country: 'US',
        currency: 'usd',
        account_holder_name: member.payout_account_holder,
        account_holder_type: member.payout_account_type || 'individual',
        routing_number: member.payout_routing_number,
        account_number: member.payout_account_number,
      },
    }, {
      stripeAccount: userAccount.stripe_account_id,
    });

    // Create the payout using the bank account token
    const payout = await stripe.payouts.create({
      amount: Math.round(amount * 100),
      currency: 'usd',
      destination: bankAccountToken.bank_account.id,
      method: speed === 'instant' ? 'instant' : 'standard',
      metadata: {
        member_id: member_id,
        member_name: `${member.first_name} ${member.last_name}`,
      }
    }, {
      stripeAccount: userAccount.stripe_account_id,
    });

    return Response.json({ 
      status: 'success',
      payout_id: payout.id,
      amount: amount,
      message: 'Payout processed successfully'
    });
  } catch (error) {
    console.error('Payout error:', error);
    
    let errorMessage = 'Failed to process payout';
    
    if (error.type === 'StripeInvalidRequestError') {
      errorMessage = error.message || 'Invalid payout request';
    } else if (error.type === 'StripeAuthenticationError') {
      errorMessage = 'Stripe authentication failed. Please check your Stripe connection.';
    } else if (error.type === 'StripePermissionError') {
      errorMessage = 'Insufficient permissions. Please complete Stripe onboarding.';
    } else if (error.message) {
      errorMessage = error.message;
    }
    
    return Response.json({ 
      error: errorMessage,
      code: error.code,
      type: error.type
    }, { status: error.statusCode || 500 });
  }
});