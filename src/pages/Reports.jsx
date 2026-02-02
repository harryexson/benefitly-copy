import React, { useState, useEffect, useCallback } from 'react';
import { Member, Event, EventContribution, Payout, Expense, User, AssociationAccount } from '@/entities/all';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, Users, 
  DollarSign, FileText, BarChart3,
  Settings2, Plus, Save, RotateCcw, Eye, Wallet, Target, Activity
} from 'lucide-react';
import { format, subDays, subMonths, endOfMonth, eachMonthOfInterval, startOfYear } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { base44 } from '@/api/base44Client';

// Components
import InteractiveChart from '../components/reports/InteractiveChart';
import KPIWidget from '../components/reports/KPIWidget';
import WidgetSelector from '../components/reports/WidgetSelector';
import DrillDownModal from '../components/reports/DrillDownModal';
import PredictiveAnalyticsPanel from '../components/reports/PredictiveAnalyticsPanel';
import FinancialStatements from '../components/reports/FinancialStatements';
import ScheduledReportsManager from '../components/reports/ScheduledReportsManager';
import AdminReportsDashboard from '../components/reports/AdminReportsDashboard';

const TIME_PERIODS = [
  { value: 'last30', label: 'Last 30 Days' },
  { value: 'last90', label: 'Last 90 Days' },
  { value: 'last6months', label: 'Last 6 Months' },
  { value: 'last12months', label: 'Last 12 Months' },
  { value: 'yearToDate', label: 'Year to Date' },
  { value: 'custom', label: 'Custom Range' }
];

const DEFAULT_WIDGETS = [
  { id: 'membership_growth', visible: true, size: 'normal' },
  { id: 'revenue_chart', visible: true, size: 'normal' },
  { id: 'payout_chart', visible: true, size: 'normal' },
  { id: 'contribution_chart', visible: true, size: 'normal' },
];

const SAVED_VIEWS_KEY = 'benefitly_dashboard_views';

