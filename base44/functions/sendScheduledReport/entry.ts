import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { reportId } = await req.json();

    if (!reportId) {
      return Response.json({ error: 'Report ID is required' }, { status: 400 });
    }

    // Get the scheduled report
    const reports = await base44.entities.ScheduledReport.filter({ id: reportId });
    const report = reports[0];

    if (!report) {
      return Response.json({ error: 'Report not found' }, { status: 404 });
    }

    // Get association account
    const accounts = await base44.entities.AssociationAccount.list();
    const account = accounts.find(a => a.id === user.association_account_id);
    const orgName = account?.organization_name || 'Association';

    // Get financial data
    const [contributions, payouts, expenses, members] = await Promise.all([
      base44.entities.EventContribution.list(),
      base44.entities.Payout.list(),
      base44.entities.Expense.list(),
      base44.entities.Member.list()
    ]);

    // Calculate date range based on period_type
    const today = new Date();
    let startDate;
    let endDate;
    
    if (report.period_type === 'last_month') {
      startDate = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      endDate = new Date(today.getFullYear(), today.getMonth(), 0);
    } else if (report.period_type === 'last_quarter') {
      const quarterStart = Math.floor((today.getMonth() - 3) / 3) * 3;
      startDate = new Date(today.getFullYear(), quarterStart, 1);
      endDate = new Date(today.getFullYear(), quarterStart + 3, 0);
    } else if (report.period_type === 'year_to_date') {
      startDate = new Date(today.getFullYear(), 0, 1);
      endDate = today;
    } else if (report.period_type === 'custom') {
      startDate = report.custom_start_date ? new Date(report.custom_start_date) : new Date(today.getFullYear(), 0, 1);
      endDate = report.custom_end_date ? new Date(report.custom_end_date) : today;
    } else {
      startDate = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      endDate = new Date(today.getFullYear(), today.getMonth(), 0);
    }

    // Calculate financial metrics
    const periodContributions = contributions.filter(c => 
      c.status === 'Paid' && c.paid_at && 
      new Date(c.paid_at) >= startDate && new Date(c.paid_at) <= endDate
    );
    const totalRevenue = periodContributions.reduce((sum, c) => sum + (c.amount_paid || 0), 0);

    const periodPayouts = payouts.filter(p => 
      p.status === 'Disbursed' && p.paid_at &&
      new Date(p.paid_at) >= startDate && new Date(p.paid_at) <= endDate
    );
    const totalPayouts = periodPayouts.reduce((sum, p) => sum + p.amount, 0);

    const periodExpenses = expenses.filter(e => 
      e.expense_date && 
      new Date(e.expense_date) >= startDate && new Date(e.expense_date) <= endDate
    );
    const totalExpenses = periodExpenses.reduce((sum, e) => sum + e.amount, 0);

    const netIncome = totalRevenue - totalPayouts - totalExpenses;

    // Group expenses by category
    const expensesByCategory = {};
    periodExpenses.forEach(e => {
      if (!expensesByCategory[e.category]) {
        expensesByCategory[e.category] = 0;
      }
      expensesByCategory[e.category] += e.amount;
    });

    // Format currency
    const formatCurrency = (amt) => {
      return '$' + amt.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    };

    // Build report content based on type
    const periodLabel = startDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) + 
      ' - ' + endDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

    const reportTypeLabels = {
      profit_loss: 'Profit & Loss Statement',
      balance_sheet: 'Balance Sheet',
      cash_flow: 'Cash Flow Statement',
      expense_summary: 'Expense Summary',
      contribution_summary: 'Contribution Summary',
      full_financial: 'Full Financial Report'
    };

    const reportTitle = reportTypeLabels[report.report_type] || 'Financial Report';

    // Build expense rows
    const expenseRows = Object.entries(expensesByCategory)
      .sort(([,a], [,b]) => b - a)
      .map(([cat, amt]) => {
        const catLabel = cat.replace(/_/g, ' ');
        const pct = totalExpenses > 0 ? ((amt / totalExpenses) * 100).toFixed(1) : '0';
        return '<tr style="border-bottom: 1px solid #e5e7eb;"><td style="padding: 12px; text-transform: capitalize;">' + catLabel + '</td><td style="padding: 12px; text-align: right;">' + formatCurrency(amt) + '</td><td style="padding: 12px; text-align: right;">' + pct + '%</td></tr>';
      }).join('');

    const expenseRowsSimple = Object.entries(expensesByCategory)
      .sort(([,a], [,b]) => b - a)
      .map(([cat, amt]) => {
        const catLabel = cat.replace(/_/g, ' ');
        return '<tr style="border-bottom: 1px solid #f3f4f6;"><td style="padding: 8px 0; text-transform: capitalize;">' + catLabel + '</td><td style="text-align: right;">' + formatCurrency(amt) + '</td></tr>';
      }).join('');

    let reportContent = '';
    
    if (report.report_type === 'profit_loss') {
      const grossProfit = totalRevenue - totalPayouts;
      const grossProfitColor = grossProfit >= 0 ? '#059669' : '#dc2626';
      const netColor = netIncome >= 0 ? '#059669' : '#dc2626';
      const netBg = netIncome >= 0 ? '#d1fae5' : '#fee2e2';
      
      reportContent = '<h2 style="color: #1e40af; margin-bottom: 5px;">PROFIT & LOSS STATEMENT</h2>' +
        '<p style="color: #666; margin-top: 0;">For the period ' + periodLabel + '</p>' +
        '<h3 style="border-bottom: 2px solid #3b82f6; padding-bottom: 5px;">REVENUE</h3>' +
        '<table style="width: 100%; border-collapse: collapse;">' +
        '<tr><td style="padding: 8px 0;">Membership Contributions</td><td style="text-align: right;">' + formatCurrency(totalRevenue) + '</td></tr>' +
        '<tr style="font-weight: bold; background: #f3f4f6;"><td style="padding: 8px;">Total Revenue</td><td style="text-align: right; padding: 8px;">' + formatCurrency(totalRevenue) + '</td></tr>' +
        '</table>' +
        '<h3 style="border-bottom: 2px solid #f59e0b; padding-bottom: 5px; margin-top: 20px;">COST OF SERVICES</h3>' +
        '<table style="width: 100%; border-collapse: collapse;">' +
        '<tr><td style="padding: 8px 0;">Benefit Payouts</td><td style="text-align: right;">' + formatCurrency(totalPayouts) + '</td></tr>' +
        '<tr style="font-weight: bold; background: #f3f4f6;"><td style="padding: 8px;">Total Cost of Services</td><td style="text-align: right; padding: 8px;">' + formatCurrency(totalPayouts) + '</td></tr>' +
        '</table>' +
        '<div style="background: #dbeafe; padding: 15px; border-radius: 8px; margin: 20px 0;">' +
        '<strong>Gross Profit: </strong><span style="font-size: 1.2em; color: ' + grossProfitColor + ';">' + formatCurrency(grossProfit) + '</span>' +
        '</div>' +
        '<h3 style="border-bottom: 2px solid #ef4444; padding-bottom: 5px;">OPERATING EXPENSES</h3>' +
        '<table style="width: 100%; border-collapse: collapse;">' + expenseRowsSimple +
        '<tr style="font-weight: bold; background: #f3f4f6;"><td style="padding: 8px;">Total Operating Expenses</td><td style="text-align: right; padding: 8px;">' + formatCurrency(totalExpenses) + '</td></tr>' +
        '</table>' +
        '<div style="background: ' + netBg + '; padding: 20px; border-radius: 8px; margin-top: 20px; border: 2px solid ' + netColor + ';">' +
        '<strong style="font-size: 1.1em;">NET INCOME: </strong><span style="font-size: 1.4em; font-weight: bold; color: ' + netColor + ';">' + formatCurrency(netIncome) + '</span>' +
        '</div>';
    } else if (report.report_type === 'expense_summary') {
      reportContent = '<h2 style="color: #1e40af; margin-bottom: 5px;">EXPENSE SUMMARY</h2>' +
        '<p style="color: #666; margin-top: 0;">For the period ' + periodLabel + '</p>' +
        '<table style="width: 100%; border-collapse: collapse; margin-top: 20px;">' +
        '<tr style="background: #1e40af; color: white;"><th style="padding: 12px; text-align: left;">Category</th><th style="padding: 12px; text-align: right;">Amount</th><th style="padding: 12px; text-align: right;">% of Total</th></tr>' +
        expenseRows +
        '<tr style="background: #f3f4f6; font-weight: bold;"><td style="padding: 12px;">TOTAL</td><td style="padding: 12px; text-align: right;">' + formatCurrency(totalExpenses) + '</td><td style="padding: 12px; text-align: right;">100%</td></tr>' +
        '</table>';
    } else if (report.report_type === 'contribution_summary') {
      const activeMembers = members.filter(m => m.status === 'Active').length;
      const avgContribution = periodContributions.length > 0 ? totalRevenue / periodContributions.length : 0;
      
      reportContent = '<h2 style="color: #1e40af; margin-bottom: 5px;">CONTRIBUTION SUMMARY</h2>' +
        '<p style="color: #666; margin-top: 0;">For the period ' + periodLabel + '</p>' +
        '<div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px; margin: 20px 0;">' +
        '<div style="background: #d1fae5; padding: 20px; border-radius: 8px; text-align: center;"><p style="margin: 0; color: #065f46;">Total Collected</p><p style="margin: 5px 0 0; font-size: 1.8em; font-weight: bold; color: #059669;">' + formatCurrency(totalRevenue) + '</p></div>' +
        '<div style="background: #dbeafe; padding: 20px; border-radius: 8px; text-align: center;"><p style="margin: 0; color: #1e40af;">Contributions Received</p><p style="margin: 5px 0 0; font-size: 1.8em; font-weight: bold; color: #3b82f6;">' + periodContributions.length + '</p></div>' +
        '</div>' +
        '<p style="color: #666;">Active Members: ' + activeMembers + '</p>' +
        '<p style="color: #666;">Average Contribution: ' + formatCurrency(avgContribution) + '</p>';
    } else {
      // Full financial report
      const netColor = netIncome >= 0 ? '#059669' : '#dc2626';
      const netBg = netIncome >= 0 ? '#d1fae5' : '#fee2e2';
      const netTextColor = netIncome >= 0 ? '#065f46' : '#991b1b';
      
      reportContent = '<h2 style="color: #1e40af; margin-bottom: 5px;">FINANCIAL SUMMARY REPORT</h2>' +
        '<p style="color: #666; margin-top: 0;">For the period ' + periodLabel + '</p>' +
        '<div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px; margin: 20px 0;">' +
        '<div style="background: #d1fae5; padding: 15px; border-radius: 8px;"><p style="margin: 0; color: #065f46; font-size: 0.9em;">Total Revenue</p><p style="margin: 5px 0 0; font-size: 1.5em; font-weight: bold; color: #059669;">' + formatCurrency(totalRevenue) + '</p></div>' +
        '<div style="background: #fef3c7; padding: 15px; border-radius: 8px;"><p style="margin: 0; color: #92400e; font-size: 0.9em;">Benefit Payouts</p><p style="margin: 5px 0 0; font-size: 1.5em; font-weight: bold; color: #d97706;">' + formatCurrency(totalPayouts) + '</p></div>' +
        '<div style="background: #fee2e2; padding: 15px; border-radius: 8px;"><p style="margin: 0; color: #991b1b; font-size: 0.9em;">Operating Expenses</p><p style="margin: 5px 0 0; font-size: 1.5em; font-weight: bold; color: #dc2626;">' + formatCurrency(totalExpenses) + '</p></div>' +
        '<div style="background: ' + netBg + '; padding: 15px; border-radius: 8px;"><p style="margin: 0; color: ' + netTextColor + '; font-size: 0.9em;">Net Income</p><p style="margin: 5px 0 0; font-size: 1.5em; font-weight: bold; color: ' + netColor + ';">' + formatCurrency(netIncome) + '</p></div>' +
        '</div>' +
        '<h3 style="border-bottom: 1px solid #e5e7eb; padding-bottom: 5px; margin-top: 30px;">Expenses by Category</h3>' +
        '<table style="width: 100%; border-collapse: collapse;">' + expenseRowsSimple + '</table>';
    }

    // Build email body
    const generatedDate = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    
    const emailBody = '<!DOCTYPE html><html><head><meta charset="utf-8"><style>body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #1f2937; max-width: 700px; margin: 0 auto; padding: 20px; } h1 { color: #1e40af; }</style></head><body>' +
      '<div style="background: #1e40af; color: white; padding: 20px; border-radius: 8px 8px 0 0; margin-bottom: 0;">' +
      '<h1 style="margin: 0; color: white;">' + orgName + '</h1>' +
      '<p style="margin: 5px 0 0; opacity: 0.9;">' + reportTitle + '</p>' +
      '</div>' +
      '<div style="border: 1px solid #e5e7eb; border-top: none; padding: 20px; border-radius: 0 0 8px 8px;">' + reportContent + '</div>' +
      '<p style="color: #9ca3af; font-size: 0.85em; margin-top: 30px; text-align: center;">This is an automated report from Benefitly. Generated on ' + generatedDate + '.</p>' +
      '</body></html>';

    // Send to all recipients
    const sendPromises = report.recipients.map(email => 
      base44.integrations.Core.SendEmail({
        to: email,
        subject: '[' + orgName + '] ' + reportTitle + ' - ' + periodLabel,
        body: emailBody
      })
    );

    await Promise.all(sendPromises);

    // Update last run date and calculate next run
    const nextRunDate = new Date();
    if (report.frequency === 'daily') {
      nextRunDate.setDate(nextRunDate.getDate() + 1);
    } else if (report.frequency === 'weekly') {
      nextRunDate.setDate(nextRunDate.getDate() + 7);
    } else if (report.frequency === 'monthly') {
      nextRunDate.setMonth(nextRunDate.getMonth() + 1);
    } else if (report.frequency === 'quarterly') {
      nextRunDate.setMonth(nextRunDate.getMonth() + 3);
    }

    await base44.entities.ScheduledReport.update(report.id, {
      last_run_date: new Date().toISOString(),
      next_run_date: nextRunDate.toISOString().split('T')[0]
    });

    return Response.json({ 
      success: true, 
      message: 'Report sent to ' + report.recipients.length + ' recipient(s)' 
    });

  } catch (error) {
    console.error('Send scheduled report error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});