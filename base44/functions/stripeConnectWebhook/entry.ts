import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import Stripe from 'npm:stripe@14.18.0';

/**
 * Webhook handler for Stripe Connect events
 * Processes events related to connected accounts (association Stripe accounts)
 */
Deno.serve(async (req) => {
  try {
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY"));
    const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
    
    const signature = req.headers.get("stripe-signature");
    const body = await req.text();
    
    if (!signature || !webhookSecret) {
      return Response.json({ error: 'Missing signature or webhook secret' }, { status: 400 });
    }

    // Verify webhook signature
    let event;
    try {
      event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret);
    } catch (err) {
      console.error('Webhook signature verification failed:', err.message);
      return Response.json({ error: 'Invalid signature' }, { status: 400 });
    }

    // Initialize Base44 client with service role (webhooks don't have user auth)
    const base44 = createClientFromRequest(req);

    console.log('Processing Stripe Connect event:', event.type);

    // Handle different event types
    switch (event.type) {
      case 'account.updated': {
        // Update association account with Stripe account status
        const account = event.data.object;
        
        const associationAccounts = await base44.asServiceRole.entities.AssociationAccount.filter({
          stripe_account_id: account.id
        });

        if (associationAccounts.length > 0) {
          await base44.asServiceRole.entities.AssociationAccount.update(associationAccounts[0].id, {
            stripe_charges_enabled: account.charges_enabled,
            stripe_payouts_enabled: account.payouts_enabled
          });
        }
        break;
      }

      case 'account.external_account.created':
      case 'account.external_account.updated': {
        // External bank account added/updated
        const externalAccount = event.data.object;
        console.log('External account updated:', externalAccount.id);
        break;
      }

      case 'account.external_account.deleted': {
        // External bank account removed
        console.log('External account deleted');
        break;
      }

      case 'capability.updated': {
        // Account capability updated (e.g., card_payments, transfers)
        const capability = event.data.object;
        console.log('Capability updated:', capability.id, capability.status);
        break;
      }

      case 'payment_intent.succeeded': {
        // Payment successful for contribution
        const paymentIntent = event.data.object;
        
        if (paymentIntent.metadata?.contribution_id) {
          await base44.asServiceRole.entities.EventContribution.update(
            paymentIntent.metadata.contribution_id,
            {
              status: 'Paid',
              amount_paid: paymentIntent.amount / 100,
              paid_at: new Date().toISOString()
            }
          );

          // Log member activity
          if (paymentIntent.metadata?.member_id) {
            await base44.asServiceRole.entities.MemberActivity.create({
              member_id: paymentIntent.metadata.member_id,
              activity_type: 'contribution_paid',
              description: `Paid contribution of $${(paymentIntent.amount / 100).toFixed(2)}`,
              activity_date: new Date().toISOString()
            });
          }
        }
        break;
      }

      case 'payment_intent.payment_failed': {
        // Payment failed
        const paymentIntent = event.data.object;
        console.error('Payment failed:', paymentIntent.id, paymentIntent.last_payment_error?.message);
        break;
      }

      case 'checkout.session.completed': {
        // Checkout session completed
        const session = event.data.object;
        
        if (session.metadata?.contribution_id && session.payment_status === 'paid') {
          await base44.asServiceRole.entities.EventContribution.update(
            session.metadata.contribution_id,
            {
              status: 'Paid',
              amount_paid: session.amount_total / 100,
              paid_at: new Date().toISOString()
            }
          );
        }
        break;
      }

      case 'transfer.created': {
        // Transfer created (payout to member)
        const transfer = event.data.object;
        
        if (transfer.metadata?.payout_id) {
          await base44.asServiceRole.entities.Payout.update(
            transfer.metadata.payout_id,
            { stripe_transfer_id: transfer.id }
          );
        }
        break;
      }

      case 'payout.paid': {
        // Payout completed
        const payout = event.data.object;
        
        const payouts = await base44.asServiceRole.entities.Payout.filter({
          stripe_payout_id: payout.id
        });

        if (payouts.length > 0) {
          await base44.asServiceRole.entities.Payout.update(payouts[0].id, {
            status: 'Disbursed',
            paid_at: new Date().toISOString()
          });
        }
        break;
      }

      case 'payout.failed': {
        // Payout failed
        const payout = event.data.object;
        
        const payouts = await base44.asServiceRole.entities.Payout.filter({
          stripe_payout_id: payout.id
        });

        if (payouts.length > 0) {
          await base44.asServiceRole.entities.Payout.update(payouts[0].id, {
            status: 'Failed',
            failure_reason: payout.failure_message
          });
        }
        break;
      }

      case 'charge.refunded': {
        // Charge refunded
        const charge = event.data.object;
        console.log('Charge refunded:', charge.id);
        break;
      }

      case 'charge.dispute.created': {
        // Dispute created
        const dispute = event.data.object;
        console.log('Dispute created:', dispute.id);
        // TODO: Notify administrators
        break;
      }

      default:
        console.log('Unhandled event type:', event.type);
    }

    return Response.json({ received: true });

  } catch (error) {
    console.error('Stripe Connect webhook error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});