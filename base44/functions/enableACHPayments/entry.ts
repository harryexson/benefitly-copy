import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import Stripe from 'npm:stripe@17.5.0';

/**
 * Enable ACH payments on the association's Stripe Connect account.
 * 
 * This function requests the us_bank_account_ach_payments capability
 * which allows the connected account to accept ACH bank transfers.
 * 
 * ADMIN ONLY - Must be called by an administrator.
 */

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY"));

        // Authenticate admin user
        const user = await base44.auth.me();
        if (!user || user.association_role !== 'Administrator') {
            return Response.json({ error: 'Unauthorized - Admin access required' }, { status: 403 });
        }

        if (!user.association_account_id) {
            return Response.json({ error: 'No association account found' }, { status: 400 });
        }

        // Get association account
        const associationAccount = await base44.asServiceRole.entities.AssociationAccount.get(
            user.association_account_id
        );

        if (!associationAccount?.stripe_account_id) {
            return Response.json({ 
                error: 'Stripe account not connected. Please complete Stripe onboarding first.' 
            }, { status: 400 });
        }

        console.log('Checking ACH capability for account:', associationAccount.stripe_account_id);

        // Check current capabilities
        const account = await stripe.accounts.retrieve(associationAccount.stripe_account_id);
        
        const achStatus = account.capabilities?.us_bank_account_ach_payments;
        console.log('Current ACH capability status:', achStatus);

        if (achStatus === 'active') {
            return Response.json({ 
                success: true,
                message: 'ACH payments are already enabled',
                status: 'active'
            });
        }

        // Request ACH capability
        console.log('Requesting ACH capability...');
        const updatedAccount = await stripe.accounts.update(
            associationAccount.stripe_account_id,
            {
                capabilities: {
                    us_bank_account_ach_payments: { requested: true },
                },
            }
        );

        const newStatus = updatedAccount.capabilities?.us_bank_account_ach_payments;
        console.log('ACH capability request result:', newStatus);

        const statusMessages = {
            'active': 'ACH payments are now enabled and ready to use!',
            'pending': 'ACH payment capability is pending review. This typically takes 1-2 business days.',
            'inactive': 'ACH payment capability is currently inactive. Additional verification may be required.',
        };

        return Response.json({ 
            success: true,
            message: statusMessages[newStatus] || 'ACH capability requested',
            status: newStatus,
            details: 'You can check the status in your Stripe Dashboard or by calling this endpoint again.'
        });

    } catch (error) {
        console.error('ACH enablement error:', error);
        
        let errorMessage = error.message || 'Failed to enable ACH payments';
        
        if (error.code === 'account_invalid') {
            errorMessage = 'The Stripe account configuration is incomplete. Please complete Stripe onboarding first.';
        } else if (error.type === 'StripeInvalidRequestError') {
            errorMessage = error.message;
        }

        return Response.json({ 
            error: errorMessage,
            type: error.type,
            code: error.code,
            details: error.raw?.message || error.message
        }, { 
            status: error.statusCode || 500 
        });
    }
});