import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';
import Stripe from 'npm:stripe@15.8.0';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY"));

        // Authenticate the user - MUST be a back-office user
        const user = await base44.auth.me();
        if (!user || !user.back_office_role || user.back_office_role === 'None') {
            return new Response(JSON.stringify({ error: 'Unauthorized: Back-office access required.' }), { status: 401 });
        }

        const { associationAccountId, customPrice, customMemberLimit, contractTerm, msaText } = await req.json();

        const associationAccount = await base44.asServiceRole.entities.AssociationAccount.get(associationAccountId);
        if (!associationAccount) {
            return new Response(JSON.stringify({ error: 'Association account not found.' }), { status: 404 });
        }

        // 1. Create a dynamic, customer-specific Product in Stripe
        const product = await stripe.products.create({
            name: `Benefitly Enterprise - ${associationAccount.organization_name}`,
        });

        // 2. Create a dynamic Price for that Product
        const price = await stripe.prices.create({
            product: product.id,
            unit_amount: customPrice * 100, // Price in cents
            currency: 'usd',
            recurring: { interval: 'month' },
        });

        // 3. Create the EnterpriseContract record in our database
        const newContract = await base44.asServiceRole.entities.EnterpriseContract.create({
            association_account_id: associationAccountId,
            custom_monthly_price: customPrice,
            custom_member_limit: customMemberLimit,
            contract_term_months: contractTerm,
            msa_document_text: msaText,
            status: 'Pending Signature',
        });

        // 4. Create a Stripe Checkout Session
        const origin = new URL(req.headers.get("origin") || `https://${Deno.env.get('BASE44_APP_SLUG')}.base44.net`).origin;
        const successUrl = `${origin}/ContractAcceptance?contract_id=${newContract.id}&session_id={CHECKOUT_SESSION_ID}`;
        const cancelUrl = `${origin}/backoffice`;

        const session = await stripe.checkout.sessions.create({
            line_items: [{ price: price.id, quantity: 1 }],
            mode: 'subscription',
            success_url: successUrl,
            cancel_url: cancelUrl,
            metadata: {
                association_account_id: associationAccountId,
                enterprise_contract_id: newContract.id,
            },
        });

        // 5. Update our contract record with the session ID
        await base44.asServiceRole.entities.EnterpriseContract.update(newContract.id, {
            stripe_checkout_session_id: session.id,
        });

        return new Response(JSON.stringify({ checkoutUrl: session.url }), {
            headers: { 'Content-Type': 'application/json' },
            status: 200,
        });

    } catch (error) {
        console.error('Error generating enterprise checkout:', error);
        return new Response(JSON.stringify({ error: error.message }), { status: 500 });
    }
});