export default function Reports() {
  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState('last90');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  
  // Data states
  const [members, setMembers] = useState([]);
  const [events, setEvents] = useState([]);
  const [contributions, setContributions] = useState([]);
  const [payouts, setPayouts] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [associationAccount, setAssociationAccount] = useState(null);

  // Dashboard customization
  const [widgets, setWidgets] = useState(DEFAULT_WIDGETS);
  const [isCustomizing, setIsCustomizing] = useState(false);
  const [showWidgetSelector, setShowWidgetSelector] = useState(false);
  const [savedViews, setSavedViews] = useState([]);
  const [currentViewName, setCurrentViewName] = useState('Default');

  // Drill-down modal
  const [drillDownModal, setDrillDownModal] = useState({
    isOpen: false,
    title: '',
    description: '',
    data: [],
    columns: [],
    filters: []
  });

  // Calculated metrics
  const [reportData, setReportData] = useState({
    summary: {},
    membershipGrowth: [],
    revenueAnalysis: [],
    payoutAnalysis: [],
    contributionAnalysis: [],
    expenseAnalysis: [],
    predictiveMetrics: {}
  });

  // Load saved views from localStorage
  useEffect(() => {
    const saved = localStorage.getItem(SAVED_VIEWS_KEY);
    if (saved) {
      setSavedViews(JSON.parse(saved));
    }
  }, []);

  useEffect(() => {
    loadReportData();
  }, [selectedPeriod, customStartDate, customEndDate]);

  const getDateRange = useCallback(() => {
    const today = new Date();
    let startDate, endDate;

    switch (selectedPeriod) {
      case 'last30':
        startDate = subDays(today, 29);
        endDate = today;
        break;
      case 'last90':
        startDate = subDays(today, 89);
        endDate = today;
        break;
      case 'last6months':
        startDate = subMonths(today, 6);
        endDate = today;
        break;
      case 'last12months':
        startDate = subMonths(today, 12);
        endDate = today;
        break;
      case 'yearToDate':
        startDate = startOfYear(today);
        endDate = today;
        break;
      case 'custom':
        startDate = customStartDate ? new Date(customStartDate) : subDays(today, 89);
        endDate = customEndDate ? new Date(customEndDate) : today;
        break;
      default:
        startDate = subDays(today, 89);
        endDate = today;
    }

    return { startDate, endDate };
  }, [selectedPeriod, customStartDate, customEndDate]);

  const loadReportData = async () => {
    try {
      setIsLoading(true);
      const currentUser = await User.me();
      
      const [memberList, eventList, contributionList, payoutList, expenseList, accountList] = await Promise.all([
        Member.list(),
        Event.list(),
        EventContribution.list(),
        Payout.list(),
        Expense.list(),
        AssociationAccount.list()
      ]);

      setMembers(memberList);
      setEvents(eventList);
      setContributions(contributionList);
      setPayouts(payoutList);
      setExpenses(expenseList);
      
      const userAccount = accountList.find(a => a.id === currentUser.association_account_id);
      setAssociationAccount(userAccount);

      calculateReportMetrics(memberList, eventList, contributionList, payoutList, expenseList);
      
    } catch (error) {
      console.error('Failed to load report data:', error);
      toast.error('Failed to load report data');
    } finally {
      setIsLoading(false);
    }
  };

  const calculateReportMetrics = (memberList, eventList, contributionList, payoutList, expenseList) => {
    const { startDate, endDate } = getDateRange();

    // Summary metrics
    const totalMembers = memberList.length;
    const activeMembers = memberList.filter(m => m.status === 'Active').length;
    const newMembers = memberList.filter(m => {
      const joinedDate = m.joined_at ? new Date(m.joined_at) : null;
      return joinedDate && joinedDate >= startDate && joinedDate <= endDate;
    }).length;

    const totalRevenue = contributionList
      .filter(c => c.status === 'Paid' && c.paid_at && new Date(c.paid_at) >= startDate && new Date(c.paid_at) <= endDate)
      .reduce((sum, c) => sum + (c.amount_paid || 0), 0);

    const totalPayouts = payoutList
      .filter(p => p.status === 'Disbursed' && p.paid_at && new Date(p.paid_at) >= startDate && new Date(p.paid_at) <= endDate)
      .reduce((sum, p) => sum + p.amount, 0);

    const totalExpenses = expenseList
      .filter(e => e.expense_date && new Date(e.expense_date) >= startDate && new Date(e.expense_date) <= endDate)
      .reduce((sum, e) => sum + e.amount, 0);

    const netIncome = totalRevenue - totalPayouts - totalExpenses;

    const pendingContributions = contributionList.filter(c => 
      c.status === 'Due' || c.status === 'Past Due'
    ).reduce((sum, c) => sum + c.amount_due, 0);

    const collectionRate = contributionList.length > 0
      ? (contributionList.filter(c => c.status === 'Paid').length / contributionList.length) * 100
      : 0;

    // Monthly data
    const monthlyIntervals = eachMonthOfInterval({ start: startDate, end: endDate });
    
    const membershipGrowth = monthlyIntervals.map(monthStart => {
      const monthEnd = endOfMonth(monthStart);
      const joinedInMonth = memberList.filter(m => {
        const joinedDate = m.joined_at ? new Date(m.joined_at) : null;
        return joinedDate && joinedDate >= monthStart && joinedDate <= monthEnd;
      }).length;

      const activeInMonth = memberList.filter(m => {
        const joinedDate = m.joined_at ? new Date(m.joined_at) : null;
        return joinedDate && joinedDate <= monthEnd && m.status === 'Active';
      }).length;

      return {
        month: format(monthStart, 'MMM yyyy'),
        newMembers: joinedInMonth,
        totalActive: activeInMonth
      };
    });

    const revenueAnalysis = monthlyIntervals.map(monthStart => {
      const monthEnd = endOfMonth(monthStart);
      const revenue = contributionList
        .filter(c => c.status === 'Paid' && c.paid_at && 
          new Date(c.paid_at) >= monthStart && new Date(c.paid_at) <= monthEnd)
        .reduce((sum, c) => sum + (c.amount_paid || 0), 0);

      const payoutsAmt = payoutList
        .filter(p => p.status === 'Disbursed' && p.paid_at && 
          new Date(p.paid_at) >= monthStart && new Date(p.paid_at) <= monthEnd)
        .reduce((sum, p) => sum + p.amount, 0);

      const expensesAmt = expenseList
        .filter(e => e.expense_date && 
          new Date(e.expense_date) >= monthStart && new Date(e.expense_date) <= monthEnd)
        .reduce((sum, e) => sum + e.amount, 0);

      return {
        month: format(monthStart, 'MMM yyyy'),
        revenue,
        payouts: payoutsAmt,
        expenses: expensesAmt,
        netIncome: revenue - payoutsAmt - expensesAmt
      };
    });

    // Predictive analytics
    const predictiveMetrics = calculatePredictiveMetrics(membershipGrowth, revenueAnalysis, contributionList, memberList);

    // Admin dashboard specific metrics
    const memberAnalytics = calculateMemberAnalytics(memberList, contributionList);
    const eventPerformanceMetrics = calculateEventPerformance(eventList, contributionList, payoutList, memberList);
    
    setReportData({
      summary: {
        totalMembers,
        activeMembers,
        newMembers,
        totalRevenue,
        totalPayouts,
        totalExpenses,
        netIncome,
        pendingContributions,
        collectionRate,
        outstandingBalance: pendingContributions,
        overdueCount: contributionList.filter(c => c.status === 'Past Due').length,
        netActivity: totalRevenue - totalPayouts,
        revenueTrend: revenueAnalysis.length >= 2 ? {
          isPositive: revenueAnalysis[revenueAnalysis.length - 1].revenue >= revenueAnalysis[revenueAnalysis.length - 2].revenue,
          text: `${Math.abs(((revenueAnalysis[revenueAnalysis.length - 1].revenue - revenueAnalysis[revenueAnalysis.length - 2].revenue) / revenueAnalysis[revenueAnalysis.length - 2].revenue * 100).toFixed(1))}% vs last period`
        } : null
      },
      membershipGrowth,
      revenueAnalysis,
      payoutAnalysis: revenueAnalysis.map(r => ({ month: r.month, amount: r.payouts })),
      contributionAnalysis: revenueAnalysis.map(r => ({ month: r.month, amount: r.revenue })),
      expenseAnalysis: revenueAnalysis.map(r => ({ month: r.month, amount: r.expenses })),
      predictiveMetrics,
      memberAnalytics,
      eventPerformance: eventPerformanceMetrics
    });
  };

  const calculateMemberAnalytics = (memberList, contributionList) => {
    const activeCount = memberList.filter(m => m.status === 'Active').length;
    const pendingCount = memberList.filter(m => m.status === 'Pending').length;
    const suspendedCount = memberList.filter(m => m.status === 'Suspended').length;
    
    const { startDate, endDate } = getDateRange();
    const newMembers = memberList.filter(m => {
      const joinedDate = m.joined_at ? new Date(m.joined_at) : null;
      return joinedDate && joinedDate >= startDate && joinedDate <= endDate;
    }).length;

    const paidContributions = contributionList.filter(c => c.status === 'Paid').length;
    const dueContributions = contributionList.filter(c => c.status === 'Due').length;
    const pastDueContributions = contributionList.filter(c => c.status === 'Past Due').length;
    
    const collectionRate = contributionList.length > 0
      ? (paidContributions / contributionList.length) * 100
      : 0;

    // Calculate engagement score based on activity
    const avgContributionsPerMember = memberList.length > 0 
      ? contributionList.filter(c => c.status === 'Paid').length / memberList.length 
      : 0;
    const engagementScore = Math.min(100, Math.round((avgContributionsPerMember / 3) * 100));

    return {
      totalMembers: memberList.length,
      activeCount,
      pendingCount,
      suspendedCount,
      newMembers,
      paidContributions,
      dueContributions,
      pastDueContributions,
      collectionRate,
      engagementScore
    };
  };

  const calculateEventPerformance = (eventList, contributionList, payoutList, memberList) => {
    const { startDate, endDate } = getDateRange();
    
    const totalEvents = eventList.length;
    const activeEvents = eventList.filter(e => 
      e.status === 'Published' || e.status === 'Announced' || e.status === 'Collecting'
    ).length;

    // Calculate participation and financial data per event
    const eventMetrics = eventList.map(event => {
      const eventContributions = contributionList.filter(c => c.event_id === event.id);
      const eventPayouts = payoutList.filter(p => p.event_id === event.id);
      
      const participantCount = new Set(eventContributions.map(c => c.member_id)).size;
      const contributionsCollected = eventContributions
        .filter(c => c.status === 'Paid')
        .reduce((sum, c) => sum + (c.amount_paid || 0), 0);
      const payoutsDisbursed = eventPayouts
        .filter(p => p.status === 'Disbursed')
        .reduce((sum, p) => sum + p.amount, 0);

      return {
        id: event.id,
        title: event.title,
        status: event.status,
        participantCount,
        contributionsCollected,
        payoutsDisbursed
      };
    });

    const topEvents = eventMetrics
      .sort((a, b) => b.participantCount - a.participantCount)
      .slice(0, 10);

    const totalParticipants = eventMetrics.reduce((sum, e) => sum + e.participantCount, 0);
    const totalContributions = eventMetrics.reduce((sum, e) => sum + e.contributionsCollected, 0);
    const totalPayouts = eventMetrics.reduce((sum, e) => sum + e.payoutsDisbursed, 0);

    const statusBreakdown = {
      published: eventList.filter(e => e.status === 'Published' || e.status === 'Announced').length,
      collecting: eventList.filter(e => e.status === 'Collecting').length,
      closed: eventList.filter(e => e.status === 'Closed' || e.status === 'Paid').length,
      draft: eventList.filter(e => e.status === 'Draft').length
    };

    return {
      totalEvents,
      activeEvents,
      totalParticipants,
      totalContributions,
      totalPayouts,
      topEvents,
      statusBreakdown
    };
  };

  const calculatePredictiveMetrics = (membershipGrowth, revenueAnalysis, contributionList, memberList) => {
    const recentMonths = membershipGrowth.slice(-6);
    const avgGrowthRate = recentMonths.length > 1 
      ? recentMonths.reduce((sum, m, i) => {
          if (i === 0) return 0;
          return sum + (m.newMembers - recentMonths[i-1].newMembers);
        }, 0) / (recentMonths.length - 1)
      : 0;

    const currentMembers = memberList.filter(m => m.status === 'Active').length;
    const predictedMembers = [
      { month: 'Next Month', predicted: Math.max(0, Math.round(currentMembers + avgGrowthRate)) },
      { month: '2 Months', predicted: Math.max(0, Math.round(currentMembers + (avgGrowthRate * 2))) },
      { month: '3 Months', predicted: Math.max(0, Math.round(currentMembers + (avgGrowthRate * 3))) }
    ];

    const avgContributionPerMember = contributionList.length > 0
      ? contributionList.reduce((sum, c) => sum + c.amount_due, 0) / memberList.length
      : 0;

    const recentRevenue = revenueAnalysis.slice(-3).reduce((sum, r) => sum + r.revenue, 0) / 3;
    const recentPayouts = revenueAnalysis.slice(-3).reduce((sum, r) => sum + r.payouts, 0) / 3;
    const recentExpenses = revenueAnalysis.slice(-3).reduce((sum, r) => sum + r.expenses, 0) / 3;
    
    const monthlyBurnRate = recentPayouts + recentExpenses;
    const predictedMonthlyRevenue = predictedMembers[0].predicted * avgContributionPerMember;
    const fundingGap = monthlyBurnRate - predictedMonthlyRevenue;

    const inactiveMembers = memberList.filter(m => m.status === 'Suspended' || m.status === 'Removed').length;
    const churnRate = memberList.length > 0 ? (inactiveMembers / memberList.length) * 100 : 0;

    let healthScore = 100;
    const recentNetIncome = revenueAnalysis.slice(-3);
    const negativeMonths = recentNetIncome.filter(r => r.netIncome < 0).length;
    healthScore -= negativeMonths * 15;
    if (churnRate > 20) healthScore -= 20;
    else if (churnRate > 10) healthScore -= 10;
    if (revenueAnalysis.length >= 2) {
      const recent = revenueAnalysis[revenueAnalysis.length - 1].revenue;
      const previous = revenueAnalysis[revenueAnalysis.length - 2].revenue;
      if (recent < previous) healthScore -= 10;
    }
    healthScore = Math.max(0, Math.min(100, healthScore));

    return {
      avgGrowthRate,
      predictedMembers,
      avgContributionPerMember,
      predictedMonthlyRevenue,
      monthlyBurnRate,
      fundingGap,
      churnRate,
      healthScore
    };
  };

  // Dashboard customization handlers
  const handleAddWidget = (widget) => {
    setWidgets(prev => [...prev, { id: widget.id, visible: true, size: 'normal' }]);
  };

  const handleRemoveWidget = (widgetId) => {
    setWidgets(prev => prev.filter(w => w.id !== widgetId));
  };

  const handleToggleWidgetSize = (widgetId) => {
    setWidgets(prev => prev.map(w => 
      w.id === widgetId 
        ? { ...w, size: w.size === 'normal' ? 'large' : 'normal' }
        : w
    ));
  };

  const handleSaveView = () => {
    const viewName = prompt('Enter a name for this view:', currentViewName);
    if (!viewName) return;
    
    const newView = { name: viewName, widgets, period: selectedPeriod };
    const updatedViews = [...savedViews.filter(v => v.name !== viewName), newView];
    setSavedViews(updatedViews);
    setCurrentViewName(viewName);
    localStorage.setItem(SAVED_VIEWS_KEY, JSON.stringify(updatedViews));
    toast.success(`View "${viewName}" saved`);
  };

  const handleLoadView = (view) => {
    setWidgets(view.widgets);
    setSelectedPeriod(view.period);
    setCurrentViewName(view.name);
    toast.success(`Loaded view "${view.name}"`);
  };

  const handleResetView = () => {
    setWidgets(DEFAULT_WIDGETS);
    setCurrentViewName('Default');
    toast.success('Reset to default view');
  };

  // Drill-down handlers
  const handleMembershipDrillDown = (monthData) => {
    const { startDate, endDate } = getDateRange();
    const filteredMembers = members.filter(m => {
      const joinedDate = m.joined_at ? new Date(m.joined_at) : null;
      return joinedDate && format(joinedDate, 'MMM yyyy') === monthData.month;
    });

    setDrillDownModal({
      isOpen: true,
      title: `Members Joined - ${monthData.month}`,
      description: `${filteredMembers.length} members joined this month`,
      data: filteredMembers,
      columns: [
        { key: 'member_number', label: 'Member #', sortable: true },
        { key: 'first_name', label: 'First Name', sortable: true },
        { key: 'last_name', label: 'Last Name', sortable: true },
        { key: 'email', label: 'Email', sortable: true },
        { key: 'status', label: 'Status', type: 'badge', sortable: true },
        { key: 'joined_at', label: 'Joined', type: 'date', sortable: true },
      ],
      filters: [
        { key: 'status', label: 'Status', options: ['Active', 'Pending', 'Suspended'] }
      ]
    });
  };

  const handleRevenueDrillDown = (monthData) => {
    const filteredContributions = contributions.filter(c => {
      const paidDate = c.paid_at ? new Date(c.paid_at) : null;
      return c.status === 'Paid' && paidDate && format(paidDate, 'MMM yyyy') === monthData.month;
    }).map(c => {
      const member = members.find(m => m.id === c.member_id);
      const event = events.find(e => e.id === c.event_id);
      return {
        ...c,
        member_name: member ? `${member.first_name} ${member.last_name}` : 'Unknown',
        event_title: event?.title || 'Unknown Event'
      };
    });

    setDrillDownModal({
      isOpen: true,
      title: `Contributions - ${monthData.month}`,
      description: `$${monthData.revenue?.toLocaleString() || monthData.amount?.toLocaleString()} collected`,
      data: filteredContributions,
      columns: [
        { key: 'member_name', label: 'Member', sortable: true },
        { key: 'event_title', label: 'Event', sortable: true },
        { key: 'amount_paid', label: 'Amount', type: 'currency', sortable: true },
        { key: 'paid_at', label: 'Paid Date', type: 'date', sortable: true },
        { key: 'status', label: 'Status', type: 'badge', sortable: true },
      ],
      filters: []
    });
  };

  const handlePayoutDrillDown = (monthData) => {
    const filteredPayouts = payouts.filter(p => {
      const paidDate = p.paid_at ? new Date(p.paid_at) : null;
      return p.status === 'Disbursed' && paidDate && format(paidDate, 'MMM yyyy') === monthData.month;
    }).map(p => {
      const member = members.find(m => m.id === p.payee_member_id);
      const event = events.find(e => e.id === p.event_id);
      return {
        ...p,
        member_name: member ? `${member.first_name} ${member.last_name}` : 'Unknown',
        event_title: event?.title || 'Unknown Event'
      };
    });

    setDrillDownModal({
      isOpen: true,
      title: `Payouts - ${monthData.month}`,
      description: `$${monthData.payouts?.toLocaleString() || monthData.amount?.toLocaleString()} disbursed`,
      data: filteredPayouts,
      columns: [
        { key: 'member_name', label: 'Recipient', sortable: true },
        { key: 'event_title', label: 'Event', sortable: true },
        { key: 'amount', label: 'Amount', type: 'currency', sortable: true },
        { key: 'paid_at', label: 'Paid Date', type: 'date', sortable: true },
        { key: 'status', label: 'Status', type: 'badge', sortable: true },
      ],
      filters: []
    });
  };

  const handleExport = async (exportFormat) => {
    setIsExporting(true);
    try {
      const { startDate, endDate } = getDateRange();
      const periodLabel = `${format(startDate, 'MMM-dd-yyyy')} to ${format(endDate, 'MMM-dd-yyyy')}`;

      if (exportFormat === 'pdf') {
        const response = await base44.functions.invoke('generateReportPDF', {
          reportData,
          period: periodLabel,
          associationName: associationAccount?.organization_name || 'Association'
        });

        const blob = new Blob([response.data], { type: 'application/pdf' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `report-${periodLabel}.pdf`;
        a.click();
        window.URL.revokeObjectURL(url);

        toast.success('PDF report downloaded');
      } else if (exportFormat === 'csv') {
        let csv = 'Metric,Value\n';
        csv += `Total Members,${reportData.summary.totalMembers}\n`;
        csv += `Active Members,${reportData.summary.activeMembers}\n`;
        csv += `New Members,${reportData.summary.newMembers}\n`;
        csv += `Total Revenue,$${reportData.summary.totalRevenue?.toFixed(2)}\n`;
        csv += `Total Payouts,$${reportData.summary.totalPayouts?.toFixed(2)}\n`;
        csv += `Total Expenses,$${reportData.summary.totalExpenses?.toFixed(2)}\n`;
        csv += `Net Income,$${reportData.summary.netIncome?.toFixed(2)}\n`;
        csv += `Collection Rate,${reportData.summary.collectionRate?.toFixed(1)}%\n\n`;

        csv += 'Month,Revenue,Payouts,Expenses,Net Income\n';
        reportData.revenueAnalysis.forEach(r => {
          csv += `${r.month},${r.revenue.toFixed(2)},${r.payouts.toFixed(2)},${r.expenses.toFixed(2)},${r.netIncome.toFixed(2)}\n`;
        });

        const blob = new Blob([csv], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `report-${periodLabel}.csv`;
        a.click();
        window.URL.revokeObjectURL(url);

        toast.success('CSV data downloaded');
      }
    } catch (error) {
      console.error('Export failed:', error);
      toast.error('Failed to export report');
    } finally {
      setIsExporting(false);
    }
  };

  // Render widget by ID
  const renderWidget = (widgetId) => {
    switch (widgetId) {
      case 'membership_growth':
        return (
          <InteractiveChart
            title="Membership Growth"
            description="New and active members over time"
            data={reportData.membershipGrowth}
            dataKeys={[
              { key: 'newMembers', label: 'New Members', color: '#3B82F6' },
              { key: 'totalActive', label: 'Total Active', color: '#10B981' }
            ]}
            onDrillDown={handleMembershipDrillDown}
          />
        );
      case 'revenue_chart':
        return (
          <InteractiveChart
            title="Revenue Analysis"
            description="Revenue, payouts, expenses, and net income"
            data={reportData.revenueAnalysis}
            dataKeys={[
              { key: 'revenue', label: 'Revenue', color: '#10B981' },
              { key: 'payouts', label: 'Payouts', color: '#F59E0B' },
              { key: 'expenses', label: 'Expenses', color: '#EF4444' },
              { key: 'netIncome', label: 'Net Income', color: '#3B82F6' }
            ]}
            onDrillDown={handleRevenueDrillDown}
          />
        );
      case 'payout_chart':
        return (
          <InteractiveChart
            title="Payout Trends"
            description="Benefit payouts over time"
            data={reportData.payoutAnalysis}
            dataKeys={[{ key: 'amount', label: 'Payouts', color: '#F59E0B' }]}
            defaultChartType="bar"
            onDrillDown={handlePayoutDrillDown}
          />
        );
      case 'contribution_chart':
        return (
          <InteractiveChart
            title="Contribution Trends"
            description="Contributions collected over time"
            data={reportData.contributionAnalysis}
            dataKeys={[{ key: 'amount', label: 'Contributions', color: '#10B981' }]}
            defaultChartType="bar"
            onDrillDown={handleRevenueDrillDown}
          />
        );
      case 'expense_chart':
        return (
          <InteractiveChart
            title="Expense Trends"
            description="Expenses over time"
            data={reportData.expenseAnalysis}
            dataKeys={[{ key: 'amount', label: 'Expenses', color: '#EF4444' }]}
            defaultChartType="bar"
          />
        );
      case 'collection_rate':
        return (
          <KPIWidget
            title="Collection Rate"
            value={reportData.summary.collectionRate}
            format="percent"
            icon={Target}
            color="green"
            description="Percentage of contributions paid on time"
          />
        );
      case 'member_status':
        return (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Member Status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                <span className="font-medium">Active</span>
                <span className="text-2xl font-bold text-green-600">{reportData.summary.activeMembers}</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
                <span className="font-medium">New This Period</span>
                <span className="text-2xl font-bold text-blue-600">{reportData.summary.newMembers}</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                <span className="font-medium">Total</span>
                <span className="text-2xl font-bold text-gray-600">{reportData.summary.totalMembers}</span>
              </div>
            </CardContent>
          </Card>
        );
      case 'health_score':
        return (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Association Health Score</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center">
                <div className={`text-5xl font-bold ${
                  reportData.predictiveMetrics.healthScore >= 70 ? 'text-green-600' :
                  reportData.predictiveMetrics.healthScore >= 40 ? 'text-yellow-600' : 'text-red-600'
                }`}>
                  {reportData.predictiveMetrics.healthScore || 0}
                </div>
                <p className="text-sm text-gray-500 mt-2">out of 100</p>
                <p className="text-xs text-gray-400 mt-1">
                  Based on revenue, churn, and growth metrics
                </p>
              </div>
            </CardContent>
          </Card>
        );
      case 'event_summary':
        return (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Event Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Total Events</span>
                <span className="font-bold">{events.length}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Active/Collecting</span>
                <span className="font-bold text-blue-600">
                  {events.filter(e => e.status === 'Collecting' || e.status === 'Announced').length}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Completed</span>
                <span className="font-bold text-green-600">
                  {events.filter(e => e.status === 'Paid' || e.status === 'Closed').length}
                </span>
              </div>
            </CardContent>
          </Card>
        );
      case 'top_contributors':
        const memberContributions = members.map(m => ({
          ...m,
          totalPaid: contributions
            .filter(c => c.member_id === m.id && c.status === 'Paid')
            .reduce((sum, c) => sum + (c.amount_paid || 0), 0)
        })).sort((a, b) => b.totalPaid - a.totalPaid).slice(0, 5);

        return (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Top Contributors</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {memberContributions.map((m, i) => (
                  <div key={m.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                        i === 0 ? 'bg-yellow-100 text-yellow-700' :
                        i === 1 ? 'bg-gray-100 text-gray-700' :
                        i === 2 ? 'bg-orange-100 text-orange-700' : 'bg-gray-50 text-gray-600'
                      }`}>
                        {i + 1}
                      </span>
                      <span className="font-medium">{m.first_name} {m.last_name}</span>
                    </div>
                    <span className="font-bold text-green-600">${m.totalPaid.toFixed(2)}</span>
                  </div>
                ))}
                {memberContributions.length === 0 && (
                  <p className="text-gray-500 text-center py-4">No contribution data</p>
                )}
              </div>
            </CardContent>
          </Card>
        );
      default:
        return null;
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-32 w-full" />
        <div className="grid md:grid-cols-2 gap-6">
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Controls */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Interactive Analytics Dashboard</h2>
          <p className="text-gray-500">Customize your view and drill down into the data</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TIME_PERIODS.map(period => (
                <SelectItem key={period.value} value={period.value}>
                  {period.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {selectedPeriod === 'custom' && (
            <>
              <Input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="w-[150px]"
              />
              <Input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="w-[150px]"
              />
            </>
          )}

          <Select onValueChange={handleExport} disabled={isExporting}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder={isExporting ? "Exporting..." : "Export"} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="pdf">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  PDF Report
                </div>
              </SelectItem>
              <SelectItem value="csv">
                <div className="flex items-center gap-2">
                  <BarChart3 className="h-4 w-4" />
                  CSV Data
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* KPI Summary Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        <KPIWidget
          title="Total Members"
          value={reportData.summary.totalMembers}
          icon={Users}
          color="blue"
          size="compact"
        />
        <KPIWidget
          title="Active Members"
          value={reportData.summary.activeMembers}
          icon={Activity}
          color="green"
          size="compact"
        />
        <KPIWidget
          title="Revenue"
          value={reportData.summary.totalRevenue}
          format="currency"
          icon={DollarSign}
          color="green"
          size="compact"
        />
        <KPIWidget
          title="Payouts"
          value={reportData.summary.totalPayouts}
          format="currency"
          icon={Wallet}
          color="orange"
          size="compact"
        />
        <KPIWidget
          title="Net Income"
          value={reportData.summary.netIncome}
          format="currency"
          icon={reportData.summary.netIncome >= 0 ? TrendingUp : TrendingDown}
          color={reportData.summary.netIncome >= 0 ? 'green' : 'red'}
          size="compact"
        />
        <KPIWidget
          title="Collection Rate"
          value={reportData.summary.collectionRate}
          format="percent"
          icon={Target}
          color="purple"
          size="compact"
        />
      </div>

      {/* Dashboard Customization Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="font-normal">
            <Eye className="w-3 h-3 mr-1" />
            {currentViewName}
          </Badge>
          {savedViews.length > 0 && (
            <Select onValueChange={(name) => {
              const view = savedViews.find(v => v.name === name);
              if (view) handleLoadView(view);
            }}>
              <SelectTrigger className="w-[150px] h-8">
                <SelectValue placeholder="Load view..." />
              </SelectTrigger>
              <SelectContent>
                {savedViews.map(view => (
                  <SelectItem key={view.name} value={view.name}>
                    {view.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant={isCustomizing ? "default" : "outline"}
            size="sm"
            onClick={() => setIsCustomizing(!isCustomizing)}
          >
            <Settings2 className="w-4 h-4 mr-2" />
            {isCustomizing ? 'Done Editing' : 'Customize'}
          </Button>
          {isCustomizing && (
            <>
              <Button variant="outline" size="sm" onClick={() => setShowWidgetSelector(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Add Widget
              </Button>
              <Button variant="outline" size="sm" onClick={handleSaveView}>
                <Save className="w-4 h-4 mr-2" />
                Save View
              </Button>
              <Button variant="ghost" size="sm" onClick={handleResetView}>
                <RotateCcw className="w-4 h-4 mr-2" />
                Reset
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Widget Selector */}
      {showWidgetSelector && (
        <WidgetSelector
          activeWidgets={widgets}
          onAddWidget={handleAddWidget}
          onClose={() => setShowWidgetSelector(false)}
        />
      )}

      {/* Main Dashboard Tabs */}
      <Tabs defaultValue="overview" className="w-full">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="dashboard">Custom Dashboard</TabsTrigger>
          <TabsTrigger value="membership">Membership</TabsTrigger>
          <TabsTrigger value="financial">Financial</TabsTrigger>
          <TabsTrigger value="statements">Statements</TabsTrigger>
          <TabsTrigger value="scheduled">Scheduled Reports</TabsTrigger>
          <TabsTrigger value="predictive">Predictive Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <AdminReportsDashboard
            summary={reportData.summary}
            memberAnalytics={reportData.memberAnalytics || {}}
            eventPerformance={reportData.eventPerformance || {}}
            trendData={reportData.revenueAnalysis.map(r => ({
              period: r.month,
              revenue: r.revenue,
              payouts: r.payouts,
              netActivity: r.netIncome
            }))}
            onDrillDown={(type) => {
              // Drill-down opens relevant sections
              toast.info(`View detailed ${type} data in the respective tab`);
            }}
          />
        </TabsContent>

        <TabsContent value="dashboard" className="space-y-6">
          <div className="grid gap-6" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))' }}>
            {widgets.filter(w => w.visible).map(widget => (
              <div key={widget.id} className={`relative ${widget.size === 'large' ? 'col-span-2' : ''}`}>
                {isCustomizing && (
                  <div className="absolute -top-2 -right-2 z-10 flex gap-1">
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-7 w-7 bg-white shadow-md"
                      onClick={() => handleToggleWidgetSize(widget.id)}
                    >
                      {widget.size === 'normal' ? '⬚' : '◻'}
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-7 w-7 bg-white shadow-md hover:bg-red-50 hover:text-red-600"
                      onClick={() => handleRemoveWidget(widget.id)}
                    >
                      ×
                    </Button>
                  </div>
                )}
                {renderWidget(widget.id)}
              </div>
            ))}
          </div>
          
          {widgets.filter(w => w.visible).length === 0 && (
            <Card className="p-12 text-center">
              <p className="text-gray-500 mb-4">No widgets added yet</p>
              <Button onClick={() => setShowWidgetSelector(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Add Your First Widget
              </Button>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="membership" className="space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            <InteractiveChart
              title="Membership Growth"
              description="Track new and active members"
              data={reportData.membershipGrowth}
              dataKeys={[
                { key: 'newMembers', label: 'New Members', color: '#3B82F6' },
                { key: 'totalActive', label: 'Total Active', color: '#10B981' }
              ]}
              onDrillDown={handleMembershipDrillDown}
              height={350}
            />
            {renderWidget('member_status')}
          </div>
          {renderWidget('top_contributors')}
        </TabsContent>

        <TabsContent value="financial" className="space-y-6">
          <InteractiveChart
            title="Financial Overview"
            description="Complete financial picture"
            data={reportData.revenueAnalysis}
            dataKeys={[
              { key: 'revenue', label: 'Revenue', color: '#10B981' },
              { key: 'payouts', label: 'Payouts', color: '#F59E0B' },
              { key: 'expenses', label: 'Expenses', color: '#EF4444' },
              { key: 'netIncome', label: 'Net Income', color: '#3B82F6' }
            ]}
            onDrillDown={handleRevenueDrillDown}
            height={400}
          />
          <div className="grid md:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Collection Rate</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-green-600">
                  {reportData.summary.collectionRate?.toFixed(1)}%
                </div>
                <p className="text-xs text-gray-500 mt-1">Of contributions paid on time</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Pending Collections</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-orange-600">
                  ${reportData.summary.pendingContributions?.toFixed(2)}
                </div>
                <p className="text-xs text-gray-500 mt-1">Outstanding payments</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Net Income</CardTitle>
              </CardHeader>
              <CardContent>
                <div className={`text-3xl font-bold ${reportData.summary.netIncome >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  ${reportData.summary.netIncome?.toFixed(2)}
                </div>
                <p className="text-xs text-gray-500 mt-1">Revenue minus expenses</p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="statements" className="space-y-6">
          <FinancialStatements
            contributions={contributions}
            payouts={payouts}
            expenses={expenses}
            members={members}
            events={events}
            period={selectedPeriod}
            customStartDate={customStartDate}
            customEndDate={customEndDate}
            onExport={(statementType) => handleExport('pdf')}
          />
        </TabsContent>

        <TabsContent value="scheduled" className="space-y-6">
          <ScheduledReportsManager />
        </TabsContent>

        <TabsContent value="predictive" className="space-y-6">
          <PredictiveAnalyticsPanel metrics={reportData.predictiveMetrics} />
        </TabsContent>
      </Tabs>

      {/* Drill-Down Modal */}
      <DrillDownModal
        isOpen={drillDownModal.isOpen}
        onClose={() => setDrillDownModal(prev => ({ ...prev, isOpen: false }))}
        title={drillDownModal.title}
        description={drillDownModal.description}
        data={drillDownModal.data}
        columns={drillDownModal.columns}
        filters={drillDownModal.filters}
      />
    </div>
  );
}