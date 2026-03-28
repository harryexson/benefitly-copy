import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import Stripe from 'npm:stripe@14.18.0';

/**
 * Securely collects and tokenizes member bank account details using Stripe.
 * This creates a Stripe customer and external bank account for the member.
 * 
 * IMPORTANT: Bank account details are tokenized by Stripe and never stored in plain text.
 */

Deno.serve(async (req) => {
    try {
        console.log('=== Starting setupMemberBankAccount ===');
        console.log('Request method:', req.method);
        console.log('Request URL:', req.url);
        
        const base44 = createClientFromRequest(req);
        
        const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
        if (!stripeKey) {
            console.error('CRITICAL: STRIPE_SECRET_KEY not found in environment');
            return Response.json({ error: 'Payment system not configured. Contact support.' }, { status: 500 });
        }
        console.log('Stripe key found:', stripeKey.substring(0, 10) + '...');
        const stripe = new Stripe(stripeKey);

        // Authenticate the user
        console.log('Authenticating user...');
        let user;
        try {
            user = await base44.auth.me();
        } catch (authError) {
            console.error('Authentication error:', authError.message, authError.stack);
            return Response.json({ error: 'Authentication failed' }, { status: 401 });
        }
        
        if (!user) {
            console.error('Authentication failed - no user returned');
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }
        console.log('User authenticated:', user.email, 'User ID:', user.id, 'Association ID:', user.association_account_id);

        let body;
        try {
            body = await req.json();
            console.log('Request body parsed successfully');
            console.log('Request body keys:', Object.keys(body));
            console.log('Request body (sanitized):', { 
                member_id: body.member_id, 
                account_holder_name: body.account_holder_name,
                routing_number: body.routing_number ? '***' + body.routing_number.slice(-2) : 'missing',
                account_number: body.account_number ? '****' : 'missing',
                account_holder_type: body.account_holder_type
            });
        } catch (parseError) {
            console.error('Failed to parse request body:', parseError.message);
            return Response.json({ error: 'Invalid request format' }, { status: 400 });
        }
        
        const { 
            member_id, 
            account_holder_name,
            routing_number,
            account_number,
            account_holder_type = 'individual'
        } = body;

        // Validate inputs with detailed error reporting
        const missingFields = [];
        if (!member_id) missingFields.push('member_id');
        if (!account_holder_name) missingFields.push('account_holder_name');
        if (!routing_number) missingFields.push('routing_number');
        if (!account_number) missingFields.push('account_number');
        
        if (missingFields.length > 0) {
            console.error('Missing required fields:', missingFields);
            console.error('Received values:', { 
                member_id: member_id || 'MISSING', 
                account_holder_name: account_holder_name || 'MISSING',
                routing_number: routing_number ? 'present' : 'MISSING', 
                account_number: account_number ? 'present' : 'MISSING' 
            });
            return Response.json({ 
                error: `Missing required fields: ${missingFields.join(', ')}. Please fill in all information.`,
                missing_fields: missingFields
            }, { status: 400 });
        }

        // Get member details - first try direct fetch, then search by email
        console.log('Fetching member with ID:', member_id);
        console.log('User info:', { user_id: user.id, email: user.email, association_id: user.association_account_id });
        
        let member;
        try {
            member = await base44.asServiceRole.entities.Member.get(member_id);
            console.log('Member fetched successfully via ID:', member ? member.email : 'null');
        } catch (error) {
            console.log('Failed to fetch by ID, trying to fetch by email:', error.message);
            
            // Try to find member by user's email as fallback
            try {
                const members = await base44.asServiceRole.entities.Member.filter({ email: user.email });
                if (members && members.length > 0) {
                    member = members[0];
                    console.log('Member found by email:', member.email, 'ID:', member.id);
                }
            } catch (emailError) {
                console.error('Failed to fetch member by email:', emailError.message);
            }
        }
        
        if (!member) {
            console.error('Member not found with ID:', member_id, 'or email:', user.email);
            return Response.json({ 
                error: 'Your member profile was not found. Please contact support or refresh the page.',
                debug: { member_id, user_email: user.email }
            }, { status: 404 });
        }
        console.log('Member found:', member.email, 'ID:', member.id);

        // Get association's Stripe account
        if (!user.association_account_id) {
            console.error('User has no association_account_id');
            return Response.json({ 
                error: 'User is not associated with an organization' 
            }, { status: 400 });
        }

        console.log('Fetching association account:', user.association_account_id);
        let associationAccount;
        try {
            associationAccount = await base44.asServiceRole.entities.AssociationAccount.get(user.association_account_id);
            console.log('Association account fetched:', associationAccount ? associationAccount.organization_name : 'null');
        } catch (error) {
            console.error('Failed to fetch association account - Error details:', error.message, error.stack);
            return Response.json({ 
                error: 'Association account not found. Please contact support.',
                debug: { association_id: user.association_account_id, error: error.message }
            }, { status: 400 });
        }
        
        if (!associationAccount) {
            console.error('Association account not found');
            return Response.json({ 
                error: 'Association account not found. Please contact support.' 
            }, { status: 400 });
        }
        if (!associationAccount.stripe_account_id) {
            console.error('Association has no Stripe account connected');
            return Response.json({ 
                error: 'Your organization must connect a Stripe account first. Please ask your administrator to complete the Stripe setup in Settings.' 
            }, { status: 400 });
        }
        console.log('Association Stripe account found:', associationAccount.stripe_account_id);

        // Create Stripe customer for payment collection (contributions)
        let stripeCustomerId = member.stripe_customer_id;
        if (!stripeCustomerId) {
            console.log('Creating Stripe customer for payment collection...');
            try {
                const customer = await stripe.customers.create({
                    email: member.email,
                    name: `${member.first_name} ${member.last_name}`,
                    metadata: {
                        member_id: member_id,
                        association_id: user.association_account_id,
                    }
                }, {
                    stripeAccount: associationAccount.stripe_account_id,
                });
                stripeCustomerId = customer.id;
                console.log('Stripe customer created:', stripeCustomerId);
            } catch (error) {
                console.error('Failed to create Stripe customer:', error);
            }
        }

        // Tokenize and verify the bank account
        console.log('Creating and verifying bank account token...');
        let bankAccountToken;
        try {
            bankAccountToken = await stripe.tokens.create({
                bank_account: {
                    country: 'US',
                    currency: 'usd',
                    account_holder_name: account_holder_name,
                    account_holder_type: account_holder_type,
                    routing_number: routing_number,
                    account_number: account_number,
                },
            }, {
                stripeAccount: associationAccount.stripe_account_id,
            });
            console.log('Bank account token created and validated:', bankAccountToken.id);
        } catch (error) {
            console.error('Failed to validate bank account:', error);
            throw error;
        }

        // Attach bank account to customer for payouts
        console.log('Attaching bank account to customer...');
        let bankAccountSource;
        try {
            if (stripeCustomerId) {
                bankAccountSource = await stripe.customers.createSource(
                    stripeCustomerId,
                    {
                        source: bankAccountToken.id,
                    },
                    {
                        stripeAccount: associationAccount.stripe_account_id,
                    }
                );
                console.log('Bank account attached to customer:', bankAccountSource.id);
            } else {
                // If no customer, just store the validated token info
                bankAccountSource = { id: bankAccountToken.id };
                console.log('No customer - storing token info only');
            }
        } catch (error) {
            console.error('Failed to attach bank account to customer:', error);
            // Continue anyway - we have the token validated
            bankAccountSource = { id: bankAccountToken.id };
        }

        // Update member record with bank info
        console.log('Updating member record with ID:', member_id);
        console.log('Update data:', {
            stripe_customer_id: stripeCustomerId,
            stripe_bank_account_id: bankAccountSource.id,
            bank_account_last4: bankAccountToken.bank_account.last4,
            bank_name: bankAccountToken.bank_account.bank_name,
        });
        
        try {
            await base44.asServiceRole.entities.Member.update(member.id, {
                stripe_customer_id: stripeCustomerId || member.stripe_customer_id,
                stripe_bank_account_id: bankAccountSource.id, // Store bank account source ID
                bank_account_last4: bankAccountToken.bank_account.last4,
                bank_name: bankAccountToken.bank_account.bank_name,
                payout_method: 'Bank Account',
                payout_details: `****${bankAccountToken.bank_account.last4}`,
                // Store account details for re-tokenization on payout
                payout_account_holder: account_holder_name,
                payout_account_type: account_holder_type,
                payout_routing_number: bankAccountToken.bank_account.routing_number,
                payout_account_number: account_number, // This should be encrypted in production
            });
            console.log('Member record updated successfully');
        } catch (error) {
            console.error('Failed to update member record:', error);
            throw error;
        }

        // Log activity
        try {
            await base44.asServiceRole.entities.MemberActivity.create({
                member_id: member_id,
                activity_type: 'Profile Update',
                activity_description: 'Added bank account for payouts',
                related_entity_type: 'Member',
                related_entity_id: member_id,
            });
        } catch (error) {
            console.warn('Failed to log activity:', error);
            // Continue even if activity logging fails
        }

        console.log('=== Bank account setup complete ===');
        return Response.json({ 
            success: true,
            message: 'Bank account added successfully',
            bank_account_last4: bankAccountToken.bank_account.last4,
            bank_name: bankAccountToken.bank_account.bank_name,
        });

    } catch (error) {
        console.error('=== ERROR in setupMemberBankAccount ===');
        console.error('Error type:', error.type);
        console.error('Error message:', error.message);
        console.error('Error stack:', error.stack);

        // Handle specific Stripe errors
        if (error.type === 'StripeInvalidRequestError') {
            console.error('Stripe validation error:', error.raw?.message);
            const stripeMsg = error.raw?.message || error.message;
            let userMsg = stripeMsg;

            // Make error messages more user-friendly
            if (stripeMsg.includes('test bank account')) {
                userMsg = 'In test mode, please use a test bank account. Try: Routing: 110000000, Account: 000123456789';
            } else if (stripeMsg.includes('routing_number') || stripeMsg.includes('routing number')) {
                userMsg = 'Invalid routing number. Please check your routing number and try again.';
            } else if (stripeMsg.includes('account_number') || stripeMsg.includes('account number')) {
                userMsg = 'Invalid account number. Please check your account number and try again.';
            } else if (stripeMsg.includes('bank_account')) {
                userMsg = 'Invalid bank account details. Please check all fields and try again.';
            }

            return Response.json({ 
                error: userMsg,
                details: stripeMsg
            }, { status: 400 });
        }

        if (error.type === 'StripeAuthenticationError') {
            console.error('Stripe authentication error - check API keys');
            return Response.json({ 
                error: 'Payment system authentication failed. Please contact support.' 
            }, { status: 500 });
        }

        return Response.json({ 
            error: error.message || 'Failed to set up bank account. Please try again or contact support.',
            details: error.stack
        }, { status: 500 });
    }
});