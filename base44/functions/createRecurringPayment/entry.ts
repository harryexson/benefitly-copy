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

    const { member_id, amount, frequency, payment_method_id } = await req.json();

    if (!member_id || !amount || !frequency) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Get member and association details
    const member = await base44.asServiceRole.entities.Member.get(member_id);
    if (!member) {
      return Response.json({ error: 'Member not found' }, { status: 404 });
    }

    const associationAccount = await base44.asServiceRole.entities.AssociationAccount.get(user.association_account_id);
    if (!associationAccount?.stripe_account_id) {
      return Response.json({ 
        error: 'Association Stripe account not connected' 
      }, { status: 400 });
    }

    if (!associationAccount.stripe_charges_enabled) {
      return Response.json({ 
        error: 'Association Stripe account not yet verified to accept payments' 
      }, { status: 400 });
    }

    // Calculate interval based on frequency
    const intervalMap = {
      monthly: { interval: 'month', interval_count: 1 },
      quarterly: { interval: 'month', interval_count: 3 },
      annually: { interval: 'year', interval_count: 1 }
    };

    const { interval, interval_count } = intervalMap[frequency] || intervalMap.monthly;

    // Create or retrieve Stripe customer
    let customerId = member.stripe_customer_id;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: member.email,
        name: `${member.first_name} ${member.last_name}`,
        metadata: {
          member_id: member.id,
          association_account_id: associationAccount.id
        }
      }, {
        stripeAccount: associationAccount.stripe_account_id
      });
      customerId = customer.id;
      
      await base44.asServiceRole.entities.Member.update(member.id, {
        stripe_customer_id: customerId
      });
    }

    // Attach payment method if provided
    if (payment_method_id) {
      await stripe.paymentMethods.attach(payment_method_id, {
        customer: customerId
      }, {
        stripeAccount: associationAccount.stripe_account_id
      });

      await stripe.customers.update(customerId, {
        invoice_settings: {
          default_payment_method: payment_method_id
        }
      }, {
        stripeAccount: associationAccount.stripe_account_id
      });
    }

    // Create product and price for recurring contribution
    const product = await stripe.products.create({
      name: `Recurring Contribution - ${associationAccount.organization_name}`,
      metadata: {
        member_id: member.id,
        association_account_id: associationAccount.id
      }
    }, {
      stripeAccount: associationAccount.stripe_account_id
    });

    const price = await stripe.prices.create({
      product: product.id,
      unit_amount: Math.round(amount * 100),
      currency: 'usd',
      recurring: {
        interval: interval,
        interval_count: interval_count
      }
    }, {
      stripeAccount: associationAccount.stripe_account_id
    });

    // Create subscription
    const subscription = await stripe.subscriptions.create({
      customer: customerId,
      items: [{ price: price.id }],
      default_payment_method: payment_method_id || member.stripe_payment_method_id,
      metadata: {
        member_id: member.id,
        association_account_id: associationAccount.id,
        type: 'recurring_contribution'
      }
    }, {
      stripeAccount: associationAccount.stripe_account_id
    });

    // Update member record
    await base44.asServiceRole.entities.Member.update(member.id, {
      stripe_subscription_id: subscription.id,
      recurring_contribution_enabled: true,
      recurring_contribution_amount: amount,
      recurring_contribution_frequency: frequency
    });

    return Response.json({ 
      success: true,
      subscription_id: subscription.id,
      message: 'Recurring payment set up successfully'
    });

  } catch (error) {
    console.error('Create recurring payment error:', error);
    return Response.json({ 
      error: error.message || 'Failed to create recurring payment'
    }, { status: 500 });
  }
});