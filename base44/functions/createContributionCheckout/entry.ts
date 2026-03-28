import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import Stripe from 'npm:stripe@17.5.0';

/**
 * Creates a Stripe Checkout session for a member to pay their contribution.
 * 
 * IMPORTANT: This uses Stripe Connect - the payment goes directly to the 
 * association's connected Stripe account, NOT to the platform's account.
 * 
 * Fee handling:
 * - If "absorbed": Association pays fees, member pays contribution amount only
 * - If "passed_to_member": Member pays contribution + processing fees
 */

// Stripe fee structure: 2.9% + $0.30 per transaction
const STRIPE_PERCENTAGE_FEE = 0.029;
const STRIPE_FIXED_FEE_CENTS = 30;

function calculateProcessingFee(amountCents) {
    // Fee = 2.9% + $0.30
    return Math.round(amountCents * STRIPE_PERCENTAGE_FEE) + STRIPE_FIXED_FEE_CENTS;
}

function calculateAmountWithFee(baseAmountCents) {
    // To ensure the association receives the full base amount after Stripe takes fees,
    // we need to calculate: (amount + 30) / (1 - 0.029)
    return Math.ceil((baseAmountCents + STRIPE_FIXED_FEE_CENTS) / (1 - STRIPE_PERCENTAGE_FEE));
}

