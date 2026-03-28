import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import Stripe from 'npm:stripe@14.18.0';

/**
 * Fetch member's available Stripe balance.
 * Returns the member's Stripe customer balance in cents.
 */

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);

  try {
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { member_id } = await req.json();
    if (!member_id) {
      return Response.json(
        { error: 'member_id is required' },
        { status: 400 }
      );
    }

    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'));

    // Fetch member
    const member = await base44.asServiceRole.entities.Member.get(member_id);
    if (!member) {
      return Response.json({ error: 'Member not found' }, { status: 404 });
    }

    // Verify requester is the member
    const requesterMember = await base44.entities.Member.filter({
      email: user.email,
    });
    if (!requesterMember.length || requesterMember[0].id !== member_id) {
      return Response.json(
        { error: 'Can only view your own balance' },
        { status: 403 }
      );
    }

    // If no Stripe customer, balance is 0
    if (!member.stripe_customer_id) {
      return Response.json({ balance: 0, currency: 'USD' });
    }

    // Fetch customer from Stripe
    const customer = await stripe.customers.retrieve(member.stripe_customer_id);

    // Get cash balance if available (newer Stripe API)
    let balance = 0;
    if (customer.cash_balance) {
      // cash_balance is the amount in the customer's account
      balance = customer.cash_balance.available[
        customer.cash_balance.available.length - 1
      ]?.amount || 0;
    }

    return Response.json({
      success: true,
      balance: balance, // in cents
      currency: 'USD',
    });
  } catch (error) {
    console.error('Get balance error:', error);
    return Response.json(
      { error: error.message || 'Failed to fetch balance' },
      { status: 500 }
    );
  }
});