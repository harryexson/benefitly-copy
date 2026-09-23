import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import Stripe from 'npm:stripe@14.18.0';

/**
 * Bulk process multiple approved payouts at once.
 * This invokes processPayoutToMember for each payout sequentially.
 */

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);

        // Authenticate - must be admin
        const user = await base44.auth.me();
        if (!user || user.association_role !== 'Administrator') {
            return Response.json({ error: 'Unauthorized - Admin access required' }, { status: 401 });
        }

        const { payout_ids, payout_method = 'standard' } = await req.json();

        if (!payout_ids || !Array.isArray(payout_ids) || payout_ids.length === 0) {
            return Response.json({ 
                error: 'Missing or invalid payout_ids array' 
            }, { status: 400 });
        }

        // Verify all payouts exist and are approved
        const payouts = await Promise.all(
            payout_ids.map(id => base44.asServiceRole.entities.Payout.get(id))
        );

        const notFound = payouts.filter(p => !p);
        if (notFound.length > 0) {
            return Response.json({ 
                error: 'Some payout IDs were not found' 
            }, { status: 404 });
        }

        const notApproved = payouts.filter(p => p.status !== 'Approved');
        if (notApproved.length > 0) {
            return Response.json({ 
                error: `${notApproved.length} payout(s) are not in Approved status` 
            }, { status: 400 });
        }

        // Get association and Stripe setup
        const associationAccount = await base44.asServiceRole.entities.AssociationAccount.get(user.association_account_id);
        if (!associationAccount?.stripe_account_id) {
            return Response.json({ 
                error: 'Stripe account not connected. Please complete setup in Settings.' 
            }, { status: 400 });
        }

        const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY"));

        // Process each payout
        const results = [];
        let successCount = 0;
        let failCount = 0;

        for (const payout of payouts) {
            try {
                // Get member details
                const member = await base44.asServiceRole.entities.Member.get(payout.payee_member_id);
                if (!member) {
                    throw new Error('Member not found');
                }

                if (!member.stripe_bank_account_id) {
                    throw new Error(`Member ${member.first_name} ${member.last_name} has no bank account set up`);
                }

                // Use payout's configured speed, or fall back to request parameter
                const payoutSpeed = payout.payout_speed || payout_method || 'standard';

                // Re-tokenize bank account
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
                    stripeAccount: associationAccount.stripe_account_id,
                });

                // Create payout
                const stripePayout = await stripe.payouts.create({
                    amount: Math.round(payout.amount * 100),
                    currency: 'usd',
                    destination: bankAccountToken.bank_account.id,
                    method: payoutSpeed === 'instant' ? 'instant' : 'standard',
                    metadata: {
                        payout_id: payout.id,
                        member_id: member.id,
                        member_name: `${member.first_name} ${member.last_name}`,
                        payout_speed: payoutSpeed,
                    }
                }, {
                    stripeAccount: associationAccount.stripe_account_id,
                });

                // Update payout status
                await base44.asServiceRole.entities.Payout.update(payout.id, {
                    status: 'Disbursed',
                    stripe_payout_id: stripePayout.id,
                    paid_at: new Date().toISOString(),
                    estimated_arrival: new Date(stripePayout.arrival_date * 1000).toISOString(),
                });

                successCount++;
                results.push({
                    payout_id: payout.id,
                    status: 'success',
                    message: `Payout of $${payout.amount.toFixed(2)} sent to ${member.first_name} ${member.last_name}`,
                    stripe_payout_id: stripePayout.id,
                });

            } catch (error) {
                console.error(`Failed to process payout ${payout.id}:`, error);
                
                // Update payout with failure details
                await base44.asServiceRole.entities.Payout.update(payout.id, {
                    status: 'Failed',
                    failure_reason: error.message,
                    stripe_error_code: error.code,
                    stripe_error_message: error.message,
                });

                failCount++;
                results.push({
                    payout_id: payout.id,
                    status: 'failed',
                    error: error.message || 'Processing failed',
                });
            }
        }

        return Response.json({
            success: failCount === 0,
            total: payout_ids.length,
            successful: successCount,
            failed: failCount,
            results: results,
            message: `Processed ${successCount} of ${payout_ids.length} payout(s) successfully`,
        });

    } catch (error) {
        console.error('Error in bulk payout processing:', error);
        return Response.json({ 
            error: error.message || 'Failed to process bulk payouts' 
        }, { status: 500 });
    }
});