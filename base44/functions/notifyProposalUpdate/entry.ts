import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

/**
 * Notify members about proposal status updates.
 * Called when a proposal status changes (e.g., opened for voting, approved, etc.)
 */

Deno.serve(async (req) => {
    const base44 = createClientFromRequest(req);
    
    try {
        const { proposal_id, status_change } = await req.json();

        if (!proposal_id) {
            return Response.json({ error: 'Missing proposal_id' }, { status: 400 });
        }

        // Get proposal details
        const proposals = await base44.asServiceRole.entities.Proposal.filter({ id: proposal_id });
        if (proposals.length === 0) {
            return Response.json({ error: 'Proposal not found' }, { status: 404 });
        }
        const proposal = proposals[0];

        // Only notify for significant status changes
        const notifiableStatuses = ['Open for Voting', 'Approved', 'Rejected', 'Implemented'];
        if (!notifiableStatuses.includes(proposal.status) && !status_change) {
            return Response.json({ 
                success: true, 
                message: 'Status not notifiable',
                notifications_sent: 0 
            });
        }

        // Get all active members with proposal notifications enabled
        const allMembers = await base44.asServiceRole.entities.Member.filter({ 
            status: 'Active' 
        });

        let notificationsSent = 0;

        for (const member of allMembers) {
            // Check notification preferences
            const prefs = await base44.asServiceRole.entities.NotificationPreference.filter({ 
                member_id: member.id 
            });

            const memberPrefs = prefs.length > 0 ? prefs[0] : { email_proposal_updates: true };

            if (memberPrefs.email_proposal_updates) {
                try {
                    await base44.asServiceRole.functions.invoke('sendTemplatedEmail', {
                        member_id: member.id,
                        template_type: 'proposal_update',
                        variables: {
                            member_name: `${member.first_name} ${member.last_name}`,
                            member_first_name: member.first_name,
                            proposal_title: proposal.title,
                            proposal_status: proposal.status,
                            proposal_link: `${req.headers.get('origin')}/Proposals`,
                            action_required: proposal.status === 'Open for Voting' ? 'Please cast your vote' : '',
                            related_entity_id: proposal_id,
                            related_entity_type: 'Proposal'
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
            notifications_sent: notificationsSent,
            proposal_status: proposal.status
        });

    } catch (error) {
        console.error('Error notifying proposal update:', error);
        return Response.json({ 
            error: error.message || 'Failed to send notifications' 
        }, { status: 500 });
    }
});