import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

/**
 * Notify members about new forum posts based on their interests.
 * Called when a new forum thread or reply is created.
 */

Deno.serve(async (req) => {
    const base44 = createClientFromRequest(req);
    
    try {
        const { thread_id, category_id, is_new_thread } = await req.json();

        if (!thread_id) {
            return Response.json({ error: 'Missing thread_id' }, { status: 400 });
        }

        // Get thread details
        const threads = await base44.asServiceRole.entities.ForumThread.filter({ id: thread_id });
        if (threads.length === 0) {
            return Response.json({ error: 'Thread not found' }, { status: 404 });
        }
        const thread = threads[0];

        // Get category details
        const categories = await base44.asServiceRole.entities.ForumCategory.filter({ 
            id: category_id || thread.category_id 
        });
        const category = categories.length > 0 ? categories[0] : null;

        // Get all active members with forum notifications enabled
        const allMembers = await base44.asServiceRole.entities.Member.filter({ 
            status: 'Active' 
        });

        let notificationsSent = 0;

        for (const member of allMembers) {
            // Skip the author of the thread
            if (member.user_id === thread.author_user_id) continue;

            // Check notification preferences
            const prefs = await base44.asServiceRole.entities.NotificationPreference.filter({ 
                member_id: member.id 
            });

            const memberPrefs = prefs.length > 0 ? prefs[0] : { email_forum_activity: false };

            if (memberPrefs.email_forum_activity) {
                try {
                    await base44.asServiceRole.functions.invoke('sendTemplatedEmail', {
                        member_id: member.id,
                        template_type: 'forum_new_post',
                        variables: {
                            member_name: `${member.first_name} ${member.last_name}`,
                            member_first_name: member.first_name,
                            thread_title: thread.title,
                            category_name: category?.name || 'Discussion',
                            thread_link: `${req.headers.get('origin')}/Community`,
                            related_entity_id: thread_id,
                            related_entity_type: 'ForumThread'
                        }
                    });
                    notificationsSent++;
                } catch (error) {
                    console.error(`Failed to send notification to member ${member.id}:`, error);
                }
            }
        }

        return Response.json({
            success: true,
            notifications_sent: notificationsSent
        });

    } catch (error) {
        console.error('Error notifying forum activity:', error);
        return Response.json({ 
            error: error.message || 'Failed to send notifications' 
        }, { status: 500 });
    }
});