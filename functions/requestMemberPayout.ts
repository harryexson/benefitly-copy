import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * Member requests a payout from their available Stripe balance.
 * This function:
 * 1. Validates member has connected Stripe account
 * 2. Creates a Payout entity with "Pending Approval" status
 * 3. Notifies member that request was received
 * 4. Returns confirmation to member
 *
 * Admin approves payouts via Payouts page → triggers processApprovedPayoutToMember
 */

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);

  try {
    // Authenticate user
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { member_id, amount, payout_method = 'standard' } = await req.json();

    if (!member_id || !amount || amount <= 0) {
      return Response.json(
        { error: 'Missing or invalid parameters' },
        { status: 400 }
      );
    }

    if (!['instant', 'standard'].includes(payout_method)) {
      return Response.json(
        { error: 'Invalid payout_method' },
        { status: 400 }
      );
    }

    // Fetch member record
    const member = await base44.asServiceRole.entities.Member.get(member_id);
    if (!member) {
      return Response.json({ error: 'Member not found' }, { status: 404 });
    }

    // Verify member is requesting their own payout
    const memberList = await base44.entities.Member.filter({ email: user.email });
    if (!memberList.length || memberList[0].id !== member_id) {
      return Response.json(
        { error: 'Can only request payouts for yourself' },
        { status: 403 }
      );
    }

    // Verify member has Stripe account
    if (!member.stripe_customer_id) {
      return Response.json(
        { error: 'Member has not set up a Stripe account' },
        { status: 400 }
      );
    }

    // Verify member has payout method configured
    if (!member.payout_method || member.payout_method === 'Not Set') {
      return Response.json(
        { error: 'Please configure a payout method in your profile' },
        { status: 400 }
      );
    }

    // Create pending payout request
    const payout = await base44.asServiceRole.entities.Payout.create({
      payee_member_id: member_id,
      amount: amount / 100, // Convert from cents to dollars
      currency: 'USD',
      status: 'Pending Approval',
      notification_sent: false,
    });

    // Log activity
    await base44.asServiceRole.entities.MemberActivity.create({
      member_id: member_id,
      activity_type: 'Payout Requested',
      activity_description: `Member requested payout of $${(amount / 100).toFixed(2)} via ${payout_method} method`,
      related_entity_id: payout.id,
      related_entity_type: 'Payout',
    });

    // Send confirmation email to member
    try {
      await base44.asServiceRole.integrations.Core.SendEmail({
        from_name: 'Benefitly',
        to: member.email,
        subject: '✅ Payout Request Received',
        body: `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
  <h2 style="color: #059669;">Hello ${member.first_name},</h2>
  <p>Your payout request has been received and is pending approval.</p>
  <div style="background: #ECFDF5; border: 1px solid #6EE7B7; border-radius: 8px; padding: 20px; margin: 20px 0; text-align: center;">
    <p style="margin: 0; color: #065F46; font-size: 14px;">Amount Requested</p>
    <p style="margin: 10px 0; color: #047857; font-size: 32px; font-weight: bold;">$${(amount / 100).toFixed(2)}</p>
    <p style="margin: 10px 0; color: #065F46; font-size: 12px;">Via ${payout_method === 'instant' ? 'Instant Payout (Debit Card)' : 'Standard Payout (Bank Account)'}</p>
  </div>
  <p style="color: #6B7280; font-size: 14px;">
    <strong>What happens next:</strong> An administrator will review and approve your request. 
    You'll receive an email confirmation once it's processed.
  </p>
  <p style="color: #6B7280; font-size: 14px; margin-top: 20px;">
    <strong>Expected timeline:</strong>
    <br/>
    ${payout_method === 'instant' ? '✓ Approval within 24 hours\n✓ Funds arrive within 30 minutes' : '✓ Approval within 24 hours\n✓ Funds arrive in 1–2 business days'}
  </p>
</div>`,
      });
    } catch (emailError) {
      console.error('Failed to send confirmation email:', emailError);
      // Don't fail the request if email fails
    }

    return Response.json({
      success: true,
      message: 'Payout request submitted successfully',
      payout_id: payout.id,
      amount: amount / 100,
      status: 'Pending Approval',
      payout_method: payout_method,
    });
  } catch (error) {
    console.error('Payout request error:', error);
    return Response.json(
      { error: error.message || 'Failed to process payout request' },
      { status: 500 }
    );
  }
});