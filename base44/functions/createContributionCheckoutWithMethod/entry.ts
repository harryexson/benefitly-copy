import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import Stripe from 'npm:stripe@17.5.0';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'), {
  apiVersion: '2024-12-18.acacia',
});

Deno.serve(async (req) => {
  const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  console.log(`[${requestId}] ===== PAYMENT REQUEST START =====`);
  
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      console.log(`[${requestId}] ERROR: Unauthorized`);
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { contribution_id, payment_method } = await req.json();
    console.log(`[${requestId}] Request params:`, { contribution_id, payment_method, user_email: user.email });

    if (!contribution_id) {
      console.log(`[${requestId}] ERROR: Missing contribution_id`);
      return Response.json({ error: 'Contribution ID is required' }, { status: 400 });
    }

    // Fetch contribution details
    const contribution = await base44.asServiceRole.entities.EventContribution.get(contribution_id);
    if (!contribution) {
      console.log(`[${requestId}] ERROR: Contribution not found`);
      return Response.json({ error: 'Contribution not found' }, { status: 404 });
    }
    console.log(`[${requestId}] Contribution:`, { id: contribution.id, amount_due: contribution.amount_due, status: contribution.status });

    // Fetch member details
    const member = await base44.asServiceRole.entities.Member.get(contribution.member_id);
    if (!member) {
      console.log(`[${requestId}] ERROR: Member not found`);
      return Response.json({ error: 'Member not found' }, { status: 404 });
    }
    console.log(`[${requestId}] Member:`, { 
      id: member.id, 
      email: member.email,
      stripe_customer_id: member.stripe_customer_id || 'NONE',
      stripe_payment_method_id: member.stripe_payment_method_id || 'NONE',
      stripe_bank_account_id: member.stripe_bank_account_id || 'NONE'
    });

    // Fetch event details
    const event = await base44.asServiceRole.entities.Event.get(contribution.event_id);
    if (!event) {
      console.log(`[${requestId}] ERROR: Event not found`);
      return Response.json({ error: 'Event not found' }, { status: 404 });
    }
    console.log(`[${requestId}] Event:`, { id: event.id, title: event.title });

    // Get association account
    if (!user.association_account_id) {
      console.log(`[${requestId}] ERROR: No association account ID on user`);
      return Response.json({ error: 'User is not associated with any association account' }, { status: 400 });
    }

    const associationAccount = await base44.asServiceRole.entities.AssociationAccount.get(user.association_account_id);
    if (!associationAccount) {
      console.log(`[${requestId}] ERROR: Association account not found`);
      return Response.json({ error: 'Association account not found' }, { status: 404 });
    }
    console.log(`[${requestId}] Association:`, {
      id: associationAccount.id,
      stripe_account_id: associationAccount.stripe_account_id || 'NONE',
      charges_enabled: associationAccount.stripe_charges_enabled,
      payouts_enabled: associationAccount.stripe_payouts_enabled
    });

    if (!associationAccount?.stripe_account_id) {
      console.log(`[${requestId}] ERROR: No Stripe account connected`);
      return Response.json({ 
        error: 'Association Stripe account not connected. Please contact your administrator.' 
      }, { status: 400 });
    }

    if (!associationAccount.stripe_charges_enabled) {
      console.log(`[${requestId}] ERROR: Charges not enabled`);
      return Response.json({ 
        error: 'Association Stripe account is not yet verified to accept payments. Please complete Stripe onboarding in Settings.' 
      }, { status: 400 });
    }

    // Calculate fee handling
    const feeHandling = associationAccount.processing_fee_handling || 'absorbed';
    const stripeFeePercent = 0.029;
    const stripeFeeFixed = 0.30;
    
    let amountToCharge = contribution.amount_due;
    if (feeHandling === 'passed_to_member') {
      amountToCharge = (contribution.amount_due + stripeFeeFixed) / (1 - stripeFeePercent);
    }

    const amountInCents = Math.round(amountToCharge * 100);
    console.log(`[${requestId}] Payment amount:`, { 
      base: contribution.amount_due, 
      with_fees: amountToCharge, 
      cents: amountInCents,
      fee_handling: feeHandling
    });

    // Handle different payment methods
    if (payment_method === 'saved_card' && member.stripe_payment_method_id) {
      // Use saved card payment method
      if (!member.stripe_customer_id) {
        return Response.json({ error: 'No Stripe customer ID found' }, { status: 400 });
      }

      console.log(`[${requestId}] Processing saved card payment:`, {
        customer: member.stripe_customer_id,
        payment_method: member.stripe_payment_method_id,
        amount: amountInCents,
        connected_account: associationAccount.stripe_account_id
      });

      // Validate that payment method exists on connected account
      try {
        const paymentMethodCheck = await stripe.paymentMethods.retrieve(
          member.stripe_payment_method_id,
          { stripeAccount: associationAccount.stripe_account_id }
        );
        console.log(`[${requestId}] Payment method verified:`, {
          id: paymentMethodCheck.id,
          type: paymentMethodCheck.type,
          customer: paymentMethodCheck.customer
        });
        
        // Verify payment method is attached to the customer
        if (paymentMethodCheck.customer !== member.stripe_customer_id) {
          console.log(`[${requestId}] ERROR: Payment method customer mismatch:`, {
            pm_customer: paymentMethodCheck.customer,
            member_customer: member.stripe_customer_id
          });
          return Response.json({ 
            error: 'Payment method is not attached to your account. Please use a new card.',
            details: 'Customer ID mismatch'
          }, { status: 400 });
        }
      } catch (pmError) {
        console.error(`[${requestId}] Payment method retrieval failed:`, pmError.message);
        return Response.json({ 
          error: 'Saved payment method is not available. Please use a new card or update your payment methods.',
          details: pmError.message
        }, { status: 400 });
      }

      // Create payment intent with saved payment method (direct charge on connected account)
      const paymentIntent = await stripe.paymentIntents.create({
        amount: amountInCents,
        currency: contribution.currency || 'usd',
        customer: member.stripe_customer_id,
        payment_method: member.stripe_payment_method_id,
        confirm: true,
        off_session: true,
        description: `Contribution for ${event.title}`,
        metadata: {
          contribution_id: contribution.id,
          member_id: member.id,
          event_id: event.id,
          association_account_id: associationAccount.id,
        },
      }, {
        stripeAccount: associationAccount.stripe_account_id,
      });

      console.log(`[${requestId}] Payment intent result:`, {
        id: paymentIntent.id,
        status: paymentIntent.status,
        amount: paymentIntent.amount
      });

      if (paymentIntent.status === 'succeeded') {
        // Update contribution as paid
        await base44.asServiceRole.entities.EventContribution.update(contribution.id, {
          status: 'Paid',
          amount_paid: contribution.amount_due,
          paid_at: new Date().toISOString(),
        });

        console.log(`[${requestId}] SUCCESS: Payment completed`);
        return Response.json({ 
          success: true,
          message: 'Payment completed successfully',
          payment_intent_id: paymentIntent.id
        });
      } else {
        console.log(`[${requestId}] ERROR: Payment requires action:`, paymentIntent.status);
        return Response.json({ 
          error: 'Payment requires additional action',
          status: paymentIntent.status
        }, { status: 400 });
      }

    } else if (payment_method === 'bank_account') {
      // Create checkout session for ACH bank account payment
      console.log(`[${requestId}] Creating checkout session for bank account payment`);
      
      const sessionConfig = {
        mode: 'payment',
        payment_method_types: ['us_bank_account'],
        line_items: [{
          price_data: {
            currency: contribution.currency || 'usd',
            product_data: {
              name: `Contribution: ${event.title}`,
              description: event.type || 'Event contribution',
            },
            unit_amount: amountInCents,
          },
          quantity: 1,
        }],
        payment_method_options: {
          us_bank_account: {
            financial_connections: {
              permissions: ['payment_method'],
            },
            verification_method: 'instant',
          },
        },
        metadata: {
          contribution_id: contribution.id,
          member_id: member.id,
          event_id: event.id,
          association_account_id: associationAccount.id,
        },
        success_url: `${req.headers.get('origin')}/Dashboard?payment=success`,
        cancel_url: `${req.headers.get('origin')}/Dashboard?payment=cancelled`,
      };
      
      // Use existing customer if available, otherwise use email
      if (member.stripe_customer_id) {
        sessionConfig.customer = member.stripe_customer_id;
        console.log(`[${requestId}] Using existing customer:`, member.stripe_customer_id);
      } else {
        sessionConfig.customer_email = member.email;
        console.log(`[${requestId}] Using customer email:`, member.email);
      }
      
      const checkoutSession = await stripe.checkout.sessions.create(sessionConfig, {
        stripeAccount: associationAccount.stripe_account_id,
      });

      console.log(`[${requestId}] SUCCESS: ACH checkout session created:`, checkoutSession.id);
      return Response.json({ 
        checkoutUrl: checkoutSession.url,
        session_id: checkoutSession.id
      });

    } else {
      // Default: Create checkout session for new card (on connected account)
      console.log(`[${requestId}] Creating checkout session for new card`);
      
      const sessionConfig = {
        mode: 'payment',
        payment_method_types: ['card'],
        line_items: [{
          price_data: {
            currency: contribution.currency || 'usd',
            product_data: {
              name: `Contribution: ${event.title}`,
              description: event.type || 'Event contribution',
            },
            unit_amount: amountInCents,
          },
          quantity: 1,
        }],
        metadata: {
          contribution_id: contribution.id,
          member_id: member.id,
          event_id: event.id,
          association_account_id: associationAccount.id,
        },
        success_url: `${req.headers.get('origin')}/Dashboard?payment=success`,
        cancel_url: `${req.headers.get('origin')}/Dashboard?payment=cancelled`,
      };
      
      // Use existing customer if available, otherwise use email
      if (member.stripe_customer_id) {
        sessionConfig.customer = member.stripe_customer_id;
        console.log(`[${requestId}] Using existing customer:`, member.stripe_customer_id);
      } else {
        sessionConfig.customer_email = member.email;
        console.log(`[${requestId}] Using customer email:`, member.email);
      }
      
      const checkoutSession = await stripe.checkout.sessions.create(sessionConfig, {
        stripeAccount: associationAccount.stripe_account_id,
      });

      console.log(`[${requestId}] SUCCESS: Checkout session created:`, checkoutSession.id);
      return Response.json({ 
        checkoutUrl: checkoutSession.url,
        session_id: checkoutSession.id
      });
    }

  } catch (error) {
    console.error('=== PAYMENT ERROR START ===');
    console.error('Request ID:', requestId);
    console.error('Error object:', JSON.stringify(error, null, 2));
    console.error('Error message:', error.message);
    console.error('Error type:', error.type);
    console.error('Error code:', error.code);
    console.error('Error statusCode:', error.statusCode);
    console.error('Error raw:', error.raw);
    console.error('Error raw.message:', error.raw?.message);
    console.error('Error raw.param:', error.raw?.param);
    console.error('Error raw.type:', error.raw?.type);
    console.error('Error raw.code:', error.raw?.code);
    console.error('=== PAYMENT ERROR END ===');

    // Extract better error messages with more context
    let userMessage = 'Payment processing failed';
    let httpStatus = 500;

    if (error.type === 'StripeInvalidRequestError') {
      httpStatus = 400;
      if (error.raw?.param) {
        userMessage = `Invalid ${error.raw.param}: ${error.raw.message}`;
      } else if (error.message?.includes('No such')) {
        userMessage = 'The payment method or account information is no longer valid. Please update your payment details.';
      } else {
        userMessage = error.raw?.message || error.message || 'Invalid payment request';
      }
    } else if (error.code === 'resource_missing') {
      httpStatus = 404;
      userMessage = 'Payment method not found or expired. Please add a new payment method in your profile.';
    } else if (error.message?.includes('not connected') || error.message?.includes('Stripe account')) {
      httpStatus = 400;
      userMessage = 'Payment processing is not set up for this organization. Please contact your administrator.';
    } else if (error.message) {
      userMessage = error.message;
    }

    return Response.json({ 
      error: userMessage,
      type: error.type,
      code: error.code,
      details: error.raw?.message || error.message,
      param: error.raw?.param,
      requestId: requestId
    }, { 
      status: httpStatus
    });
  }
});