import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';
import Stripe from 'npm:stripe@15.8.0';

const endpointSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");

Deno.serve(async (req) => {
    const base44 = createClientFromRequest(req);
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY"));
    
    const signature = req.headers.get('stripe-signature');
    const body = await req.text();

    let event;

    try {
        event = await stripe.webhooks.constructEventAsync(body, signature, endpointSecret);
    } catch (err) {
        console.error(`Webhook signature verification failed.`, err.message);
        return new Response(err.message, { status: 400 });
    }

    // Handle the event
    switch (event.type) {
        case 'account.updated': {
            const account = event.data.object;
            const stripeAccountId = account.id;
            
            const associations = await base44.asServiceRole.entities.AssociationAccount.filter({ 
                stripe_account_id: stripeAccountId 
            });
            
            if (associations.length > 0) {
                const association = associations[0];
                
                await base44.asServiceRole.entities.AssociationAccount.update(association.id, {
                    stripe_charges_enabled: account.charges_enabled,
                    stripe_payouts_enabled: account.payouts_enabled,
                });
                console.log(`Updated Stripe status for association: ${association.id}`);
            }
            break;
        }
            
        case 'payment_intent.succeeded': {
            const paymentIntent = event.data.object;
            const contributionId = paymentIntent.metadata.contribution_id;
            
            if (contributionId) {
                const amountPaid = paymentIntent.amount / 100;
                
                // Update contribution status to Paid
                await base44.asServiceRole.entities.EventContribution.update(contributionId, {
                    status: 'Paid',
                    amount_paid: amountPaid,
                    paid_at: new Date().toISOString(),
                });
                
                console.log(`Contribution ${contributionId} marked as paid`);
                
                // Update member records
                const memberId = paymentIntent.metadata.member_id;
                if (memberId) {
                    const member = await base44.asServiceRole.entities.Member.get(memberId);
                    if (member) {
                        // Update member's financial tracking
                        await base44.asServiceRole.entities.Member.update(memberId, {
                            total_contributions_paid: (member.total_contributions_paid || 0) + amountPaid,
                            last_activity_date: new Date().toISOString(),
                            engagement_score: (member.engagement_score || 0) + 10,
                        });
                    }
                    
                    // Log member activity
                    await base44.asServiceRole.entities.MemberActivity.create({
                        member_id: memberId,
                        activity_type: 'Payment Made',
                        activity_description: `Paid contribution of $${amountPaid.toFixed(2)}`,
                        related_entity_id: contributionId,
                        related_entity_type: 'EventContribution',
                    });
                }
            }
            break;
        }

        case 'payment_intent.payment_failed': {
            const paymentIntent = event.data.object;
            const contributionId = paymentIntent.metadata.contribution_id;
            
            if (contributionId) {
                console.error(`Payment failed for contribution ${contributionId}`);
                // Optionally send notification to member
            }
            break;
        }

        case 'checkout.session.completed': {
            const session = event.data.object;
            const contributionId = session.metadata.contribution_id;
            const memberId = session.metadata.member_id;
            
            console.log('Checkout session completed:', {
                contributionId,
                memberId,
                customer: session.customer,
                payment_status: session.payment_status,
                amount_total: session.amount_total
            });
            
            if (contributionId && session.payment_status === 'paid') {
                const amountPaid = session.amount_total / 100;
                
                // Mark contribution as paid with actual amount
                await base44.asServiceRole.entities.EventContribution.update(contributionId, {
                    status: 'Paid',
                    amount_paid: amountPaid,
                    paid_at: new Date().toISOString(),
                });
                
                console.log(`Checkout completed for contribution ${contributionId}, amount: $${amountPaid}`);
                
                // Update member records
                if (memberId) {
                    const member = await base44.asServiceRole.entities.Member.get(memberId);
                    if (member) {
                        // Update member's financial tracking
                        await base44.asServiceRole.entities.Member.update(memberId, {
                            total_contributions_paid: (member.total_contributions_paid || 0) + amountPaid,
                            last_activity_date: new Date().toISOString(),
                            engagement_score: (member.engagement_score || 0) + 10, // +10 points for payment
                        });
                    }
                    
                    // Log member activity
                    await base44.asServiceRole.entities.MemberActivity.create({
                        member_id: memberId,
                        activity_type: 'Payment Made',
                        activity_description: `Paid contribution of $${amountPaid.toFixed(2)}`,
                        related_entity_id: contributionId,
                        related_entity_type: 'EventContribution',
                    });
                }
            }
            
            // Save customer ID and payment method for future use
            if (memberId && session.customer) {
                const updateData = {
                    stripe_customer_id: session.customer
                };
                
                // Get payment method details if available
                if (session.payment_intent) {
                    try {
                        // Determine which account to query based on event
                        const accountId = event.account;
                        const paymentIntent = await stripe.paymentIntents.retrieve(
                            session.payment_intent,
                            accountId ? { stripeAccount: accountId } : {}
                        );
                        
                        if (paymentIntent.payment_method) {
                            const paymentMethod = await stripe.paymentMethods.retrieve(
                                paymentIntent.payment_method,
                                accountId ? { stripeAccount: accountId } : {}
                            );
                            
                            if (paymentMethod.type === 'card') {
                                updateData.stripe_payment_method_id = paymentMethod.id;
                                updateData.saved_card_last4 = paymentMethod.card.last4;
                                updateData.saved_card_brand = paymentMethod.card.brand;
                                updateData.preferred_payment_method = 'card';
                            } else if (paymentMethod.type === 'us_bank_account') {
                                updateData.stripe_bank_account_id = paymentMethod.id;
                                updateData.bank_account_last4 = paymentMethod.us_bank_account.last4;
                                updateData.bank_name = paymentMethod.us_bank_account.bank_name;
                                updateData.preferred_payment_method = 'bank_account';
                            }
                        }
                    } catch (pmError) {
                        console.error('Error retrieving payment method:', pmError.message);
                    }
                }
                
                await base44.asServiceRole.entities.Member.update(memberId, updateData);
                console.log(`Updated member ${memberId} with Stripe customer/payment details`);
            }
            break;
        }

        case 'payout.paid': {
            // Handle successful payouts to members
            const payout = event.data.object;
            const payoutId = payout.metadata?.payout_id;

            if (payoutId) {
                await base44.asServiceRole.entities.Payout.update(payoutId, {
                    status: 'Disbursed',
                    paid_at: new Date().toISOString(),
                    stripe_payout_id: payout.id,
                    estimated_arrival: payout.arrival_date ? new Date(payout.arrival_date * 1000).toISOString().split('T')[0] : null,
                });

                console.log(`Payout ${payoutId} disbursed successfully`);
            }
            break;
        }

        case 'payout.failed': {
            const payout = event.data.object;
            const payoutId = payout.metadata?.payout_id;

            if (payoutId) {
                await base44.asServiceRole.entities.Payout.update(payoutId, {
                    status: 'Failed',
                    failure_reason: payout.failure_message || 'Payout failed',
                    stripe_error_code: payout.failure_code || 'payout_failed',
                    stripe_error_message: payout.failure_message || 'Payout failed',
                });

                console.error(`Payout ${payoutId} failed: ${payout.failure_message}`);
            }
            break;
        }

        case 'payout.canceled': {
            const payout = event.data.object;
            const payoutId = payout.metadata?.payout_id;

            if (payoutId) {
                await base44.asServiceRole.entities.Payout.update(payoutId, {
                    status: 'Failed',
                    failure_reason: 'Payout was canceled',
                });

                console.log(`Payout ${payoutId} was canceled`);
            }
            break;
        }

        case 'customer.subscription.created':
        case 'customer.subscription.updated': {
            const subscription = event.data.object;
            const memberId = subscription.metadata?.member_id;
            
            if (memberId) {
                await base44.asServiceRole.entities.Member.update(memberId, {
                    stripe_subscription_id: subscription.id,
                    recurring_contribution_enabled: subscription.status === 'active'
                });
                
                console.log(`Subscription ${subscription.id} updated for member ${memberId}`);
            }
            break;
        }

        case 'customer.subscription.deleted': {
            const subscription = event.data.object;
            const memberId = subscription.metadata?.member_id;
            
            if (memberId) {
                await base44.asServiceRole.entities.Member.update(memberId, {
                    stripe_subscription_id: null,
                    recurring_contribution_enabled: false
                });
                
                console.log(`Subscription cancelled for member ${memberId}`);
            }
            break;
        }

        case 'invoice.payment_succeeded': {
            const invoice = event.data.object;
            const memberId = invoice.subscription_details?.metadata?.member_id;
            
            if (memberId && invoice.subscription) {
                // Log recurring payment
                await base44.asServiceRole.entities.MemberActivity.create({
                    member_id: memberId,
                    activity_type: 'Recurring Payment',
                    activity_description: `Recurring contribution of $${(invoice.amount_paid / 100).toFixed(2)}`,
                    related_entity_type: 'Subscription'
                });
                
                // Update member's total contributions
                const member = await base44.asServiceRole.entities.Member.get(memberId);
                if (member) {
                    await base44.asServiceRole.entities.Member.update(memberId, {
                        total_contributions_paid: (member.total_contributions_paid || 0) + (invoice.amount_paid / 100)
                    });
                }
                
                console.log(`Recurring payment processed for member ${memberId}`);
            }
            break;
        }

        case 'invoice.payment_failed': {
            const invoice = event.data.object;
            const memberId = invoice.subscription_details?.metadata?.member_id;
            
            if (memberId) {
                console.error(`Recurring payment failed for member ${memberId}`);
                // Could send notification here
            }
            break;
        }

        default:
            console.log(`Unhandled event type ${event.type}`);
    }

    return new Response(JSON.stringify({ received: true }), { status: 200 });
});