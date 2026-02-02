import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
    const base44 = createClientFromRequest(req);
    
    try {
        const user = await base44.auth.me();
        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { member_id, template_type, variables, override_subject, override_body } = await req.json();

        if (!member_id || !template_type) {
            return Response.json({ 
                error: 'Missing required fields: member_id and template_type' 
            }, { status: 400 });
        }

        // Get member details
        const member = await base44.asServiceRole.entities.Member.filter({ id: member_id });
        if (member.length === 0) {
            return Response.json({ error: 'Member not found' }, { status: 404 });
        }
        const memberData = member[0];

        // Check notification preferences
        const preferences = await base44.asServiceRole.entities.NotificationPreference.filter({ 
            member_id: member_id 
        });
        
        const prefs = preferences.length > 0 ? preferences[0] : {
            email_contribution_reminders: true,
            email_event_reminders: true,
            email_payout_notifications: true,
            email_forum_activity: false,
            email_proposal_updates: true,
            email_general_announcements: true
        };

        // Check if member wants this type of notification
        const preferenceMap = {
            'contribution_reminder': prefs.email_contribution_reminders,
            'contribution_overdue': prefs.email_contribution_reminders,
            'event_registration_reminder': prefs.email_event_reminders,
            'payout_notification': prefs.email_payout_notifications,
            'forum_new_post': prefs.email_forum_activity,
            'proposal_update': prefs.email_proposal_updates,
            'general_announcement': prefs.email_general_announcements,
        };

        if (preferenceMap[template_type] === false) {
            return Response.json({ 
                success: false, 
                message: 'Member has opted out of this notification type' 
            });
        }

        // Get the email template
        const templates = await base44.asServiceRole.entities.EmailTemplate.filter({ 
            template_type: template_type,
            is_active: true 
        });

        if (templates.length === 0) {
            return Response.json({ 
                error: `No active template found for type: ${template_type}` 
            }, { status: 404 });
        }

        const template = templates[0];

        // Replace variables in subject and body
        let subject = override_subject || template.subject_line;
        let body = override_body || template.email_body;

        // Default variables available for all templates
        const defaultVars = {
            member_name: `${memberData.first_name} ${memberData.last_name}`,
            member_first_name: memberData.first_name,
            member_number: memberData.member_number,
            member_email: memberData.email
        };

        // Merge with custom variables
        const allVariables = { ...defaultVars, ...variables };

        // Replace all variables in subject and body
        for (const [key, value] of Object.entries(allVariables)) {
            const regex = new RegExp(`{{${key}}}`, 'g');
            subject = subject.replace(regex, value);
            body = body.replace(regex, value);
        }

        // Send email using Core.SendEmail integration
        const emailResult = await base44.asServiceRole.integrations.Core.SendEmail({
            from_name: template.send_from_name || 'Benefitly',
            to: memberData.email,
            subject: subject,
            body: body
        });

        // Log the communication
        await base44.asServiceRole.entities.CommunicationLog.create({
            member_id: member_id,
            communication_type: template_type,
            template_id: template.id,
            subject: subject,
            status: 'sent',
            sent_at: new Date().toISOString(),
            related_entity_id: variables?.related_entity_id,
            related_entity_type: variables?.related_entity_type,
            metadata: JSON.stringify(variables)
        });

        return Response.json({ 
            success: true, 
            message: 'Email sent successfully',
            log_id: emailResult.id
        });

    } catch (error) {
        console.error('Error sending templated email:', error);
        return Response.json({ 
            error: error.message || 'Failed to send email' 
        }, { status: 500 });
    }
});