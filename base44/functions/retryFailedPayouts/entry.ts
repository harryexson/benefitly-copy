import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * Automated retry system for failed payouts.
 * 
 * This function runs periodically to:
 * 1. Find failed payouts that haven't exceeded retry limits
 * 2. Check if enough time has passed since last retry (exponential backoff)
 * 3. Attempt to retry the payout
 * 4. Notify admins if max retries reached
 * 
 * Retry schedule:
 * - Attempt 1: Immediate (when first failed)
 * - Attempt 2: After 30 minutes
 * - Attempt 3: After 2 hours
 * - Attempt 4: After 6 hours
 * Max retries: 3 automatic attempts
 */

const MAX_RETRY_ATTEMPTS = 3;

// Exponential backoff: 30 min, 2 hours, 6 hours
const RETRY_DELAYS_MS = [
    30 * 60 * 1000,      // 30 minutes
    2 * 60 * 60 * 1000,  // 2 hours
    6 * 60 * 60 * 1000,  // 6 hours
];

function getRetryDelay(retryCount) {
    if (retryCount >= RETRY_DELAYS_MS.length) {
        return RETRY_DELAYS_MS[RETRY_DELAYS_MS.length - 1];
    }
    return RETRY_DELAYS_MS[retryCount];
}

function isRetryableError(errorCode) {
    // Only retry temporary/transient errors
    const retryableErrors = [
        'insufficient_funds',
        'processing_error',
        'rate_limit',
        'temporary_error',
        'api_error',
    ];
    return retryableErrors.includes(errorCode);
}

async function notifyAdminMaxRetriesExceeded(base44, associationAccountId, payout, member) {
    try {
        const adminUsers = await base44.asServiceRole.entities.User.filter({
            association_account_id: associationAccountId,
            association_role: 'Administrator'
        });

        for (const admin of adminUsers) {
            await base44.asServiceRole.integrations.Core.SendEmail({
                from_name: 'Benefitly System',
                to: admin.email,
                subject: `⚠️ Payout Failed After ${MAX_RETRY_ATTEMPTS} Attempts - Manual Review Required`,
                body: `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
    <h2 style="color: #DC2626;">Payout Requires Manual Review</h2>
    <div style="background-color: #FEF2F2; border: 1px solid #FECACA; border-radius: 8px; padding: 16px; margin: 20px 0;">
        <p style="margin: 0; color: #991B1B;">This payout has failed <strong>${MAX_RETRY_ATTEMPTS} times</strong> and requires manual intervention.</p>
    </div>
    <div style="background-color: #F3F4F6; border-radius: 8px; padding: 16px; margin: 20px 0;">
        <table style="width: 100%;">
            <tr><td style="padding: 8px 0; color: #6B7280;">Recipient:</td><td style="font-weight: bold;">${member.first_name} ${member.last_name}</td></tr>
            <tr><td style="padding: 8px 0; color: #6B7280;">Amount:</td><td style="font-weight: bold;">$${payout.amount.toFixed(2)}</td></tr>
            <tr><td style="padding: 8px 0; color: #6B7280;">Error:</td><td style="color: #DC2626;">${payout.failure_reason || 'Unknown error'}</td></tr>
            <tr><td style="padding: 8px 0; color: #6B7280;">Attempts:</td><td>${payout.retry_count}</td></tr>
        </table>
    </div>
    <p>Please review the payout details and contact the member if necessary.</p>
</div>`
            });
        }
    } catch (e) {
        console.error('Failed to notify admins:', e);
    }
}

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);

        // This is an admin-only function - verify authentication
        const user = await base44.auth.me();
        if (!user || user.association_role !== 'Administrator') {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        console.log('=== Starting Automated Payout Retry Process ===');

        // Find all failed payouts that might be eligible for retry
        const failedPayouts = await base44.asServiceRole.entities.Payout.filter({
            status: 'Failed'
        });

        console.log(`Found ${failedPayouts.length} failed payouts`);

        const results = {
            total_checked: failedPayouts.length,
            retried: 0,
            skipped_max_retries: 0,
            skipped_not_ready: 0,
            skipped_non_retryable: 0,
            succeeded: 0,
            failed: 0,
            max_retries_notifications_sent: 0
        };

        for (const payout of failedPayouts) {
            const retryCount = payout.retry_count || 0;

            // Skip if max retries exceeded
            if (retryCount >= MAX_RETRY_ATTEMPTS) {
                results.skipped_max_retries++;
                
                // Send one-time notification if not already sent
                if (!payout.notification_sent) {
                    const member = await base44.asServiceRole.entities.Member.get(payout.payee_member_id);
                    const memberAccount = await base44.asServiceRole.entities.Member.get(payout.payee_member_id);
                    const associationAccountId = user.association_account_id;
                    
                    await notifyAdminMaxRetriesExceeded(base44, associationAccountId, payout, member);
                    
                    await base44.asServiceRole.entities.Payout.update(payout.id, {
                        notification_sent: true
                    });
                    
                    results.max_retries_notifications_sent++;
                }
                continue;
            }

            // Check if error is retryable
            if (payout.stripe_error_code && !isRetryableError(payout.stripe_error_code)) {
                results.skipped_non_retryable++;
                continue;
            }

            // Check if enough time has passed since last retry (exponential backoff)
            if (payout.last_retry_at) {
                const timeSinceLastRetry = Date.now() - new Date(payout.last_retry_at).getTime();
                const requiredDelay = getRetryDelay(retryCount);
                
                if (timeSinceLastRetry < requiredDelay) {
                    results.skipped_not_ready++;
                    continue;
                }
            }

            // Attempt retry
            console.log(`Retrying payout ${payout.id} (attempt ${retryCount + 1}/${MAX_RETRY_ATTEMPTS})`);
            
            try {
                // Update retry count and timestamp before attempting
                await base44.asServiceRole.entities.Payout.update(payout.id, {
                    retry_count: retryCount + 1,
                    last_retry_at: new Date().toISOString(),
                    status: 'Approved' // Reset to Approved so processPayoutToMember can pick it up
                });

                // Call the payout processing function
                const response = await base44.functions.invoke('processPayoutToMember', {
                    payout_id: payout.id,
                    payout_method: payout.payout_speed || 'standard'
                });

                if (response.data.success) {
                    results.succeeded++;
                    console.log(`✓ Payout ${payout.id} retry succeeded`);
                } else {
                    results.failed++;
                    console.log(`✗ Payout ${payout.id} retry failed: ${response.data.error}`);
                }

                results.retried++;

            } catch (error) {
                console.error(`Error retrying payout ${payout.id}:`, error);
                results.failed++;
                results.retried++;
            }
        }

        console.log('=== Retry Process Complete ===');
        console.log('Results:', results);

        return Response.json({
            success: true,
            message: `Processed ${results.total_checked} failed payouts`,
            results
        });

    } catch (error) {
        console.error('Retry process error:', error);
        return Response.json({ 
            error: error.message || 'Failed to process retries' 
        }, { status: 500 });
    }
});