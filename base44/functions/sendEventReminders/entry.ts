import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * Automated event reminder system - sends reminders to all members based on event reminder_schedule.
 * Can be triggered manually or scheduled via cron job.
 * Sends reminders at configured intervals (e.g., 3 days before, 1 day before, on event day).
 */

Deno.serve(async (req) => {
    const base44 = createClientFromRequest(req);

    try {
        const user = await base44.auth.me();
        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { event_id, manual = false } = await req.json();

        // Get association info
        const associations = await base44.asServiceRole.entities.AssociationAccount.list();
        const association = associations.find(a => a.id === user.association_account_id);
        const orgName = association?.organization_name || 'Your Association';

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        let eventsToProcess = [];

        if (event_id) {
            // Manual trigger for specific event
            const event = await base44.asServiceRole.entities.Event.get(event_id);
            if (event) eventsToProcess = [event];
        } else {
            // Automated check - find events needing reminders
            const allEvents = await base44.asServiceRole.entities.Event.filter({
                status: { $in: ['Published', 'Announced', 'Collecting'] },
                reminders_enabled: true
            });

            eventsToProcess = allEvents.filter(event => {
                if (!event.event_date) return false;
                
                const eventDate = new Date(event.event_date);
                eventDate.setHours(0, 0, 0, 0);
                
                const daysUntil = Math.ceil((eventDate - today) / (1000 * 60 * 60 * 24));
                
                // Check if we need to send reminder for this event
                const reminderSchedule = event.reminder_schedule || [3, 1];
                const remindersSent = event.reminders_sent_for_days || [];
                
                return reminderSchedule.some(daysBefore => 
                    daysBefore === daysUntil && !remindersSent.includes(daysBefore)
                );
            });
        }

        if (eventsToProcess.length === 0) {
            return Response.json({ 
                success: true, 
                message: 'No events need reminders at this time',
                sent: 0 
            });
        }

        // Get all members with email preferences
        const [members, notificationPrefs] = await Promise.all([
            base44.asServiceRole.entities.Member.filter({ status: 'Active' }),
            base44.asServiceRole.entities.NotificationPreference.list()
        ]);

        let totalSent = 0;
        const results = [];

        for (const event of eventsToProcess) {
            const eventDate = new Date(event.event_date);
            eventDate.setHours(0, 0, 0, 0);
            const daysUntil = Math.ceil((eventDate - today) / (1000 * 60 * 60 * 24));
            
            let remindersSentThisEvent = 0;

            for (const member of members) {
                // Check notification preferences
                const memberPrefs = notificationPrefs.find(p => p.member_id === member.id);
                if (memberPrefs && memberPrefs.email_event_reminders === false) {
                    continue; // Skip if member disabled event reminders
                }

                const recipientName = member.first_name || 'Member';
                const eventDateFormatted = eventDate.toLocaleDateString('en-US', { 
                    weekday: 'long', 
                    month: 'long', 
                    day: 'numeric',
                    year: 'numeric'
                });

                const reminderTiming = daysUntil === 0 ? 'Today' : 
                                      daysUntil === 1 ? 'Tomorrow' : 
                                      `in ${daysUntil} Days`;

                // Build event link based on type
                const appDomain = 'https://benefitly.app';
                const eventLink = event.is_paid_event && event.ticket_price > 0
                    ? `${appDomain}/UpcomingEvents#event-${event.id}`
                    : `${appDomain}/MemberPortal`;

                try {
                    await base44.asServiceRole.integrations.Core.SendEmail({
                        from_name: orgName,
                        to: member.email,
                        subject: `⏰ Reminder: ${event.title} is ${reminderTiming}!`,
                        body: `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
    <h2 style="color: #1F2937;">Hi ${recipientName}!</h2>
    
    <p style="color: #374151; font-size: 16px;">This is a friendly reminder about an upcoming event from ${orgName}:</p>
    
    <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 12px; padding: 24px; margin: 24px 0; color: white;">
        <h3 style="margin-top: 0; font-size: 24px;">${event.title}</h3>
        
        <table style="width: 100%; border-collapse: collapse; margin-top: 16px;">
            <tr>
                <td style="padding: 10px 0; color: rgba(255,255,255,0.9); font-size: 14px;">📅 Date:</td>
                <td style="padding: 10px 0; font-weight: bold; font-size: 16px;">${eventDateFormatted}</td>
            </tr>
            ${event.event_time ? `
            <tr>
                <td style="padding: 10px 0; color: rgba(255,255,255,0.9); font-size: 14px;">🕐 Time:</td>
                <td style="padding: 10px 0; font-weight: bold; font-size: 16px;">${event.event_time}${event.event_end_time ? ` - ${event.event_end_time}` : ''}</td>
            </tr>
            ` : ''}
            ${event.venue ? `
            <tr>
                <td style="padding: 10px 0; color: rgba(255,255,255,0.9); font-size: 14px;">📍 Location:</td>
                <td style="padding: 10px 0; font-weight: bold; font-size: 16px;">${event.venue}</td>
            </tr>
            ` : ''}
        </table>
        
        ${event.venue_details ? `<p style="font-size: 14px; opacity: 0.9; margin-top: 16px; line-height: 1.5;">📝 ${event.venue_details}</p>` : ''}
    </div>
    
    ${event.description || event.publicity_blurb ? `
    <div style="background-color: #F9FAFB; border-left: 4px solid #667eea; border-radius: 8px; padding: 20px; margin: 24px 0;">
        <p style="margin: 0; color: #374151; line-height: 1.6;">${event.publicity_blurb || event.description}</p>
    </div>
    ` : ''}
    
    ${event.is_paid_event && event.ticket_price > 0 ? `
    <div style="background-color: #DBEAFE; border-radius: 8px; padding: 20px; margin: 24px 0; text-align: center;">
        <p style="margin: 0 0 12px 0; color: #1E40AF; font-size: 14px;">🎟️ <strong>Ticketed Event</strong></p>
        <p style="margin: 0 0 16px 0; color: #1E3A8A; font-size: 20px; font-weight: bold;">$${event.ticket_price.toFixed(2)} per ticket</p>
        <a href="${eventLink}" style="display: inline-block; background-color: #2563EB; color: white; padding: 12px 32px; text-decoration: none; border-radius: 6px; font-weight: bold;">Get Your Tickets</a>
    </div>
    ` : event.requires_rsvp ? `
    <div style="background-color: #FEF3C7; border-radius: 8px; padding: 20px; margin: 24px 0; text-align: center;">
        <p style="margin: 0 0 12px 0; color: #92400E;"><strong>RSVP Required</strong></p>
        <a href="${eventLink}" style="display: inline-block; background-color: #F59E0B; color: white; padding: 12px 32px; text-decoration: none; border-radius: 6px; font-weight: bold;">RSVP Now</a>
    </div>
    ` : event.contribution_amount && event.contribution_amount > 0 ? `
    <div style="background-color: #D1FAE5; border-radius: 8px; padding: 20px; margin: 24px 0;">
        <p style="margin: 0; color: #065F46;">
            <strong>💚 Member Contribution:</strong> $${event.contribution_amount.toFixed(2)} 
            ${event.contribution_due_date ? `due by ${new Date(event.contribution_due_date).toLocaleDateString()}` : ''}
        </p>
        ${event.contribution_due_date && new Date(event.contribution_due_date) < new Date() ? `
        <p style="margin: 12px 0 0 0; color: #DC2626; font-weight: bold;">⚠️ Payment is past due - please submit as soon as possible</p>
        ` : ''}
    </div>
    ` : ''}
    
    <p style="color: #374151; font-size: 16px; margin-top: 24px;">We look forward to seeing you there!</p>
    
    <div style="text-align: center; margin: 32px 0;">
        <a href="${eventLink}" style="display: inline-block; background-color: #667eea; color: white; padding: 14px 36px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px;">View Event Details</a>
    </div>
    
    <hr style="border: none; border-top: 1px solid #E5E7EB; margin: 32px 0;" />
    
    <p style="color: #9CA3AF; font-size: 12px; text-align: center; margin-top: 24px;">
        This reminder was sent by ${orgName}.<br/>
        To manage your notification preferences, visit your profile settings.
    </p>
</div>
                        `
                    });

                    remindersSentThisEvent++;
                } catch (emailError) {
                    console.error(`Failed to send reminder to ${member.email}:`, emailError);
                }
            }

            // Update event to track reminder sent
            const remindersSent = event.reminders_sent_for_days || [];
            if (!remindersSent.includes(daysUntil)) {
                remindersSent.push(daysUntil);
            }

            await base44.asServiceRole.entities.Event.update(event.id, {
                last_reminder_sent: new Date().toISOString(),
                reminders_sent_for_days: remindersSent
            });

            totalSent += remindersSentThisEvent;
            results.push({
                event_id: event.id,
                event_title: event.title,
                days_until_event: daysUntil,
                reminders_sent: remindersSentThisEvent
            });
        }

        return Response.json({
            success: true,
            message: `Sent ${totalSent} event reminders across ${eventsToProcess.length} event(s)`,
            total_sent: totalSent,
            events_processed: results
        });

    } catch (error) {
        console.error('Error sending event reminders:', error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});