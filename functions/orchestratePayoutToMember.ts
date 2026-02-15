import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * Smart payout orchestrator - routes to Stripe or Tremendous based on association config.
 * Handles fallback logic and provider selection.
 */

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user || user.association_role !== 'Administrator') {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json();
        const { payout_id, payout_method, payment_method, delivery_method } = body;

        if (!payout_id) {
            return Response.json({ error: 'Missing payout_id' }, { status: 400 });
        }

        // Get payout and association details
        const [payout, associationAccount] = await Promise.all([
            base44.asServiceRole.entities.Payout.get(payout_id),
            base44.asServiceRole.entities.AssociationAccount.get(user.association_account_id)
        ]);

        if (!payout) {
            return Response.json({ error: 'Payout not found' }, { status: 404 });
        }

        // Determine which provider to use
        let provider = associationAccount.payout_provider || 'stripe';
        
        // If both providers available, prefer Tremendous for flexibility
        if (provider === 'both') {
            provider = 'tremendous';
        }

        console.log(`Routing payout ${payout_id} to provider: ${provider}`);

        // Route to appropriate provider
        if (provider === 'tremendous' && associationAccount.tremendous_connected) {
            const response = await base44.functions.invoke('processTremendousPayout', {
                payout_id,
                payment_method: payment_method || 'ACH',
                delivery_method: delivery_method || 'EMAIL'
            });
            return Response.json(response.data);
        } else if (provider === 'stripe' && associationAccount.stripe_payouts_enabled) {
            const response = await base44.functions.invoke('processPayoutToMember', {
                payout_id,
                payout_method: payout_method || 'standard'
            });
            return Response.json(response.data);
        } else {
            // Fallback: try available provider
            if (associationAccount.tremendous_connected) {
                console.log('Primary provider unavailable, falling back to Tremendous');
                const response = await base44.functions.invoke('processTremendousPayout', {
                    payout_id,
                    payment_method: payment_method || 'ACH',
                    delivery_method: delivery_method || 'EMAIL'
                });
                return Response.json(response.data);
            } else if (associationAccount.stripe_payouts_enabled) {
                console.log('Primary provider unavailable, falling back to Stripe');
                const response = await base44.functions.invoke('processPayoutToMember', {
                    payout_id,
                    payout_method: payout_method || 'standard'
                });
                return Response.json(response.data);
            } else {
                return Response.json({ 
                    error: 'No payout provider configured. Please connect Stripe or Tremendous in Settings.'
                }, { status: 400 });
            }
        }

    } catch (error) {
        console.error('Payout orchestration error:', error);
        return Response.json({ 
            error: error.message || 'Failed to process payout'
        }, { status: 500 });
    }
});