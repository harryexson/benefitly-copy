import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

/**
 * Automated reminder system for contributions and events.
 * 
 * Features:
 * - Configurable reminder schedules (days before due date)
 * - Tracks reminder_sent_at and reminder_count to avoid spam
 * - Sends upcoming, due soon, and overdue notices
 * - Respects grace periods
 * 
 * Call this daily via cron/scheduled job.
 */

// Default settings - can be overridden by association settings
const DEFAULT_SETTINGS = {
    firstReminderDays: 7,      // Days before due date for first reminder
    secondReminderDays: 3,     // Days before due date for second reminder  
    finalReminderDays: 1,      // Day before due date for final reminder
    overdueReminderInterval: 7, // Days between overdue reminders
    gracePeriodDays: 5,        // Grace period before marking past due
    maxReminders: 5            // Maximum reminders per contribution
};

function getAssociationSettings(associationId) {
    // In the future, this could fetch from a settings entity
    // For now, return defaults
    return DEFAULT_SETTINGS;
}

async function sendContributionReminder(base44, contribution, member, event, reminderType, origin) {
    const dueDate = new Date(contribution.due_date);
    const today = new Date();
    const daysUntilDue = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24));
    const daysOverdue = Math.abs(daysUntilDue);
    
    let subject, urgencyText, urgencyColor;
    
    if (reminderType === 'first') {
        subject = `Upcoming: Contribution due in ${daysUntilDue} days`;
        urgencyText = `Your contribution is due in ${daysUntilDue} days.`;
        urgencyColor = '#3B82F6'; // Blue
    } else if (reminderType === 'second') {
        subject = `Reminder: Contribution due in ${daysUntilDue} days`;
        urgencyText = `Your contribution is due soon - only ${daysUntilDue} days remaining.`;
        urgencyColor = '#F59E0B'; // Orange
    } else if (reminderType === 'final') {
        subject = `⚠️ Final Notice: Contribution due tomorrow`;
        urgencyText = `This is your final reminder. Your contribution is due tomorrow.`;
        urgencyColor = '#EF4444'; // Red
    } else if (reminderType === 'overdue') {
        subject = `⚠️ Overdue: Payment ${daysOverdue} days past due`;
        urgencyText = `Your contribution is now ${daysOverdue} days overdue. Please pay immediately to avoid any issues with your membership.`;
        urgencyColor = '#DC2626'; // Dark Red
    }

    await base44.asServiceRole.integrations.Core.SendEmail({
        from_name: 'Benefitly',
        to: member.email,
        subject: subject,
        body: `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
    <h2 style="color: #1F2937;">Hello ${member.first_name},</h2>
    
    <div style="background-color: ${urgencyColor}15; border-left: 4px solid ${urgencyColor}; padding: 16px; margin: 20px 0;">
        <p style="margin: 0; color: ${urgencyColor}; font-weight: bold;">${urgencyText}</p>
    </div>
    
    <div style="background-color: #F3F4F6; border-radius: 8px; padding: 20px; margin: 20px 0;">
        <table style="width: 100%; border-collapse: collapse;">
            <tr>
                <td style="padding: 8px 0; color: #6B7280;">Event:</td>
                <td style="padding: 8px 0; font-weight: bold;">${event?.title || 'Association Contribution'}</td>
            </tr>
            <tr>
                <td style="padding: 8px 0; color: #6B7280;">Amount Due:</td>
                <td style="padding: 8px 0; font-weight: bold; font-size: 18px; color: #059669;">$${contribution.amount_due.toFixed(2)}</td>
            </tr>
            <tr>
                <td style="padding: 8px 0; color: #6B7280;">Due Date:</td>
                <td style="padding: 8px 0; font-weight: bold;">${dueDate.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</td>
            </tr>
        </table>
    </div>
    
    <div style="text-align: center; margin: 30px 0;">
        <a href="${origin}/MemberPortal" 
           style="display: inline-block; background-color: #2563EB; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold;">
            Pay Now
        </a>
    </div>
    
    <p style="color: #6B7280; font-size: 12px; margin-top: 30px;">
        If you've already made this payment, please disregard this reminder. 
        For questions, contact your association administrator.
    </p>
</div>
        `
    });
    
    // Update contribution with reminder tracking
    await base44.asServiceRole.entities.EventContribution.update(contribution.id, {
        reminder_sent_at: new Date().toISOString(),
        reminder_count: (contribution.reminder_count || 0) + 1
    });
}

