import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * This function should be called immediately after a member is created.
 * It sends a personalized welcome email and creates initial notification preferences.
 */

Deno.serve(async (req) => {
    const base44 = createClientFromRequest(req);
    
    try {
        const user = await base44.auth.me();
        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { member_id } = await req.json();

        if (!member_id) {
            return Response.json({ 
                error: 'Missing required field: member_id' 
            }, { status: 400 });
        }

        // Get member details
        const members = await base44.asServiceRole.entities.Member.filter({ id: member_id });
        if (members.length === 0) {
            return Response.json({ error: 'Member not found' }, { status: 404 });
        }
        const member = members[0];

        // Create default notification preferences if they don't exist
        try {
            const existingPrefs = await base44.asServiceRole.entities.NotificationPreference.filter({ 
                member_id: member_id 
            });

            if (existingPrefs.length === 0) {
                await base44.asServiceRole.entities.NotificationPreference.create({
                    member_id: member_id,
                    email_contribution_reminders: true,
                    email_event_reminders: true,
                    email_payout_notifications: true,
                    email_forum_activity: false,
                    email_proposal_updates: true,
                    email_general_announcements: true,
                    reminder_days_before: 3
                });
            }
        } catch (error) {
            console.error('Failed to create notification preferences:', error);
            // Continue even if preferences creation fails
        }

        // Send welcome email via Core integration
        try {
            const origin = req.headers.get('origin') || 'https://benefitly.base44.app';
            await base44.asServiceRole.integrations.Core.SendEmail({
                to: member.email,
                subject: `Welcome to Your Association, ${member.first_name}!`,
                body: `
                    <h2>Welcome ${member.first_name}!</h2>
                    <p>We're excited to have you as a member of our association.</p>
                    <p><strong>Your Member Number:</strong> ${member.member_number || 'Will be assigned soon'}</p>
                    <p>You can access your member portal and update your profile anytime:</p>
                    <p><a href="${origin}/MemberPortal" style="display: inline-block; padding: 10px 20px; background-color: #2563eb; color: white; text-decoration: none; border-radius: 5px;">Go to Member Portal</a></p>
                    <br>
                    <p>Best regards,<br>Your Association Team</p>
                `
            });
        } catch (error) {
            console.error('Failed to send welcome email:', error);
            // Continue even if email fails
        }

        // Log member activity
        try {
            await base44.asServiceRole.entities.MemberActivity.create({
                member_id: member_id,
                activity_type: 'Profile Update',
                activity_description: 'Member account created',
                related_entity_type: 'Member',
                related_entity_id: member_id
            });
        } catch (error) {
            console.error('Failed to log member activity:', error);
            // Continue even if activity logging fails
        }

        return Response.json({ 
            success: true, 
            message: 'Welcome workflow completed',
            welcome_email_sent: true
        });

    } catch (error) {
        console.error('Error in member welcome workflow:', error);
        return Response.json({ 
            error: error.message || 'Failed to process welcome workflow' 
        }, { status: 500 });
    }
});