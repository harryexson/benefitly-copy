import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * Process payout using Tremendous API.
 * Supports multiple delivery methods and payment options.
 */

async function notifyMemberOfSuccess(base44, member, payout, deliveryMethod) {
    try {
        await base44.asServiceRole.integrations.Core.SendEmail({
            from_name: 'Benefitly',
            to: member.email,
            subject: `✅ Your Benefit Payout of $${payout.amount.toFixed(2)} is Ready`,
            body: `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
    <h2 style="color: #059669;">Good news, ${member.first_name}!</h2>
    <p>Your benefit payout has been processed and is ready to claim.</p>
    <div style="text-align: center; background: #ECFDF5; border: 1px solid #6EE7B7; border-radius: 8px; padding: 20px; margin: 20px 0;">
        <p style="margin: 0; color: #065F46; font-size: 14px;">Amount</p>
        <p style="margin: 10px 0; color: #047857; font-size: 32px; font-weight: bold;">$${payout.amount.toFixed(2)}</p>
    </div>
    <div style="background: #F3F4F6; border-radius: 8px; padding: 16px; margin: 20px 0;">
        <p style="margin: 0; color: #6B7280;">Delivery Method: <strong>${deliveryMethod}</strong></p>
        <p style="margin: 8px 0 0 0; color: #6B7280;">Check your email for instructions to claim your reward.</p>
    </div>
    <p>Questions? Contact your association administrator.</p>
</div>`
        });
    } catch (e) {
        console.error('Failed to send success notification:', e);
    }
}

async function notifyMemberOfFailure(base44, member, payout, errorMessage) {
    try {
        await base44.asServiceRole.integrations.Core.SendEmail({
            from_name: 'Benefitly',
            to: member.email,
            subject: `Important: Issue with Your Benefit Payout`,
            body: `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
    <h2>Hello ${member.first_name},</h2>
    <p>We encountered an issue processing your payout of <strong>$${payout.amount.toFixed(2)}</strong>.</p>
    <p>Our administrators have been notified and will resolve this shortly.</p>
</div>`
        });
    } catch (e) {
        console.error('Failed to notify member:', e);
    }
}

Deno.serve(async (req) => {
    let payout = null;
    let member = null;
    let associationAccountId = null;

    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user || user.association_role !== 'Administrator') {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }
        associationAccountId = user.association_account_id;

        const body = await req.json();
        const { payout_id, payment_method = 'ACH', delivery_method = 'EMAIL' } = body;

        if (!payout_id) {
            return Response.json({ error: 'Missing payout_id' }, { status: 400 });
        }

        payout = await base44.asServiceRole.entities.Payout.get(payout_id);
        if (!payout) {
            return Response.json({ error: 'Payout not found' }, { status: 404 });
        }

        if (payout.status !== 'Approved') {
            return Response.json({ error: 'Payout must be approved first' }, { status: 400 });
        }

        // Idempotency check
        if (payout.status === 'Disbursed' && payout.tremendous_order_id) {
            return Response.json({
                success: true,
                message: 'Payout already processed',
                tremendous_order_id: payout.tremendous_order_id,
                already_processed: true
            });
        }

        member = await base44.asServiceRole.entities.Member.get(payout.payee_member_id);
        if (!member) {
            return Response.json({ error: 'Member not found' }, { status: 404 });
        }

        const associationAccount = await base44.asServiceRole.entities.AssociationAccount.get(associationAccountId);
        if (!associationAccount?.tremendous_connected) {
            return Response.json({ error: 'Tremendous not connected for this association' }, { status: 400 });
        }

        // Calculate platform fees
        const fixedFee = associationAccount.tremendous_transaction_fee || 0.75;
        const percentageFee = associationAccount.tremendous_percentage_fee || 0;
        const percentageFeeAmount = (payout.amount * percentageFee) / 100;
        const totalPlatformFee = fixedFee + percentageFeeAmount;
        const netAmount = payout.amount - totalPlatformFee;

        console.log('=== Tremendous Payout Processing ===');
        console.log('Amount:', payout.amount);
        console.log('Platform Fee:', totalPlatformFee);
        console.log('Net to Member:', netAmount);

        // Mark as processing
        await base44.asServiceRole.entities.Payout.update(payout_id, {
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
                external_id: payout_id,
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
            const errorData = await tremendousResponse.json();
            throw new Error(errorData.message || 'Tremendous API request failed');
        }

        const orderData = await tremendousResponse.json();
        const order = orderData.order;
        const reward = order.rewards[0];

        // Update payout with Tremendous details
        await base44.asServiceRole.entities.Payout.update(payout_id, {
            status: 'Disbursed',
            paid_at: new Date().toISOString(),
            tremendous_order_id: order.id,
            tremendous_reward_id: reward.id,
            tremendous_delivery_method: delivery_method,
            tremendous_payment_method: payment_method,
            tremendous_status: 'EXECUTED',
            tremendous_recipient_name: `${member.first_name} ${member.last_name}`,
            tremendous_recipient_email: member.email,
            platform_fee: totalPlatformFee,
            platform_fee_percentage: percentageFee,
            net_amount: netAmount,
            notification_sent: true
        });

        // Update association metrics
        await base44.asServiceRole.entities.AssociationAccount.update(associationAccountId, {
            total_tremendous_payouts: (associationAccount.total_tremendous_payouts || 0) + 1,
            total_tremendous_volume: (associationAccount.total_tremendous_volume || 0) + payout.amount,
            total_tremendous_fees_collected: (associationAccount.total_tremendous_fees_collected || 0) + totalPlatformFee
        });

        // Log member activity
        await base44.asServiceRole.entities.MemberActivity.create({
            member_id: member.id,
            activity_type: 'Payment Made',
            activity_description: `Received benefit payout of $${netAmount.toFixed(2)} via Tremendous`,
            related_entity_id: payout_id,
            related_entity_type: 'Payout'
        });

        await notifyMemberOfSuccess(base44, member, payout, payment_method);

        console.log('=== Payout Success ===');

        return Response.json({
            success: true,
            message: 'Payout processed successfully via Tremendous',
            tremendous_order_id: order.id,
            tremendous_reward_id: reward.id,
            amount: `$${payout.amount.toFixed(2)}`,
            platform_fee: `$${totalPlatformFee.toFixed(2)}`,
            net_to_member: `$${netAmount.toFixed(2)}`,
            recipient: `${member.first_name} ${member.last_name}`,
            notification_sent: true
        });

    } catch (error) {
        console.error('=== TREMENDOUS PAYOUT ERROR ===');
        console.error('Message:', error.message);
        console.error('Stack:', error.stack);

        const errorMessage = error.message || 'Failed to process payout';

        if (payout) {
            try {
                await base44.asServiceRole.entities.Payout.update(payout.id, {
                    status: 'Failed',
                    failure_reason: errorMessage,
                    last_retry_at: new Date().toISOString()
                });
            } catch (e) {
                console.error('Failed to update payout:', e);
            }
        }

        if (member && payout) {
            try {
                await notifyMemberOfFailure(base44, member, payout, errorMessage);
            } catch (notifyError) {
                console.error('Failed to send failure notification:', notifyError);
            }
        }

        return Response.json({
            error: errorMessage
        }, { status: 500 });
    }
});