Deno.serve(async (req) => {
    const base44 = createClientFromRequest(req);
    
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const origin = req.headers.get('origin') || `https://${Deno.env.get('BASE44_APP_SLUG')}.base44.app`;
        
        const remindersSent = {
            first_reminders: 0,
            second_reminders: 0,
            final_reminders: 0,
            overdue_notices: 0,
            event_reminders: 0,
            skipped_max_reached: 0
        };

        // Get all outstanding contributions
        const allContributions = await base44.asServiceRole.entities.EventContribution.filter({
            status: 'Due'
        });
        
        const overdueContributions = await base44.asServiceRole.entities.EventContribution.filter({
            status: 'Past Due'
        });
        
        // Process due contributions
        for (const contribution of [...allContributions, ...overdueContributions]) {
            // Check max reminders
            if ((contribution.reminder_count || 0) >= DEFAULT_SETTINGS.maxReminders) {
                remindersSent.skipped_max_reached++;
                continue;
            }
            
            const dueDate = new Date(contribution.due_date);
            dueDate.setHours(0, 0, 0, 0);
            const daysUntilDue = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24));
            
            // Check if we sent a reminder recently (within 24 hours)
            if (contribution.reminder_sent_at) {
                const lastReminder = new Date(contribution.reminder_sent_at);
                const hoursSinceLastReminder = (today - lastReminder) / (1000 * 60 * 60);
                if (hoursSinceLastReminder < 23) {
                    continue; // Skip, reminder sent too recently
                }
            }
            
            // Get member and event details
            let member, event;
            try {
                member = await base44.asServiceRole.entities.Member.get(contribution.member_id);
                event = await base44.asServiceRole.entities.Event.get(contribution.event_id);
            } catch (e) {
                continue; // Skip if member or event not found
            }
            
            if (!member?.email) continue;
            
            // Determine reminder type based on days until due
            let reminderType = null;
            
            if (contribution.status === 'Past Due') {
                // Check if enough time has passed since last overdue reminder
                const daysSinceLastReminder = contribution.reminder_sent_at 
                    ? Math.floor((today - new Date(contribution.reminder_sent_at)) / (1000 * 60 * 60 * 24))
                    : 999;
                    
                if (daysSinceLastReminder >= DEFAULT_SETTINGS.overdueReminderInterval) {
                    reminderType = 'overdue';
                }
            } else if (daysUntilDue === DEFAULT_SETTINGS.firstReminderDays) {
                reminderType = 'first';
            } else if (daysUntilDue === DEFAULT_SETTINGS.secondReminderDays) {
                reminderType = 'second';
            } else if (daysUntilDue === DEFAULT_SETTINGS.finalReminderDays) {
                reminderType = 'final';
            }
            
            if (reminderType) {
                try {
                    await sendContributionReminder(base44, contribution, member, event, reminderType, origin);
                    
                    if (reminderType === 'first') remindersSent.first_reminders++;
                    else if (reminderType === 'second') remindersSent.second_reminders++;
                    else if (reminderType === 'final') remindersSent.final_reminders++;
                    else if (reminderType === 'overdue') remindersSent.overdue_notices++;
                } catch (sendError) {
                    console.error(`Failed to send reminder for contribution ${contribution.id}:`, sendError);
                }
            }
        }

        // === EVENT REMINDERS ===
        const upcomingEvents = await base44.asServiceRole.entities.Event.filter({
            status: 'Announced'
        });
        
        for (const event of upcomingEvents) {
            if (!event.event_date) continue;
            
            const eventDate = new Date(event.event_date);
            eventDate.setHours(0, 0, 0, 0);
            
            const daysUntilEvent = Math.ceil((eventDate - today) / (1000 * 60 * 60 * 24));
            
            // Send reminder 7 days before event
            if (daysUntilEvent === 7) {
                const activeMembers = await base44.asServiceRole.entities.Member.filter({ 
                    status: 'Active' 
                });
                
                for (const member of activeMembers) {
                    if (!member.email) continue;
                    
                    // Check if already sent reminder for this event
                    try {
                        const eventLogs = await base44.asServiceRole.entities.CommunicationLog.filter({
                            member_id: member.id,
                            communication_type: 'event_reminder',
                            related_entity_id: event.id
                        });
                        
                        if (eventLogs.length === 0) {
                            await base44.asServiceRole.integrations.Core.SendEmail({
                                from_name: 'Benefitly',
                                to: member.email,
                                subject: `📅 Upcoming Event: ${event.title}`,
                                body: `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
    <h2 style="color: #1F2937;">Hi ${member.first_name}!</h2>
    
    <p>Don't forget about our upcoming event:</p>
    
    <div style="background-color: #EFF6FF; border-radius: 8px; padding: 20px; margin: 20px 0;">
        <h3 style="margin-top: 0; color: #1E40AF;">${event.title}</h3>
        <p style="color: #1E3A8A;"><strong>Date:</strong> ${eventDate.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
        ${event.venue ? `<p style="color: #1E3A8A;"><strong>Location:</strong> ${event.venue}</p>` : ''}
        ${event.description ? `<p style="color: #374151;">${event.description}</p>` : ''}
    </div>
    
    <div style="text-align: center; margin: 30px 0;">
        <a href="${origin}/UpcomingEvents" 
           style="display: inline-block; background-color: #2563EB; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold;">
            View Event Details
        </a>
    </div>
</div>
                                `
                            });
                            
                            // Log that we sent this reminder
                            await base44.asServiceRole.entities.CommunicationLog.create({
                                member_id: member.id,
                                communication_type: 'event_reminder',
                                related_entity_id: event.id,
                                related_entity_type: 'Event',
                                sent_at: new Date().toISOString(),
                                subject: `Event Reminder: ${event.title}`
                            });
                            
                            remindersSent.event_reminders++;
                        }
                    } catch (logError) {
                        console.error('Error checking/sending event reminder:', logError);
                    }
                }
            }
        }

        return Response.json({
            success: true,
            date: today.toISOString(),
            reminders_sent: remindersSent,
            total: Object.values(remindersSent).reduce((a, b) => a + b, 0)
        });

    } catch (error) {
        console.error('Error in automated reminders:', error);
        return Response.json({ 
            error: error.message || 'Failed to process reminders' 
        }, { status: 500 });
    }
});