import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

/**
 * Creates default email templates for a new association based on their type and preferences.
 * This is called during the onboarding wizard.
 */

Deno.serve(async (req) => {
    try {
        // Clone the request to read the body separately
        const clonedReq = req.clone();
        const body = await clonedReq.json();
        const { association_account_id, association_type, tone, organization_name } = body;

        const base44 = createClientFromRequest(req);
        
        const user = await base44.auth.me();
        if (!user || !user.association_account_id) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Verify user has access to this association
        if (user.association_account_id !== association_account_id) {
            return Response.json({ error: 'Unauthorized' }, { status: 403 });
        }

        // Check if templates already exist
        const existingTemplates = await base44.asServiceRole.entities.EmailTemplate.filter({});
        const associationTemplates = existingTemplates.filter(t => 
            t.created_by === user.id || t.send_from_name?.includes(organization_name)
        );

        if (associationTemplates.length > 0) {
            return Response.json({ 
                success: true, 
                message: 'Templates already exist',
                templates_created: 0 
            });
        }

        // Define tone-based greetings and sign-offs
        const toneSettings = {
            professional: {
                greeting: 'Dear {{member_name}}',
                signOff: 'Best regards,\n' + organization_name,
                style: 'formal'
            },
            friendly: {
                greeting: 'Hi {{member_first_name}}',
                signOff: 'Warm regards,\nThe ' + organization_name + ' Team',
                style: 'warm'
            },
            casual: {
                greeting: 'Hey {{member_first_name}}',
                signOff: 'Cheers,\n' + organization_name,
                style: 'casual'
            }
        };

        const settings = toneSettings[tone] || toneSettings.professional;

        // Define default templates
        const templates = [
            {
                name: 'Welcome New Member',
                template_type: 'welcome_new_member',
                subject_line: `Welcome to ${organization_name}!`,
                email_body: `${settings.greeting},

We're ${settings.style === 'formal' ? 'pleased' : settings.style === 'warm' ? 'so happy' : 'thrilled'} to welcome you to ${organization_name}!

Your membership is now active. Here are your account details:
• Member Number: {{member_number}}
• Member Since: {{join_date}}

To access your member portal and view your contribution history, click here: {{portal_link}}

${settings.style === 'formal' ? 'Should you have any questions, please do not hesitate to contact us.' : 'If you have any questions, feel free to reach out anytime!'}

${settings.signOff}`,
                is_active: true,
                send_from_name: organization_name
            },
            {
                name: 'Contribution Reminder',
                template_type: 'contribution_reminder',
                subject_line: 'Upcoming Contribution Due - {{event_title}}',
                email_body: `${settings.greeting},

This is a friendly reminder that your contribution for {{event_title}} is due soon.

Contribution Details:
• Amount Due: ${{amount_due}}
• Due Date: {{due_date}}
• Days Until Due: {{days_until_due}}

You can make your payment here: {{payment_link}}

${settings.style === 'formal' ? 'Thank you for your continued support.' : 'Thanks for being a valued member!'}

${settings.signOff}`,
                is_active: true,
                send_from_name: organization_name
            },
            {
                name: 'Payment Overdue Notice',
                template_type: 'contribution_overdue',
                subject_line: 'Payment Overdue - {{event_title}}',
                email_body: `${settings.greeting},

We noticed that your contribution for {{event_title}} is now overdue.

Payment Details:
• Amount Due: ${{amount_due}}
• Original Due Date: {{due_date}}
• Days Overdue: {{days_overdue}}

Please make your payment as soon as possible: {{payment_link}}

If you're experiencing financial difficulty, please contact us to discuss payment arrangements.

${settings.signOff}`,
                is_active: true,
                send_from_name: organization_name
            },
            {
                name: 'Event Registration Reminder',
                template_type: 'event_registration_reminder',
                subject_line: 'Upcoming Event - {{event_title}}',
                email_body: `${settings.greeting},

${settings.style === 'formal' ? 'This is to remind you' : "Don't forget"} about our upcoming event:

{{event_title}}
Date: {{event_date}}
Time: {{event_time}}
Location: {{event_location}}

${association_type === 'mutual_aid' || association_type === 'burial_society' 
    ? 'Your contribution of ${{amount_due}} is due by {{due_date}}.' 
    : 'We look forward to seeing you there!'}

${settings.style === 'casual' ? "Can't wait to see you!" : 'We look forward to your participation.'}

${settings.signOff}`,
                is_active: true,
                send_from_name: organization_name
            },
            {
                name: 'Payout Notification',
                template_type: 'payout_notification',
                subject_line: 'Benefit Payout Processed - {{event_title}}',
                email_body: `${settings.greeting},

${settings.style === 'formal' ? 'We are writing to inform you' : 'Good news!'} ${settings.style !== 'formal' && 'We\'ve'} processed your benefit payout.

Payout Details:
• Event: {{event_title}}
• Amount: ${{payout_amount}}
• Payment Method: {{payout_method}}
• Expected Arrival: {{expected_arrival}}

${association_type === 'mutual_aid' || association_type === 'burial_society'
    ? 'Our thoughts are with you during this difficult time.'
    : 'Thank you for being a valued member of our community.'}

${settings.signOff}`,
                is_active: true,
                send_from_name: organization_name
            },
            {
                name: 'New Forum Post',
                template_type: 'forum_new_post',
                subject_line: 'New Community Discussion - {{thread_title}}',
                email_body: `${settings.greeting},

There's a new discussion in the ${organization_name} community forum that might interest you:

Topic: {{thread_title}}
Category: {{category_name}}

Join the conversation: {{thread_link}}

${settings.signOff}`,
                is_active: false, // Disabled by default until member enables it
                send_from_name: organization_name
            },
            {
                name: 'Proposal Update',
                template_type: 'proposal_update',
                subject_line: '{{proposal_status}}: {{proposal_title}}',
                email_body: `${settings.greeting},

${settings.style === 'formal' ? 'We are writing to update you' : 'Quick update'} on a proposal:

{{proposal_title}}
Status: {{proposal_status}}

{{action_required}}

View full details and ${settings.style === 'formal' ? 'cast your vote' : 'vote now'}: {{proposal_link}}

${settings.signOff}`,
                is_active: true,
                send_from_name: organization_name
            },
            {
                name: 'General Announcement',
                template_type: 'general_announcement',
                subject_line: 'Important Update from {{organization_name}}',
                email_body: `${settings.greeting},

[Your announcement message here]

${settings.signOff}`,
                is_active: true,
                send_from_name: organization_name
            },
            {
                name: 'New Event Created',
                template_type: 'event_created',
                subject_line: 'New Event Announced - {{event_title}}',
                email_body: `${settings.greeting},

${settings.style === 'formal' ? 'We are pleased to announce' : "We're excited to share"} a new event:

{{event_title}}
{{event_description}}

${association_type === 'mutual_aid' || association_type === 'burial_society'
    ? 'Contribution Amount: ${{amount_due}}\nDue Date: {{due_date}}'
    : 'Event Date: {{event_date}}\nLocation: {{event_location}}'}

${settings.style === 'formal' ? 'More details are available' : 'Learn more'} here: {{event_link}}

${settings.signOff}`,
                is_active: true,
                send_from_name: organization_name
            }
        ];

        // Create all templates
        const createdTemplates = [];
        for (const template of templates) {
            const created = await base44.asServiceRole.entities.EmailTemplate.create(template);
            createdTemplates.push(created);
        }

        return Response.json({ 
            success: true,
            message: `Created ${createdTemplates.length} default email templates`,
            templates_created: createdTemplates.length,
            template_ids: createdTemplates.map(t => t.id)
        });

    } catch (error) {
        console.error('Error creating default email templates:', error);
        return Response.json({ 
            error: error.message || 'Failed to create email templates' 
        }, { status: 500 });
    }
});