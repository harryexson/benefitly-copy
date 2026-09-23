import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import Stripe from 'npm:stripe@14.18.0';

Deno.serve(async (req) => {
    try {
        // Initialize Base44 and Stripe clients
        const base44 = createClientFromRequest(req);
        const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY"));

        // Authenticate the user
        const user = await base44.auth.me();
        if (!user || !user.association_account_id) {
            return new Response(JSON.stringify({ error: 'Unauthorized or no association found' }), { status: 401 });
        }
        
        const { association_account_id } = user;

        // Get the association account from the database
        const accounts = await base44.asServiceRole.entities.AssociationAccount.filter({ id: association_account_id });
        if (!accounts || accounts.length === 0) {
            return new Response(JSON.stringify({ error: 'Association account not found' }), { status: 404 });
        }
        const associationAccount = accounts[0];

        let stripeAccountId = associationAccount.stripe_account_id;

        // Construct URLs - use the app slug for proper routing
        const origin = req.headers.get("origin") || req.headers.get("referer")?.split('/').slice(0, 3).join('/') || 'https://benefitly.base44.app';
        const isOnboarding = req.headers.get('referer')?.includes('OnboardingWizard') || 
                           req.headers.get('x-from-onboarding') === 'true';
        
        const returnUrl = isOnboarding 
            ? `${origin}/OnboardingWizard?stripe_success=true&step=2`
            : `${origin}/Settings?stripe_success=true`;
            
        const refreshUrl = isOnboarding
            ? `${origin}/OnboardingWizard?stripe_reauth=true&step=2`
            : `${origin}/Settings?stripe_reauth=true`;

        // Validate account ID format - must start with 'acct_' for Connect accounts
        const isValidAccountId = stripeAccountId && stripeAccountId.startsWith('acct_');
        
        // Step 1: Create Express account if none exists or if invalid
        if (!isValidAccountId) {
            const account = await stripe.accounts.create({
                type: 'express',
                country: 'US',
                email: associationAccount.contact_email || user.email,
                capabilities: {
                    card_payments: { requested: true },
                    transfers: { requested: true }
                },
                business_profile: {
                    name: associationAccount.organization_name,
                    url: origin,
                },
                metadata: {
                    base44_association_id: association_account_id,
                    organization_name: associationAccount.organization_name,
                }
            });
            
            stripeAccountId = account.id;

            // Save the Stripe Connect account ID
            await base44.asServiceRole.entities.AssociationAccount.update(association_account_id, {
                stripe_account_id: stripeAccountId,
                stripe_charges_enabled: false,
                stripe_payouts_enabled: false,
            });
        }

        // Check if already fully onboarded
        const account = await stripe.accounts.retrieve(stripeAccountId);
        
        // Update status flags based on current account state
        await base44.asServiceRole.entities.AssociationAccount.update(association_account_id, {
            stripe_charges_enabled: account.charges_enabled || false,
            stripe_payouts_enabled: account.payouts_enabled || false,
        });
        
        if (account.charges_enabled && account.payouts_enabled) {
            // Already onboarded - return dashboard link
            const loginLink = await stripe.accounts.createLoginLink(stripeAccountId);
            
            return new Response(JSON.stringify({ 
                url: loginLink.url,
                fully_onboarded: true,
                message: 'Stripe account is fully connected'
            }), {
                headers: { 'Content-Type': 'application/json' },
                status: 200,
            });
        }

        // Step 2: Create onboarding link for incomplete accounts
        const accountLink = await stripe.accountLinks.create({
            account: stripeAccountId,
            refresh_url: refreshUrl,
            return_url: returnUrl,
            type: 'account_onboarding'
        });

        return new Response(JSON.stringify({ 
            url: accountLink.url,
            fully_onboarded: false,
            message: 'Redirecting to Stripe onboarding'
        }), {
            headers: { 'Content-Type': 'application/json' },
            status: 200,
        });

    } catch (error) {
        console.error('Error initiating Stripe onboarding:', error);
        console.error('Full error details:', {
            name: error.name,
            message: error.message,
            stack: error.stack,
            type: error.type,
            statusCode: error.statusCode,
            raw: error.raw
        });
        
        // Check for Stripe Connect setup issues
        if (error.type === 'StripeInvalidRequestError') {
            // Platform profile or connect setup issue
            if (error.message?.includes('platform-profile') || error.message?.includes('managing losses')) {
                return new Response(JSON.stringify({ 
                    error: 'Stripe Platform Profile Required',
                    details: 'platform_profile_incomplete',
                    instructions: 'Please complete your Stripe Connect platform profile',
                    message: 'Before creating connected accounts, you need to complete your platform profile in Stripe. Visit https://dashboard.stripe.com/settings/connect/platform-profile to review and accept the terms.',
                    helpUrl: 'https://dashboard.stripe.com/settings/connect/platform-profile'
                }), { 
                    status: 400,
                    headers: { 'Content-Type': 'application/json' }
                });
            }
            
            // Connect not enabled
            if (error.message?.includes('signed up for Connect') || 
                error.message?.includes('not enabled') ||
                error.raw?.code === 'platform_api_key_expired' ||
                error.code === 'account_invalid') {
                return new Response(JSON.stringify({ 
                    error: 'Stripe Connect Required',
                    details: 'connect_not_enabled',
                    instructions: 'Please enable Stripe Connect in your Stripe Dashboard',
                    message: 'To accept payments on behalf of members, you need to enable Stripe Connect in your Stripe account. Visit https://dashboard.stripe.com/settings/connect and click "Get started".',
                    helpUrl: 'https://dashboard.stripe.com/settings/connect'
                }), { 
                    status: 400,
                    headers: { 'Content-Type': 'application/json' }
                });
            }
        }
        
        return new Response(JSON.stringify({ 
            error: error.message || 'Failed to initiate Stripe onboarding',
            details: error.type || 'unknown_error',
            fullError: error.raw?.message || error.message
        }), { 
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
});