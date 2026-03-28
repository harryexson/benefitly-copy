import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

/**
 * Sends email notifications to all members about a new announcement.
 * Only sends to members who have email_general_announcements enabled.
 */

Deno.serve(async (req) => {
    const base44 = createClientFromRequest(req);

    try {
        const user = await base44.auth.me();
        if (!user || user.association_role !== 'Administrator') {
            return Response.json({ error: 'Unauthorized - Admin access required' }, { status: 401 });
        }

        const { announcement_id } = await req.json();

        if (!announcement_id) {
            return Response.json({ error: 'Missing announcement_id' }, { status: 400 });
        }

        // Get announcement
        const announcement = await base44.asServiceRole.entities.Announcement.get(announcement_id);
        if (!announcement) {
            return Response.json({ error: 'Announcement not found' }, { status: 404 });
        }

        // Get all active members
        const members = await base44.asServiceRole.entities.Member.filter({ status: 'Active' });

        // Get notification preferences
        const preferences = await base44.asServiceRole.entities.NotificationPreference.list();
        const prefsMap = {};
        preferences.forEach(p => {
            prefsMap[p.member_id] = p;
        });

        // Get association info
        const associations = await base44.asServiceRole.entities.AssociationAccount.list();
        const association = associations.find(a => a.id === user.association_account_id);
        const orgName = association?.organization_name || 'Your Association';

        // Priority styling
        const priorityBanner = {
            normal: '',
            important: `<div style="background-color: #FEF3C7; border: 1px solid #FCD34D; border-radius: 8px; padding: 12px; margin-bottom: 20px; text-align: center;">
                <strong style="color: #92400E;">⚠️ Important Announcement</strong>
            </div>`,
            urgent: `<div style="background-color: #FEE2E2; border: 1px solid #FECACA; border-radius: 8px; padding: 12px; margin-bottom: 20px; text-align: center;">
                <strong style="color: #991B1B;">🚨 Urgent Announcement</strong>
            </div>`
        };

        let successCount = 0;
        let skipCount = 0;

        for (const member of members) {
            // Check notification preferences
            const prefs = prefsMap[member.id];
            if (prefs && prefs.email_general_announcements === false) {
                skipCount++;
                continue;
            }

            try {
                await base44.asServiceRole.integrations.Core.SendEmail({
                    from_name: orgName,
                    to: member.email,
                    subject: `${announcement.priority === 'urgent' ? '🚨 ' : announcement.priority === 'important' ? '⚠️ ' : '📢 '}${announcement.title}`,
                    body: `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
    <h2 style="color: #1F2937;">Hello ${member.first_name},</h2>
    
    ${priorityBanner[announcement.priority] || ''}
    
    <h3 style="color: #374151; margin-top: 20px;">${announcement.title}</h3>
    
    <div style="background-color: #F9FAFB; border-radius: 8px; padding: 20px; margin: 20px 0;">
        <p style="color: #374151; white-space: pre-wrap; margin: 0;">${announcement.content}</p>
    </div>
    
    <p style="color: #6B7280; font-size: 12px; margin-top: 30px;">
        This announcement was sent by ${orgName}.<br/>
        To manage your notification preferences, visit your profile settings.
    </p>
</div>
                    `
                });
                successCount++;
            } catch (emailError) {
                console.error(`Failed to send to ${member.email}:`, emailError);
            }
        }

        return Response.json({
            success: true,
            message: `Announcement sent to ${successCount} members`,
            sent: successCount,
            skipped: skipCount
        });

    } catch (error) {
        console.error('Error sending announcement notifications:', error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});