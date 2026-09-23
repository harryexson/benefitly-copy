import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Download, TrendingUp, TrendingDown } from 'lucide-react';
import { format, startOfMonth, endOfMonth, startOfQuarter, endOfQuarter, startOfYear, subMonths } from 'date-fns';

const EXPENSE_CATEGORY_LABELS = {
  operational: 'Operational',
  administrative: 'Administrative',
  legal: 'Legal & Compliance',
  marketing: 'Marketing',
  technology: 'Technology',
  payroll: 'Payroll',
  rent_utilities: 'Rent & Utilities',
  insurance: 'Insurance',
  professional_services: 'Professional Services',
  travel: 'Travel',
  supplies: 'Supplies',
  events: 'Events',
  other: 'Other'
};

export default function FinancialStatements({ 
  contributions = [], 
  payouts = [], 
  expenses = [], 
  members = [],
  events = [],
  period = 'yearToDate',
  customStartDate,
  customEndDate,
  onExport 
}) {
  const [activeStatement, setActiveStatement] = useState('pl');
  const [comparisonPeriod, setComparisonPeriod] = useState('previous');

  // Calculate date ranges
  const getDateRange = (periodType) => {
    const today = new Date();
    switch (periodType) {
      case 'lastMonth':
        return { start: startOfMonth(subMonths(today, 1)), end: endOfMonth(subMonths(today, 1)) };
      case 'lastQuarter':
        const lastQuarterStart = startOfQuarter(subMonths(today, 3));
        return { start: lastQuarterStart, end: endOfQuarter(lastQuarterStart) };
      case 'yearToDate':
        return { start: startOfYear(today), end: today };
      case 'custom':
        return { 
          start: customStartDate ? new Date(customStartDate) : startOfYear(today), 
          end: customEndDate ? new Date(customEndDate) : today 
        };
      default:
        return { start: startOfYear(today), end: today };
    }
  };

  const { start: periodStart, end: periodEnd } = getDateRange(period);

  // Calculate P&L data
  const plData = useMemo(() => {
    // Revenue
    const totalContributions = contributions
      .filter(c => c.status === 'Paid' && c.paid_at && 
        new Date(c.paid_at) >= periodStart && new Date(c.paid_at) <= periodEnd)
      .reduce((sum, c) => sum + (c.amount_paid || 0), 0);

    const membershipDues = totalContributions; // Can be broken down if needed
    const eventRevenue = 0; // Ticket sales if applicable
    const otherIncome = 0;
    const totalRevenue = membershipDues + eventRevenue + otherIncome;

    // Expenses by category
    const periodExpenses = expenses.filter(e => 
      e.expense_date && new Date(e.expense_date) >= periodStart && new Date(e.expense_date) <= periodEnd
    );

    const expensesByCategory = {};
    Object.keys(EXPENSE_CATEGORY_LABELS).forEach(cat => {
      expensesByCategory[cat] = periodExpenses
        .filter(e => e.category === cat)
        .reduce((sum, e) => sum + e.amount, 0);
    });

    const totalExpenses = Object.values(expensesByCategory).reduce((sum, val) => sum + val, 0);

    // Benefit payouts (separate from operating expenses)
    const totalPayouts = payouts
      .filter(p => p.status === 'Disbursed' && p.paid_at &&
        new Date(p.paid_at) >= periodStart && new Date(p.paid_at) <= periodEnd)
      .reduce((sum, p) => sum + p.amount, 0);

    const grossProfit = totalRevenue - totalPayouts;
    const operatingIncome = grossProfit - totalExpenses;
    const netIncome = operatingIncome;

    return {
      revenue: {
        membershipDues,
        eventRevenue,
        otherIncome,
        total: totalRevenue
      },
      costOfServices: {
        benefitPayouts: totalPayouts,
        total: totalPayouts
      },
      grossProfit,
      operatingExpenses: expensesByCategory,
      totalOperatingExpenses: totalExpenses,
      operatingIncome,
      netIncome
    };
  }, [contributions, payouts, expenses, periodStart, periodEnd]);

  // Calculate Balance Sheet data
  const balanceSheetData = useMemo(() => {
    // Assets
    const cashOnHand = contributions
      .filter(c => c.status === 'Paid')
      .reduce((sum, c) => sum + (c.amount_paid || 0), 0) - 
      payouts.filter(p => p.status === 'Disbursed').reduce((sum, p) => sum + p.amount, 0) -
      expenses.reduce((sum, e) => sum + e.amount, 0);

    const accountsReceivable = contributions
      .filter(c => c.status === 'Due' || c.status === 'Past Due')
      .reduce((sum, c) => sum + c.amount_due, 0);

    const totalCurrentAssets = cashOnHand + accountsReceivable;
    const totalAssets = totalCurrentAssets;

    // Liabilities
    const pendingPayouts = payouts
      .filter(p => p.status === 'Pending Approval' || p.status === 'Approved')
      .reduce((sum, p) => sum + p.amount, 0);

    const accountsPayable = expenses
      .filter(e => e.status === 'pending')
      .reduce((sum, e) => sum + e.amount, 0);

    const totalCurrentLiabilities = pendingPayouts + accountsPayable;
    const totalLiabilities = totalCurrentLiabilities;

    // Equity
    const retainedEarnings = totalAssets - totalLiabilities;
    const totalEquity = retainedEarnings;

    return {
      assets: {
        current: {
          cashOnHand,
          accountsReceivable,
          total: totalCurrentAssets
        },
        total: totalAssets
      },
      liabilities: {
        current: {
          pendingPayouts,
          accountsPayable,
          total: totalCurrentLiabilities
        },
        total: totalLiabilities
      },
      equity: {
        retainedEarnings,
        total: totalEquity
      }
    };
  }, [contributions, payouts, expenses]);

  // Format currency
  const formatCurrency = (amount) => {
    const isNegative = amount < 0;
    const formatted = `$${Math.abs(amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    return isNegative ? `(${formatted})` : formatted;
  };

  // Line item component
  const LineItem = ({ label, amount, indent = 0, bold = false, highlight = false }) => (
    <div className={`flex justify-between py-1.5 ${bold ? 'font-semibold' : ''} ${highlight ? 'bg-gray-50 px-2 rounded' : ''}`}
      style={{ paddingLeft: `${indent * 20}px` }}>
      <span className={`${indent > 0 ? 'text-gray-600' : ''}`}>{label}</span>
      <span className={amount < 0 ? 'text-red-600' : ''}>{formatCurrency(amount)}</span>
    </div>
  );

  const SectionHeader = ({ title }) => (
    <div className="font-bold text-sm uppercase text-gray-500 mt-4 mb-2 border-b pb-1">{title}</div>
  );

  const SectionTotal = ({ label, amount, isGrand = false }) => (
    <div className={`flex justify-between py-2 ${isGrand ? 'border-t-2 border-b-2 border-gray-800 font-bold text-lg mt-2' : 'border-t border-gray-300 font-semibold'}`}>
      <span>{label}</span>
      <span className={amount < 0 ? 'text-red-600' : ''}>{formatCurrency(amount)}</span>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Statement Selector */}
      <div className="flex items-center justify-between">
        <Tabs value={activeStatement} onValueChange={setActiveStatement}>
          <TabsList>
            <TabsTrigger value="pl">Profit & Loss</TabsTrigger>
            <TabsTrigger value="balance">Balance Sheet</TabsTrigger>
            <TabsTrigger value="expenses">Expense Analysis</TabsTrigger>
          </TabsList>
        </Tabs>

        <Button variant="outline" size="sm" onClick={() => onExport && onExport(activeStatement)}>
          <Download className="w-4 h-4 mr-2" />
          Export
        </Button>
      </div>

      {/* Profit & Loss Statement */}
      {activeStatement === 'pl' && (
        <Card>
          <CardHeader className="text-center border-b">
            <CardTitle>Statement of Activities (Profit & Loss)</CardTitle>
            <CardDescription>
              For the period {format(periodStart, 'MMMM d, yyyy')} to {format(periodEnd, 'MMMM d, yyyy')}
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6 max-w-2xl mx-auto">
            <SectionHeader title="Revenue" />
            <LineItem label="Membership Contributions" amount={plData.revenue.membershipDues} indent={1} />
            <LineItem label="Event Revenue" amount={plData.revenue.eventRevenue} indent={1} />
            <LineItem label="Other Income" amount={plData.revenue.otherIncome} indent={1} />
            <SectionTotal label="Total Revenue" amount={plData.revenue.total} />

            <SectionHeader title="Cost of Services" />
            <LineItem label="Benefit Payouts to Members" amount={plData.costOfServices.benefitPayouts} indent={1} />
            <SectionTotal label="Total Cost of Services" amount={plData.costOfServices.total} />

            <div className="my-4 p-3 bg-blue-50 rounded-lg">
              <div className="flex justify-between font-semibold">
                <span>Gross Profit</span>
                <span className={plData.grossProfit < 0 ? 'text-red-600' : 'text-green-600'}>
                  {formatCurrency(plData.grossProfit)}
                </span>
              </div>
            </div>

            <SectionHeader title="Operating Expenses" />
            {Object.entries(plData.operatingExpenses).map(([category, amount]) => (
              amount > 0 && (
                <LineItem 
                  key={category} 
                  label={EXPENSE_CATEGORY_LABELS[category]} 
                  amount={amount} 
                  indent={1} 
                />
              )
            ))}
            <SectionTotal label="Total Operating Expenses" amount={plData.totalOperatingExpenses} />

            <div className="my-4 p-3 bg-gray-100 rounded-lg">
              <div className="flex justify-between font-semibold">
                <span>Operating Income</span>
                <span className={plData.operatingIncome < 0 ? 'text-red-600' : 'text-green-600'}>
                  {formatCurrency(plData.operatingIncome)}
                </span>
              </div>
            </div>

            <SectionTotal label="Net Income" amount={plData.netIncome} isGrand />

            {plData.netIncome >= 0 ? (
              <div className="flex items-center gap-2 mt-4 text-green-600">
                <TrendingUp className="w-5 h-5" />
                <span className="text-sm">Positive net income for the period</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 mt-4 text-red-600">
                <TrendingDown className="w-5 h-5" />
                <span className="text-sm">Net loss for the period</span>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Balance Sheet */}
      {activeStatement === 'balance' && (
        <Card>
          <CardHeader className="text-center border-b">
            <CardTitle>Statement of Financial Position (Balance Sheet)</CardTitle>
            <CardDescription>
              As of {format(periodEnd, 'MMMM d, yyyy')}
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6 max-w-2xl mx-auto">
            <SectionHeader title="Assets" />
            <div className="text-sm font-medium text-gray-500 mt-2">Current Assets</div>
            <LineItem label="Cash & Cash Equivalents" amount={balanceSheetData.assets.current.cashOnHand} indent={1} />
            <LineItem label="Accounts Receivable (Pending Contributions)" amount={balanceSheetData.assets.current.accountsReceivable} indent={1} />
            <SectionTotal label="Total Current Assets" amount={balanceSheetData.assets.current.total} />
            <SectionTotal label="TOTAL ASSETS" amount={balanceSheetData.assets.total} isGrand />

            <SectionHeader title="Liabilities" />
            <div className="text-sm font-medium text-gray-500 mt-2">Current Liabilities</div>
            <LineItem label="Pending Benefit Payouts" amount={balanceSheetData.liabilities.current.pendingPayouts} indent={1} />
            <LineItem label="Accounts Payable" amount={balanceSheetData.liabilities.current.accountsPayable} indent={1} />
            <SectionTotal label="Total Current Liabilities" amount={balanceSheetData.liabilities.current.total} />
            <SectionTotal label="TOTAL LIABILITIES" amount={balanceSheetData.liabilities.total} />

            <SectionHeader title="Equity" />
            <LineItem label="Retained Earnings / Fund Balance" amount={balanceSheetData.equity.retainedEarnings} indent={1} />
            <SectionTotal label="TOTAL EQUITY" amount={balanceSheetData.equity.total} />

            <div className="mt-6 p-4 bg-gray-50 rounded-lg">
              <div className="flex justify-between font-bold text-lg">
                <span>TOTAL LIABILITIES & EQUITY</span>
                <span>{formatCurrency(balanceSheetData.liabilities.total + balanceSheetData.equity.total)}</span>
              </div>
              <p className="text-xs text-gray-500 mt-2 text-center">
                Assets = Liabilities + Equity: {formatCurrency(balanceSheetData.assets.total)} = {formatCurrency(balanceSheetData.liabilities.total + balanceSheetData.equity.total)}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Expense Analysis */}
      {activeStatement === 'expenses' && (
        <Card>
          <CardHeader>
            <CardTitle>Expense Analysis by Category</CardTitle>
            <CardDescription>
              {format(periodStart, 'MMMM d, yyyy')} to {format(periodEnd, 'MMMM d, yyyy')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Object.entries(plData.operatingExpenses)
                .filter(([_, amount]) => amount > 0)
                .sort(([_, a], [__, b]) => b - a)
                .map(([category, amount]) => {
                  const percentage = plData.totalOperatingExpenses > 0 
                    ? (amount / plData.totalOperatingExpenses) * 100 
                    : 0;
                  
                  return (
                    <div key={category} className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="font-medium">{EXPENSE_CATEGORY_LABELS[category]}</span>
                        <div className="flex items-center gap-3">
                          <Badge variant="outline">{percentage.toFixed(1)}%</Badge>
                          <span className="font-semibold w-28 text-right">{formatCurrency(amount)}</span>
                        </div>
                      </div>
                      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-blue-500 rounded-full transition-all"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  );
                })}

              {plData.totalOperatingExpenses === 0 && (
                <p className="text-center text-gray-500 py-8">No expenses recorded for this period</p>
              )}

              <div className="border-t pt-4 mt-6">
                <div className="flex justify-between font-bold text-lg">
                  <span>Total Expenses</span>
                  <span>{formatCurrency(plData.totalOperatingExpenses)}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}