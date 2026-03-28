import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * Process multiple approved payouts in bulk via Tremendous.
 * Optimized for batch operations with proper error handling.
 */

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user || user.association_role !== 'Administrator') {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json();
        const { payout_ids, payment_method = 'ACH', delivery_method = 'EMAIL' } = body;

        if (!payout_ids || !Array.isArray(payout_ids) || payout_ids.length === 0) {
            return Response.json({ error: 'payout_ids array required' }, { status: 400 });
        }

        const associationAccount = await base44.asServiceRole.entities.AssociationAccount.get(user.association_account_id);
        if (!associationAccount?.tremendous_connected) {
            return Response.json({ error: 'Tremendous not connected' }, { status: 400 });
        }

        // Fetch all payouts
        const payouts = await Promise.all(
            payout_ids.map(id => base44.asServiceRole.entities.Payout.get(id).catch(() => null))
        );

        const validPayouts = payouts.filter(p => p && p.status === 'Approved');

        if (validPayouts.length === 0) {
            return Response.json({ error: 'No approved payouts found' }, { status: 400 });
        }

        const results = {
            total: validPayouts.length,
            successful: 0,
            failed: 0,
            details: []
        };

        // Process payouts sequentially to avoid rate limits
        for (const payout of validPayouts) {
            try {
                const member = await base44.asServiceRole.entities.Member.get(payout.payee_member_id);
                
                // Calculate fees
                const fixedFee = associationAccount.tremendous_transaction_fee || 0.75;
                const percentageFee = associationAccount.tremendous_percentage_fee || 0;
                const percentageFeeAmount = (payout.amount * percentageFee) / 100;
                const totalPlatformFee = fixedFee + percentageFeeAmount;
                const netAmount = payout.amount - totalPlatformFee;

                // Mark as processing
                await base44.asServiceRole.entities.Payout.update(payout.id, {
                    status: 'Processing',
                    payout_provider: 'tremendous'
                });

                // Create Tremendous order
                const tremendousResponse = await fetch('https://app.tremendous.com/api/v2/orders', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${associationAccount.tremendous_access_token}`
                    },
                    body: JSON.stringify({
                        external_id: payout.id,
                        payment: {
                            funding_source_id: associationAccount.tremendous_organization_id
                        },
                        reward: {
                            value: {
                                denomination: netAmount,
                                currency_code: payout.currency || 'USD'
                            },
                            recipient: {
                                name: `${member.first_name} ${member.last_name}`,
                                email: member.email,
                                phone: member.phone
                            },
                            delivery: {
                                method: delivery_method
                            },
                            products: [payment_method]
                        }
                    })
                });

                if (!tremendousResponse.ok) {
                    throw new Error('Tremendous API request failed');
                }

                const orderData = await tremendousResponse.json();
                const order = orderData.order;
                const reward = order.rewards[0];

                // Update payout
                await base44.asServiceRole.entities.Payout.update(payout.id, {
                    status: 'Disbursed',
                    paid_at: new Date().toISOString(),
                    tremendous_order_id: order.id,
                    tremendous_reward_id: reward.id,
                    tremendous_delivery_method: delivery_method,
                    tremendous_payment_method: payment_method,
                    tremendous_status: 'EXECUTED',
                    platform_fee: totalPlatformFee,
                    net_amount: netAmount
                });

                results.successful++;
                results.details.push({
                    payout_id: payout.id,
                    status: 'success',
                    tremendous_order_id: order.id
                });

            } catch (error) {
                console.error(`Failed to process payout ${payout.id}:`, error);
                
                await base44.asServiceRole.entities.Payout.update(payout.id, {
                    status: 'Failed',
                    failure_reason: error.message
                });

                results.failed++;
                results.details.push({
                    payout_id: payout.id,
                    status: 'failed',
                    error: error.message
                });
            }
        }

        // Update association metrics
        if (results.successful > 0) {
            const totalVolume = validPayouts.reduce((sum, p) => sum + p.amount, 0);
            const totalFees = validPayouts.length * (associationAccount.tremendous_transaction_fee || 0.75);

            await base44.asServiceRole.entities.AssociationAccount.update(user.association_account_id, {
                total_tremendous_payouts: (associationAccount.total_tremendous_payouts || 0) + results.successful,
                total_tremendous_volume: (associationAccount.total_tremendous_volume || 0) + totalVolume,
                total_tremendous_fees_collected: (associationAccount.total_tremendous_fees_collected || 0) + totalFees
            });
        }

        return Response.json({
            success: results.failed === 0,
            message: `Processed ${results.successful} of ${results.total} payouts successfully`,
            ...results
        });

    } catch (error) {
        console.error('Bulk payout processing error:', error);
        return Response.json({
            error: error.message || 'Failed to process bulk payouts'
        }, { status: 500 });
    }
});