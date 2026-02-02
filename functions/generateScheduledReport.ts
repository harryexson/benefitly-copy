import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * Generates and sends a scheduled report based on configuration
 * This function is called by scheduled tasks or manually by finance team members
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    const currentUser = await base44.auth.me();
    if (!currentUser || !currentUser.association_account_id) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check permissions
    if (!currentUser.permissions?.can_generate_financial_reports && 
        currentUser.association_role !== 'Administrator') {
      return Response.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const { scheduled_report_id } = await req.json();

    if (!scheduled_report_id) {
      return Response.json({ error: 'Missing scheduled_report_id' }, { status: 400 });
    }

    // Get the scheduled report configuration
    const scheduledReport = await base44.asServiceRole.entities.ScheduledReport.get(scheduled_report_id);
    if (!scheduledReport) {
      return Response.json({ error: 'Scheduled report not found' }, { status: 404 });
    }

    // Fetch necessary data based on report type
    const [members, contributions, payouts, events, account] = await Promise.all([
      base44.asServiceRole.entities.Member.list(),
      base44.asServiceRole.entities.EventContribution.list(),
      base44.asServiceRole.entities.Payout.list(),
      base44.asServiceRole.entities.Event.list(),
      base44.asServiceRole.entities.AssociationAccount.get(currentUser.association_account_id)
    ]);

    // Determine date range
    const today = new Date();
    let startDate, endDate;
    
    if (scheduledReport.date_range === 'year-to-date') {
      startDate = new Date(today.getFullYear(), 0, 1);
      endDate = today;
    } else if (scheduledReport.date_range === 'last-month') {
      startDate = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      endDate = new Date(today.getFullYear(), today.getMonth(), 0);
    } else if (scheduledReport.date_range === 'last-quarter') {
      const quarter = Math.floor(today.getMonth() / 3);
      startDate = new Date(today.getFullYear(), (quarter - 1) * 3, 1);
      endDate = new Date(today.getFullYear(), quarter * 3, 0);
    } else if (scheduledReport.date_range === 'last-year') {
      startDate = new Date(today.getFullYear() - 1, 0, 1);
      endDate = new Date(today.getFullYear() - 1, 11, 31);
    } else if (scheduledReport.date_range === 'custom' && scheduledReport.custom_start_date && scheduledReport.custom_end_date) {
      startDate = new Date(scheduledReport.custom_start_date);
      endDate = new Date(scheduledReport.custom_end_date);
    } else {
      startDate = new Date(today.getFullYear(), today.getMonth(), 1);
      endDate = today;
    }

    // Build report data based on target audience
    let emailRecipients = [];
    let reportHTML = '';

    if (scheduledReport.target_audience === 'All Members') {
      // Generate individual reports for each member
      emailRecipients = members.filter(m => m.status === 'Active' && m.email).map(m => m.email);
      
      // For "All Members", send individual statements
      for (const member of members.filter(m => m.status === 'Active' && m.email)) {
        const memberContributions = contributions.filter(c => 
          c.member_id === member.id &&
          c.paid_at && 
          new Date(c.paid_at) >= startDate && 
          new Date(c.paid_at) <= endDate
        );

        const memberPayouts = payouts.filter(p =>
          p.payee_member_id === member.id &&
          p.paid_at &&
          new Date(p.paid_at) >= startDate &&
          new Date(p.paid_at) <= endDate
        );

        const totalContributions = memberContributions.reduce((sum, c) => sum + (c.amount_paid || 0), 0);
        const totalBenefits = memberPayouts.reduce((sum, p) => sum + p.amount, 0);

        reportHTML = `
          <h2>${account.organization_name} - Member Statement</h2>
          <h3>${member.first_name} ${member.last_name}</h3>
          <p><strong>Member #:</strong> ${member.member_number}</p>
          <p><strong>Period:</strong> ${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()}</p>
          <hr>
          <h3>Contributions</h3>
          <p><strong>Total Paid:</strong> $${totalContributions.toFixed(2)}</p>
          <table border="1" cellpadding="5" style="border-collapse: collapse; width: 100%;">
            <thead>
              <tr>
                <th>Date</th>
                <th>Event</th>
                <th>Amount</th>
              </tr>
            </thead>
            <tbody>
              ${memberContributions.map(c => {
                const event = events.find(e => e.id === c.event_id);
                return `<tr>
                  <td>${new Date(c.paid_at).toLocaleDateString()}</td>
                  <td>${event?.title || 'N/A'}</td>
                  <td>$${(c.amount_paid || 0).toFixed(2)}</td>
                </tr>`;
              }).join('')}
            </tbody>
          </table>
          ${scheduledReport.include_data.benefits_received ? `
            <h3>Benefits Received</h3>
            <p><strong>Total Benefits:</strong> $${totalBenefits.toFixed(2)}</p>
            <table border="1" cellpadding="5" style="border-collapse: collapse; width: 100%;">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Event</th>
                  <th>Amount</th>
                </tr>
              </thead>
              <tbody>
                ${memberPayouts.map(p => {
                  const event = events.find(e => e.id === p.event_id);
                  return `<tr>
                    <td>${new Date(p.paid_at).toLocaleDateString()}</td>
                    <td>${event?.title || 'N/A'}</td>
                    <td>$${p.amount.toFixed(2)}</td>
                  </tr>`;
                }).join('')}
              </tbody>
            </table>
          ` : ''}
          <hr>
          <p style="font-size: 12px; color: gray;">
            This is an automated report from ${account.organization_name}. 
            If you have any questions, please contact your association administrator.
          </p>
        `;

        // Send individual email
        await base44.asServiceRole.integrations.Core.SendEmail({
          to: member.email,
          subject: scheduledReport.email_subject || `Your ${account.organization_name} Statement - ${endDate.toLocaleDateString()}`,
          body: (scheduledReport.email_message ? `<p>${scheduledReport.email_message}</p><hr>` : '') + reportHTML
        });
      }

    } else if (scheduledReport.target_audience === 'Custom List' && scheduledReport.distribution_list) {
      emailRecipients = scheduledReport.distribution_list;
      
      // Generate summary report for custom list
      const totalRevenue = contributions
        .filter(c => c.status === 'Paid' && c.paid_at && new Date(c.paid_at) >= startDate && new Date(c.paid_at) <= endDate)
        .reduce((sum, c) => sum + (c.amount_paid || 0), 0);
      
      const totalPayouts = payouts
        .filter(p => p.status === 'Disbursed' && p.paid_at && new Date(p.paid_at) >= startDate && new Date(p.paid_at) <= endDate)
        .reduce((sum, p) => sum + p.amount, 0);

      reportHTML = `
        <h2>${account.organization_name} - ${scheduledReport.report_name}</h2>
        <p><strong>Period:</strong> ${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()}</p>
        <hr>
        <h3>Financial Summary</h3>
        <p><strong>Total Revenue:</strong> $${totalRevenue.toFixed(2)}</p>
        <p><strong>Total Payouts:</strong> $${totalPayouts.toFixed(2)}</p>
        <p><strong>Net Income:</strong> $${(totalRevenue - totalPayouts).toFixed(2)}</p>
        <hr>
        <p style="font-size: 12px; color: gray;">
          This is an automated report from ${account.organization_name}.
        </p>
      `;

      // Send to distribution list
      for (const email of emailRecipients) {
        await base44.asServiceRole.integrations.Core.SendEmail({
          to: email,
          subject: scheduledReport.email_subject || `${account.organization_name} - ${scheduledReport.report_name}`,
          body: (scheduledReport.email_message ? `<p>${scheduledReport.email_message}</p><hr>` : '') + reportHTML
        });
      }
    }

    // Update last run date
    await base44.asServiceRole.entities.ScheduledReport.update(scheduled_report_id, {
      last_run_date: new Date().toISOString()
    });

    return Response.json({ 
      success: true,
      recipients_count: emailRecipients.length,
      message: 'Report generated and sent successfully'
    });

  } catch (error) {
    console.error('Error generating scheduled report:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});