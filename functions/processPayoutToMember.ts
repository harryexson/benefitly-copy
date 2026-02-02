import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import Stripe from 'npm:stripe@14.18.0';

/**
 * Process benefit payout to member using Stripe Global Payouts.
 * 
 * UPDATED PAYOUT FLOW (Global Payouts):
 * 1. Verify member has valid bank account details stored
 * 2. Create or retrieve Stripe Recipient object for member
 * 3. Create payout directly from platform balance to recipient's bank
 * 4. Track payout status and notify member
 * 
 * NOTE: Requires Stripe Global Payouts to be enabled on the platform account.
 * If not available, payouts will be marked for manual processing.
 */

async function notifyAdminsOfFailure(base44, associationAccountId, payout, member, errorMessage) {
    try {
        const adminUsers = await base44.asServiceRole.entities.User.filter({
            association_account_id: associationAccountId,
            association_role: 'Administrator'
        });

        for (const admin of adminUsers) {
            await base44.asServiceRole.integrations.Core.SendEmail({
                from_name: 'Benefitly System',
                to: admin.email,
                subject: `⚠️ Payout Failed - Action Required`,
                body: `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
    <h2 style="color: #DC2626;">Payout Processing Failed</h2>
    <div style="background-color: #FEF2F2; border: 1px solid #FECACA; border-radius: 8px; padding: 16px; margin: 20px 0;">
        <h3 style="margin-top: 0; color: #991B1B;">Error Details</h3>
        <p style="color: #7F1D1D;">${errorMessage}</p>
    </div>
    <div style="background-color: #F3F4F6; border-radius: 8px; padding: 16px; margin: 20px 0;">
        <table style="width: 100%;">
            <tr><td style="padding: 8px 0; color: #6B7280;">Recipient:</td><td style="font-weight: bold;">${member.first_name} ${member.last_name}</td></tr>
            <tr><td style="padding: 8px 0; color: #6B7280;">Amount:</td><td style="font-weight: bold;">$${payout.amount.toFixed(2)}</td></tr>
            <tr><td style="padding: 8px 0; color: #6B7280;">Bank:</td><td>****${member.bank_account_last4 || 'N/A'}</td></tr>
        </table>
    </div>
</div>`
            });
        }
    } catch (e) {
        console.error('Failed to notify admins:', e);
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

async function notifyMemberOfSuccess(base44, member, payout, payoutMethod, event) {
    try {
        const arrivalDate = new Date();
        arrivalDate.setDate(arrivalDate.getDate() + 4);

        const expectedArrival = payoutMethod === 'instant' 
            ? 'within 30 minutes' 
            : `by ${arrivalDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}`;

        await base44.asServiceRole.integrations.Core.SendEmail({
            from_name: 'Benefitly',
            to: member.email,
            subject: `✅ Your Benefit Payout of $${payout.amount.toFixed(2)} Has Been Sent`,
            body: `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
    <h2 style="color: #059669;">Good news, ${member.first_name}!</h2>
    <p>Your benefit payout is on its way to your bank account.</p>
    <div style="text-align: center; background: #ECFDF5; border: 1px solid #6EE7B7; border-radius: 8px; padding: 20px; margin: 20px 0;">
        <p style="margin: 0; color: #065F46; font-size: 14px;">Amount Sent</p>
        <p style="margin: 10px 0; color: #047857; font-size: 32px; font-weight: bold;">$${payout.amount.toFixed(2)}</p>
    </div>
    <div style="background: #F3F4F6; border-radius: 8px; padding: 16px; margin: 20px 0;">
        <table style="width: 100%;">
            <tr><td style="padding: 8px 0; color: #6B7280;">Expected:</td><td style="font-weight: bold;">${expectedArrival}</td></tr>
            <tr><td style="padding: 8px 0; color: #6B7280;">Bank:</td><td>****${member.bank_account_last4 || '****'}</td></tr>
            ${event ? `<tr><td style="padding: 8px 0; color: #6B7280;">Event:</td><td>${event.title}</td></tr>` : ''}
        </table>
    </div>
</div>`
        });
    } catch (e) {
        console.error('Failed to send success notification:', e);
    }
}

Deno.serve(async (req) => {
    let payout = null;
    let member = null;
    let associationAccountId = null;

    try {
        const base44 = createClientFromRequest(req);
        const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY"));

        const user = await base44.auth.me();
        if (!user || user.association_role !== 'Administrator') {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }
        associationAccountId = user.association_account_id;

        const body = await req.json();
        const payout_id = body.payout_id;
        
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

        // Use payout's configured speed, or allow override from request
        const payout_method = body.payout_method || payout.payout_speed || 'standard';

        member = await base44.asServiceRole.entities.Member.get(payout.payee_member_id);
        if (!member) {
            return Response.json({ error: 'Member not found' }, { status: 404 });
        }

        if (!member.payout_routing_number || !member.payout_account_number) {
            const errorMsg = 'Member has not set up bank account';
            await base44.asServiceRole.entities.Payout.update(payout_id, {
                status: 'Failed',
                failure_reason: errorMsg
            });
            await Promise.all([
                notifyMemberOfFailure(base44, member, payout, errorMsg),
                notifyAdminsOfFailure(base44, associationAccountId, payout, member, errorMsg)
            ]);
            return Response.json({ error: errorMsg }, { status: 400 });
        }

        const associationAccount = await base44.asServiceRole.entities.AssociationAccount.get(associationAccountId);
        if (!associationAccount?.stripe_account_id) {
            const errorMsg = 'Association has not connected Stripe';
            await notifyAdminsOfFailure(base44, associationAccountId, payout, member, errorMsg);
            return Response.json({ error: errorMsg }, { status: 400 });
        }

        if (!associationAccount.stripe_payouts_enabled) {
            const errorMsg = 'Stripe account not verified for payouts';
            await notifyAdminsOfFailure(base44, associationAccountId, payout, member, errorMsg);
            return Response.json({ error: errorMsg }, { status: 400 });
        }

        let event = null;
        if (payout.event_id) {
            try {
                event = await base44.asServiceRole.entities.Event.get(payout.event_id);
            } catch (e) {
                console.log('Could not fetch event');
            }
        }

        const payoutAmount = Math.round(payout.amount * 100);

        console.log('=== Global Payout Flow Start ===');
        console.log('Amount:', payoutAmount, 'cents');
        console.log('Platform Account');

        // Check if member already has an external account ID saved
        let externalAccountId = member.stripe_bank_account_id;

        if (!externalAccountId) {
            console.log('Creating and attaching new external bank account...');

            // Create bank account token
            const bankToken = await stripe.tokens.create({
                bank_account: {
                    country: 'US',
                    currency: 'usd',
                    account_holder_name: member.payout_account_holder || `${member.first_name} ${member.last_name}`,
                    account_holder_type: member.payout_account_type || 'individual',
                    routing_number: member.payout_routing_number,
                    account_number: member.payout_account_number,
                },
            });

            console.log('Bank token created:', bankToken.id);

            // Attach the bank account as an external account to the connected account
            const externalAccount = await stripe.accounts.createExternalAccount(
                associationAccount.stripe_account_id,
                { external_account: bankToken.id }
            );

            console.log('External account created:', externalAccount.id);

            externalAccountId = externalAccount.id;

            // Save the external account ID to member record for future use
            await base44.asServiceRole.entities.Member.update(member.id, {
                stripe_bank_account_id: externalAccountId,
                bank_account_last4: externalAccount.last4,
                bank_name: externalAccount.bank_name || 'Bank Account'
            });
        } else {
            console.log('Using existing external account:', externalAccountId);
        }

        // Create payout from the association's Stripe balance to member's bank
        const stripePayout = await stripe.payouts.create({
            amount: payoutAmount,
            currency: 'usd',
            destination: externalAccountId,
            method: payout_method === 'instant' ? 'instant' : 'standard',
            description: `Benefit payout to ${member.first_name} ${member.last_name}`,
            metadata: {
                payout_id: payout_id,
                member_id: member.id,
                event_id: payout.event_id || '',
            },
        }, {
            stripeAccount: associationAccount.stripe_account_id,
        });

        console.log('Payout created:', stripePayout.id);

        const arrivalDate = new Date();
        arrivalDate.setDate(arrivalDate.getDate() + (payout_method === 'instant' ? 0 : 4));

        await base44.asServiceRole.entities.Payout.update(payout_id, {
            status: 'Disbursed',
            paid_at: new Date().toISOString(),
            stripe_payout_id: stripePayout.id,
            estimated_arrival: arrivalDate.toISOString().split('T')[0],
            notification_sent: true
        });

        await base44.asServiceRole.entities.MemberActivity.create({
            member_id: member.id,
            activity_type: 'Payment Made',
            activity_description: `Received benefit payout of $${payout.amount.toFixed(2)}`,
            related_entity_id: payout_id,
            related_entity_type: 'Payout',
        });

        await notifyMemberOfSuccess(base44, member, payout, payout_method, event);

        console.log('=== Payout Success ===');

        return Response.json({ 
            success: true,
            message: 'Payout processed successfully',
            stripe_payout_id: stripePayout.id,
            amount: `$${(payoutAmount / 100).toFixed(2)}`,
            estimated_arrival: payout_method === 'instant' ? 'Within 30 minutes' : `By ${arrivalDate.toLocaleDateString()}`,
            recipient: `${member.first_name} ${member.last_name}`,
            notification_sent: true
        });

    } catch (error) {
        console.error('=== PAYOUT ERROR ===');
        console.error('Type:', error.type);
        console.error('Code:', error.code);
        console.error('Message:', error.message);
        console.error('Stack:', error.stack);
        
        const errorMessage = error.message || 'Failed to process payout';
        const stripeErrorCode = error.code || error.type || 'unknown_error';
        
        if (payout) {
            try {
                await base44.asServiceRole.entities.Payout.update(payout.id, {
                    status: 'Failed',
                    failure_reason: errorMessage,
                    stripe_error_code: stripeErrorCode,
                    stripe_error_message: error.raw?.message || errorMessage,
                    last_retry_at: new Date().toISOString()
                });
            } catch (e) {
                console.error('Failed to update payout:', e);
            }
        }
        
        try {
            const base44 = createClientFromRequest(req);
            if (member && payout && associationAccountId) {
                await Promise.all([
                    notifyMemberOfFailure(base44, member, payout, errorMessage),
                    notifyAdminsOfFailure(base44, associationAccountId, payout, member, `${errorMessage} (${stripeErrorCode})`)
                ]);
            }
        } catch (notifyError) {
            console.error('Failed to send failure notifications:', notifyError);
        }
        
        if (error.code === 'insufficient_funds') {
            return Response.json({ 
                error: 'Insufficient funds in Stripe balance. Please add funds to your Stripe account before processing payouts.',
                stripe_error_code: stripeErrorCode,
                help: 'You can add funds via bank transfer in your Stripe Dashboard'
            }, { status: 400 });
        }

        if (error.code === 'resource_missing' && error.message.includes('recipient')) {
            return Response.json({ 
                error: 'Global Payouts not enabled. Please contact Stripe support to enable Global Payouts on your account, or process payouts manually.',
                stripe_error_code: stripeErrorCode,
                help: 'Global Payouts allows direct bank transfers to any recipient without them being Stripe customers.'
            }, { status: 400 });
        }

        return Response.json({ 
            error: errorMessage,
            stripe_error_code: stripeErrorCode
        }, { status: 500 });
    }
});