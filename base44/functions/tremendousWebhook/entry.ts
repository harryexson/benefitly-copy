import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * Handles webhooks from Tremendous for payout status updates.
 * Events: order.executed, reward.delivered, reward.canceled, order.refunded
 */

const webhookSecret = Deno.env.get('TREMENDOUS_WEBHOOK_SECRET');

Deno.serve(async (req) => {
    const base44 = createClientFromRequest(req);

    try {
        // Verify webhook signature
        const signature = req.headers.get('X-Tremendous-Signature');
        const body = await req.text();

        // TODO: Implement signature verification based on Tremendous docs
        // For now, we'll trust the webhook if signature exists
        if (!signature && webhookSecret) {
            console.error('Missing webhook signature');
            return new Response('Unauthorized', { status: 401 });
        }

        const event = JSON.parse(body);
        console.log('Tremendous webhook received:', event.type);

        switch (event.type) {
            case 'order.EXECUTED': {
                const order = event.data.order;
                const externalId = order.external_id;

                if (externalId) {
                    await base44.asServiceRole.entities.Payout.update(externalId, {
                        status: 'Disbursed',
                        tremendous_status: 'EXECUTED',
                        paid_at: new Date().toISOString()
                    });
                    console.log(`Payout ${externalId} marked as executed`);
                }
                break;
            }

            case 'reward.DELIVERED': {
                const reward = event.data.reward;
                const orderId = reward.order_id;

                // Find payout by tremendous_order_id
                const payouts = await base44.asServiceRole.entities.Payout.filter({
                    tremendous_order_id: orderId
                });

                if (payouts.length > 0) {
                    const payout = payouts[0];
                    await base44.asServiceRole.entities.Payout.update(payout.id, {
                        tremendous_delivered_at: new Date().toISOString(),
                        tremendous_status: 'EXECUTED'
                    });
                    console.log(`Reward delivered for payout ${payout.id}`);
                }
                break;
            }

            case 'reward.CANCELED': {
                const reward = event.data.reward;
                const orderId = reward.order_id;

                const payouts = await base44.asServiceRole.entities.Payout.filter({
                    tremendous_order_id: orderId
                });

                if (payouts.length > 0) {
                    const payout = payouts[0];
                    await base44.asServiceRole.entities.Payout.update(payout.id, {
                        status: 'Failed',
                        tremendous_status: 'CANCELED',
                        failure_reason: 'Reward was canceled'
                    });
                    console.log(`Reward canceled for payout ${payout.id}`);
                }
                break;
            }

            case 'order.REFUNDED': {
                const order = event.data.order;
                const externalId = order.external_id;

                if (externalId) {
                    await base44.asServiceRole.entities.Payout.update(externalId, {
                        status: 'Refunded',
                        tremendous_status: 'REFUNDED',
                        failure_reason: 'Order was refunded'
                    });
                    console.log(`Payout ${externalId} refunded`);
                }
                break;
            }

            default:
                console.log(`Unhandled Tremendous event: ${event.type}`);
        }

        return new Response(JSON.stringify({ received: true }), { status: 200 });

    } catch (error) {
        console.error('Webhook processing error:', error);
        return new Response(JSON.stringify({ error: error.message }), { status: 500 });
    }
});