Deno.serve(async (req) => {
    const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    console.log(`[${requestId}] ===== CHECKOUT REQUEST START =====`);
    console.log(`[${requestId}] Request method:`, req.method);
    console.log(`[${requestId}] Request URL:`, req.url);
    
    try {
        const base44 = createClientFromRequest(req);
        const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY"), {
            apiVersion: '2024-12-18.acacia',
        });
        
        console.log(`[${requestId}] Stripe client initialized`);

        // Authenticate the user (member)
        const user = await base44.auth.me();
        if (!user) {
            console.log(`[${requestId}] ERROR: Unauthorized - no user found`);
            return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
        }
        console.log(`[${requestId}] User authenticated:`, user.email, 'Association:', user.association_account_id);

        const requestBody = await req.json();
        console.log(`[${requestId}] Request body:`, JSON.stringify(requestBody));
        const { contribution_id } = requestBody;
        console.log(`[${requestId}] Request params:`, { contribution_id, user_email: user.email });

        if (!contribution_id) {
            console.log(`[${requestId}] ERROR: Missing contribution_id`);
            return new Response(JSON.stringify({ error: 'Missing contribution_id' }), { status: 400 });
        }

        // Get contribution details
        const contribution = await base44.asServiceRole.entities.EventContribution.get(contribution_id);
        if (!contribution) {
            console.log(`[${requestId}] ERROR: Contribution not found`);
            return new Response(JSON.stringify({ error: 'Contribution not found' }), { status: 404 });
        }
        console.log(`[${requestId}] Contribution:`, { id: contribution.id, amount_due: contribution.amount_due });

        // Get member details
        const member = await base44.asServiceRole.entities.Member.get(contribution.member_id);
        if (!member) {
            console.log(`[${requestId}] ERROR: Member not found`);
            return new Response(JSON.stringify({ error: 'Member not found' }), { status: 404 });
        }
        console.log(`[${requestId}] Member:`, { id: member.id, email: member.email, stripe_customer_id: member.stripe_customer_id || 'NONE' });

        // Get event details
        const event = await base44.asServiceRole.entities.Event.get(contribution.event_id);
        if (!event) {
            console.log(`[${requestId}] ERROR: Event not found`);
            return new Response(JSON.stringify({ error: 'Event not found' }), { status: 404 });
        }
        console.log(`[${requestId}] Event:`, { id: event.id, title: event.title });

        // Get association's Stripe account
        if (!user.association_account_id) {
            console.log(`[${requestId}] ERROR: No association account`);
            return new Response(JSON.stringify({ 
                error: 'User is not associated with any association account' 
            }), { status: 400 });
        }

        const associationAccount = await base44.asServiceRole.entities.AssociationAccount.get(user.association_account_id);
        if (!associationAccount) {
            console.log(`[${requestId}] ERROR: Association not found`);
            return new Response(JSON.stringify({ 
                error: 'Association account not found' 
            }), { status: 404 });
        }
        console.log(`[${requestId}] Association:`, { 
            id: associationAccount.id, 
            stripe_account_id: associationAccount.stripe_account_id || 'NONE',
            charges_enabled: associationAccount.stripe_charges_enabled 
        });

        if (!associationAccount.stripe_account_id) {
            console.log(`[${requestId}] ERROR: No Stripe account connected for association ${associationAccount.id}`);
            return new Response(JSON.stringify({ 
                error: 'Payment processing is not set up. Your organization needs to connect their Stripe account in Settings.',
                details: 'Contact your administrator to complete Stripe setup.',
                troubleshooting: 'Admin: Go to Settings > Stripe Account to connect.'
            }), { 
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        if (!associationAccount.stripe_charges_enabled) {
            console.log(`[${requestId}] ERROR: Charges not enabled for Stripe account ${associationAccount.stripe_account_id}`);
            return new Response(JSON.stringify({ 
                error: 'Payment processing is being verified. Your organization\'s Stripe account is not yet activated.',
                details: 'This usually takes 1-2 business days. Please try again later or contact your administrator.',
                troubleshooting: 'Admin: Complete Stripe verification or contact Stripe support.'
            }), { 
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // Get fee handling setting (default to absorbed if not set)
        const feeHandling = associationAccount.processing_fee_handling || 'absorbed';
        
        // Calculate amounts
        const baseContributionCents = Math.round(contribution.amount_due * 100);
        let chargeAmountCents;
        let processingFeeCents;
        let lineItemDescription;

        if (feeHandling === 'passed_to_member') {
            // Member pays base amount + processing fee
            chargeAmountCents = calculateAmountWithFee(baseContributionCents);
            processingFeeCents = chargeAmountCents - baseContributionCents;
            lineItemDescription = `Contribution for ${event.title} (includes $${(processingFeeCents / 100).toFixed(2)} processing fee)`;
        } else {
            // Association absorbs fees - member pays base amount only
            chargeAmountCents = baseContributionCents;
            processingFeeCents = calculateProcessingFee(baseContributionCents);
            lineItemDescription = `Contribution for ${event.title}`;
        }

        // Get the origin from request headers for proper redirect URLs
        const origin = req.headers.get('origin') || req.headers.get('referer')?.split('/').slice(0, 3).join('/');
        const successUrl = `${origin}/MemberPortal?payment_success=true&contribution_id=${contribution_id}`;
        const cancelUrl = `${origin}/MemberPortal?payment_cancelled=true`;
        
        console.log(`[${requestId}] Redirect URLs:`, { origin, successUrl, cancelUrl });

        // Build line items
        const lineItems = [{
            price_data: {
                currency: 'usd',
                product_data: {
                    name: event.title,
                    description: lineItemDescription,
                },
                unit_amount: chargeAmountCents,
            },
            quantity: 1,
        }];

        // Check if ACH is available on the connected account
        let availablePaymentMethods = ['card'];
        try {
            const account = await stripe.accounts.retrieve(associationAccount.stripe_account_id);
            console.log(`[${requestId}] Account capabilities:`, account.capabilities);
            
            // Check if ACH is enabled
            if (account.capabilities?.us_bank_account_ach_payments === 'active') {
                availablePaymentMethods.push('us_bank_account');
                console.log(`[${requestId}] ACH payments enabled on account`);
            } else {
                console.log(`[${requestId}] WARNING: ACH not enabled. Capability status:`, account.capabilities?.us_bank_account_ach_payments || 'not_requested');
            }
        } catch (capError) {
            console.error(`[${requestId}] Failed to check account capabilities:`, capError.message);
            // Continue with just card payments
        }

        const sessionConfig = {
            payment_method_types: availablePaymentMethods,
            line_items: lineItems,
            mode: 'payment',
            success_url: successUrl,
            cancel_url: cancelUrl,
            metadata: {
                contribution_id: contribution_id,
                member_id: member.id,
                event_id: event.id,
                association_account_id: user.association_account_id,
                fee_handling: feeHandling,
                base_amount_cents: baseContributionCents.toString(),
                processing_fee_cents: processingFeeCents.toString(),
            },
        };

        // Only add ACH-specific options if ACH is available
        if (availablePaymentMethods.includes('us_bank_account')) {
            sessionConfig.payment_method_options = {
                us_bank_account: {
                    financial_connections: {
                        permissions: ['payment_method'],
                    },
                    verification_method: 'instant',
                },
            };
        }

        // Use existing customer on connected account if available, otherwise let Stripe create one
        if (member.stripe_customer_id) {
            // Verify customer exists on connected account
            try {
                await stripe.customers.retrieve(member.stripe_customer_id, {
                    stripeAccount: associationAccount.stripe_account_id
                });
                sessionConfig.customer = member.stripe_customer_id;
                console.log(`[${requestId}] Using existing customer:`, member.stripe_customer_id);
            } catch (custError) {
                console.log(`[${requestId}] Customer not found on connected account, using email instead`);
                sessionConfig.customer_email = member.email;
            }
        } else {
            sessionConfig.customer_email = member.email;
            console.log(`[${requestId}] Using customer email:`, member.email);
        }

        console.log(`[${requestId}] Creating checkout session with config:`, {
            mode: sessionConfig.mode,
            payment_method_types: sessionConfig.payment_method_types,
            amount: chargeAmountCents,
            customer: sessionConfig.customer || 'none',
            customer_email: sessionConfig.customer_email || 'none',
            connected_account: associationAccount.stripe_account_id
        });
        
        const session = await stripe.checkout.sessions.create(sessionConfig, {
            stripeAccount: associationAccount.stripe_account_id,
        });
        
        console.log(`[${requestId}] SUCCESS: Session created:`, session.id);

        return new Response(JSON.stringify({ 
            checkoutUrl: session.url,
            session_id: session.id,
            base_amount: (baseContributionCents / 100).toFixed(2),
            processing_fee: (processingFeeCents / 100).toFixed(2),
            total_charge: (chargeAmountCents / 100).toFixed(2),
            fee_handling: feeHandling,
        }), {
            headers: { 'Content-Type': 'application/json' },
            status: 200,
        });

    } catch (error) {
        console.error(`[${requestId}] === CHECKOUT ERROR START ===`);
        console.error(`[${requestId}] Error type:`, error.type);
        console.error(`[${requestId}] Error code:`, error.code);
        console.error(`[${requestId}] Error message:`, error.message);
        console.error(`[${requestId}] Error statusCode:`, error.statusCode);
        console.error(`[${requestId}] Error stack:`, error.stack);
        if (error.raw) {
            console.error(`[${requestId}] Stripe raw error:`, JSON.stringify(error.raw, null, 2));
        }
        console.error(`[${requestId}] Full error object:`, JSON.stringify(error, Object.getOwnPropertyNames(error), 2));
        console.error(`[${requestId}] === CHECKOUT ERROR END ===`);
        
        // Provide user-friendly error messages based on error type
        let userMessage = error.message || 'Payment processing failed';
        
        if (error.type === 'StripeInvalidRequestError') {
            if (error.raw?.param) {
                userMessage = `Invalid ${error.raw.param}: ${error.raw.message}`;
            } else {
                userMessage = error.raw?.message || error.message;
            }
        } else if (error.code === 'account_invalid') {
            userMessage = 'The association\'s payment account is not properly configured. Please contact an administrator.';
        } else if (error.code === 'amount_too_small') {
            userMessage = 'The contribution amount is too small to process.';
        }
        
        let httpStatus = 500;
        if (error.type === 'StripeInvalidRequestError') {
          httpStatus = 400;
        } else if (error.statusCode) {
          httpStatus = error.statusCode;
        }
        
        return new Response(JSON.stringify({ 
            error: userMessage,
            type: error.type,
            code: error.code,
            details: error.raw?.message || error.message,
            debug: {
                param: error.raw?.param,
                doc_url: error.raw?.doc_url
            }
        }), { 
            status: httpStatus,
            headers: { 'Content-Type': 'application/json' }
        });
    }
});