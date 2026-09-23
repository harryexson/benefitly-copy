import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import Stripe from 'npm:stripe@17.5.0';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'));
const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET');

Deno.serve(async (req) => {
  const signature = req.headers.get('stripe-signature');
  
  if (!signature) {
    return Response.json({ error: 'No signature found' }, { status: 400 });
  }

  try {
    const body = await req.text();
    
    // Verify webhook signature
    const event = await stripe.webhooks.constructEventAsync(
      body,
      signature,
      webhookSecret
    );

    const base44 = createClientFromRequest(req);

    // Handle different event types
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        
        if (session.mode === 'subscription') {
          const { association_account_id, tier_id, billing_cycle } = session.metadata;
          
          if (association_account_id) {
            // Calculate next billing date
            const nextBillingDate = new Date();
            if (billing_cycle === 'monthly') {
              nextBillingDate.setMonth(nextBillingDate.getMonth() + 1);
            } else {
              nextBillingDate.setFullYear(nextBillingDate.getFullYear() + 1);
            }

            // Update association account
            await base44.asServiceRole.entities.AssociationAccount.update(
              association_account_id,
              {
                subscription_tier_id: tier_id,
                billing_cycle: billing_cycle,
                account_status: 'active',
                next_billing_date: nextBillingDate.toISOString().split('T')[0],
                trial_end_date: null
              }
            );
          }
        }
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object;
        const { association_account_id } = subscription.metadata;
        
        if (association_account_id) {
          const status = subscription.status === 'active' ? 'active' 
            : subscription.status === 'past_due' ? 'suspended' 
            : 'cancelled';

          await base44.asServiceRole.entities.AssociationAccount.update(
            association_account_id,
            { account_status: status }
          );
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object;
        const { association_account_id } = subscription.metadata;
        
        if (association_account_id) {
          await base44.asServiceRole.entities.AssociationAccount.update(
            association_account_id,
            { 
              account_status: 'cancelled',
              suspension_reason: 'Subscription cancelled'
            }
          );
        }
        break;
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object;
        const subscription = await stripe.subscriptions.retrieve(invoice.subscription);
        const { association_account_id } = subscription.metadata;
        
        if (association_account_id) {
          // Calculate next billing date from period end
          const nextBillingDate = new Date(invoice.lines.data[0].period.end * 1000);
          
          await base44.asServiceRole.entities.AssociationAccount.update(
            association_account_id,
            {
              account_status: 'active',
              next_billing_date: nextBillingDate.toISOString().split('T')[0],
              suspension_reason: null,
              suspension_notes: null,
              suspended_at: null
            }
          );
        }
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object;
        const subscription = await stripe.subscriptions.retrieve(invoice.subscription);
        const { association_account_id } = subscription.metadata;
        
        if (association_account_id) {
          await base44.asServiceRole.entities.AssociationAccount.update(
            association_account_id,
            {
              account_status: 'suspended',
              suspension_reason: 'Payment failed',
              suspended_at: new Date().toISOString()
            }
          );
        }
        break;
      }
    }

    return Response.json({ received: true });

  } catch (error) {
    console.error('Webhook error:', error);
    return Response.json({ 
      error: error.message || 'Webhook processing failed' 
    }, { status: 400 });
  }
});