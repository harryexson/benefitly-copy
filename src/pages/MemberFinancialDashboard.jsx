import React, { useState, useEffect } from 'react';
import { User, Member, EventContribution, Event, Payout } from '@/entities/all';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { TrendingUp, TrendingDown, 
  AlertCircle, BarChart3
} from 'lucide-react';
import { format, subMonths, startOfMonth, endOfMonth } from 'date-fns';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import PaymentMethodManager from '../components/member/PaymentMethodManager';
import FinancialSummaryCards from '../components/member/FinancialSummaryCards';
import TransactionHistory from '../components/member/TransactionHistory';

const COLORS = ['#10B981', '#3B82F6', '#F59E0B', '#EF4444', '#8B5CF6'];

function StatCard({ icon: Icon, label, value, subtext, color = 'blue', trend }) {
  const colorClasses = {
    green: 'bg-green-100 text-green-600',
    blue: 'bg-blue-100 text-blue-600',
    orange: 'bg-orange-100 text-orange-600',
    red: 'bg-red-100 text-red-600',
    purple: 'bg-purple-100 text-purple-600'
  };

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-gray-500 font-medium">{label}</p>
            <p className="text-2xl font-bold mt-1">{value}</p>
            {subtext && <p className="text-xs text-gray-500 mt-1">{subtext}</p>}
            {trend && (
              <div className={`flex items-center gap-1 mt-2 text-xs ${trend.positive ? 'text-green-600' : 'text-red-600'}`}>
                {trend.positive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                <span>{trend.text}</span>
              </div>
            )}
          </div>
          <div className={`p-3 rounded-full ${colorClasses[color]}`}>
            <Icon className="h-5 w-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function MemberFinancialDashboard() {
  const [user, setUser] = useState(null);
  const [member, setMember] = useState(null);
  const [contributions, setContributions] = useState([]);
  const [payouts, setPayouts] = useState([]);
  const [events, setEvents] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const currentUser = await User.me();
      setUser(currentUser);

      const memberResults = await Member.filter({ email: currentUser.email });
      if (memberResults.length === 0) {
        setIsLoading(false);
        return;
      }

      const currentMember = memberResults[0];
      setMember(currentMember);

      const [contribList, payoutList, eventList] = await Promise.all([
        EventContribution.filter({ member_id: currentMember.id }, '-created_date'),
        Payout.filter({ payee_member_id: currentMember.id }, '-created_date'),
        Event.list()
      ]);

      setContributions(contribList);
      setPayouts(payoutList);
      setEvents(eventList);
    } catch (error) {
      console.error('Failed to load financial data:', error);
      toast.error('Failed to load financial data');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePayContribution = async (contribution) => {
    try {
      setIsProcessing(true);
      const response = await base44.functions.invoke('createContributionCheckout', {
        contribution_id: contribution.id
      });

      if (response.data.checkoutUrl) {
        window.location.href = response.data.checkoutUrl;
      } else {
        toast.error('Failed to create payment session');
        setIsProcessing(false);
      }
    } catch (error) {
      console.error('Payment error:', error);
      toast.error('Failed to initiate payment');
      setIsProcessing(false);
    }
  };

  // Calculate statistics
  const stats = {
    totalPaid: contributions.filter(c => c.status === 'Paid').reduce((sum, c) => sum + (c.amount_paid || 0), 0),
    totalDue: contributions.filter(c => ['Due', 'Past Due'].includes(c.status)).reduce((sum, c) => sum + c.amount_due, 0),
    totalPayoutsReceived: payouts.filter(p => p.status === 'Disbursed').reduce((sum, p) => sum + p.amount, 0),
    pendingPayouts: payouts.filter(p => ['Pending Approval', 'Approved'].includes(p.status)).reduce((sum, p) => sum + p.amount, 0),
    contributionCount: contributions.filter(c => c.status === 'Paid').length,
    payoutCount: payouts.filter(p => p.status === 'Disbursed').length,
    overdueCount: contributions.filter(c => c.status === 'Past Due').length,
    upcomingPaymentsCount: contributions.filter(c => ['Due', 'Past Due'].includes(c.status)).length
  };

  // Calculate net position
  const netPosition = stats.totalPayoutsReceived - stats.totalPaid;

  // Prepare chart data - last 6 months
  const getMonthlyData = () => {
    const months = [];
    for (let i = 5; i >= 0; i--) {
      const date = subMonths(new Date(), i);
      const start = startOfMonth(date);
      const end = endOfMonth(date);
      
      const monthContributions = contributions
        .filter(c => c.status === 'Paid' && c.paid_at && new Date(c.paid_at) >= start && new Date(c.paid_at) <= end)
        .reduce((sum, c) => sum + (c.amount_paid || 0), 0);

      const monthPayouts = payouts
        .filter(p => p.status === 'Disbursed' && p.paid_at && new Date(p.paid_at) >= start && new Date(p.paid_at) <= end)
        .reduce((sum, p) => sum + p.amount, 0);

      months.push({
        month: format(date, 'MMM'),
        contributions: monthContributions,
        payouts: monthPayouts
      });
    }
    return months;
  };

  // Contribution status breakdown for pie chart
  const getContributionBreakdown = () => {
    const statusCounts = {
      'Paid': contributions.filter(c => c.status === 'Paid').length,
      'Due': contributions.filter(c => c.status === 'Due').length,
      'Past Due': contributions.filter(c => c.status === 'Past Due').length,
      'Written Off': contributions.filter(c => c.status === 'Written Off').length
    };

    return Object.entries(statusCounts)
      .filter(([_, count]) => count > 0)
      .map(([status, count]) => ({ name: status, value: count }));
  };

  const getEventTitle = (eventId) => {
    const event = events.find(e => e.id === eventId);
    return event ? event.title : 'Unknown Event';
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid md:grid-cols-4 gap-4">
          {[1,2,3,4].map(i => <Skeleton key={i} className="h-32" />)}
        </div>
        <Skeleton className="h-80" />
      </div>
    );
  }

  if (!member) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">No Member Profile Found</h3>
          <p className="text-gray-600">
            Your account is not linked to a member profile. Please contact your administrator.
          </p>
        </CardContent>
      </Card>
    );
  }

  const monthlyData = getMonthlyData();
  const contributionBreakdown = getContributionBreakdown();
  const upcomingDues = contributions
    .filter(c => ['Due', 'Past Due'].includes(c.status))
    .sort((a, b) => new Date(a.due_date) - new Date(b.due_date));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Financial Management</h1>
          <p className="text-gray-500">Complete financial history and payment methods</p>
        </div>
        <Button asChild variant="outline">
          <Link to={createPageUrl('MemberPortal')}>
            Back to Portal
          </Link>
        </Button>
      </div>

      {/* Summary Cards */}
      <FinancialSummaryCards
        totalContributed={stats.totalPaid}
        totalPayoutsReceived={stats.totalPayoutsReceived}
        outstandingBalance={stats.totalDue}
        upcomingPayments={stats.upcomingPaymentsCount}
        contributionCount={stats.contributionCount}
        payoutCount={stats.payoutCount}
      />

      {/* Payment Methods */}
      <PaymentMethodManager 
        member={member} 
        onUpdate={loadData}
      />

      {/* Charts Row */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Trends Chart */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              6-Month Financial Trend
            </CardTitle>
            <CardDescription>
              Your contributions and payouts over time
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `$${v}`} />
                <Tooltip 
                  formatter={(value) => [`$${value.toFixed(2)}`, '']}
                  contentStyle={{ borderRadius: '8px', border: '1px solid #E5E7EB' }}
                />
                <Legend />
                <Area 
                  type="monotone" 
                  dataKey="contributions" 
                  name="Contributions Paid"
                  stroke="#3B82F6" 
                  fill="#93C5FD" 
                  fillOpacity={0.6}
                />
                <Area 
                  type="monotone" 
                  dataKey="payouts" 
                  name="Payouts Received"
                  stroke="#10B981" 
                  fill="#6EE7B7" 
                  fillOpacity={0.6}
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Contribution Status Pie */}
        <Card>
          <CardHeader>
            <CardTitle>Contribution Status</CardTitle>
            <CardDescription>Breakdown by payment status</CardDescription>
          </CardHeader>
          <CardContent>
            {contributionBreakdown.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={contributionBreakdown}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {contributionBreakdown.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[200px] flex items-center justify-center text-gray-500">
                No contribution data
              </div>
            )}
            <div className="flex flex-wrap gap-2 justify-center mt-4">
              {contributionBreakdown.map((entry, index) => (
                <Badge 
                  key={entry.name} 
                  variant="outline"
                  style={{ borderColor: COLORS[index % COLORS.length], color: COLORS[index % COLORS.length] }}
                >
                  {entry.name}: {entry.value}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Transaction History */}
      <TransactionHistory
        contributions={contributions}
        payouts={payouts}
        events={events}
        onPayNow={handlePayContribution}
      />

      {/* Charts Row */}
      <Tabs defaultValue="trends" className="w-full">
        <TabsList>
          <TabsTrigger value="trends">Financial Trends</TabsTrigger>
          <TabsTrigger value="breakdown">Status Breakdown</TabsTrigger>
        </TabsList>

        <TabsContent value="trends">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                6-Month Financial Trend
              </CardTitle>
              <CardDescription>
                Your contributions and payouts over time
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `$${v}`} />
                  <Tooltip 
                    formatter={(value) => [`$${value.toFixed(2)}`, '']}
                    contentStyle={{ borderRadius: '8px', border: '1px solid #E5E7EB' }}
                  />
                  <Legend />
                  <Area 
                    type="monotone" 
                    dataKey="contributions" 
                    name="Contributions Paid"
                    stroke="#3B82F6" 
                    fill="#93C5FD" 
                    fillOpacity={0.6}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="payouts" 
                    name="Payouts Received"
                    stroke="#10B981" 
                    fill="#6EE7B7" 
                    fillOpacity={0.6}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="breakdown">
          <Card>
            <CardHeader>
              <CardTitle>Contribution Status Breakdown</CardTitle>
              <CardDescription>Overview of all your contributions by status</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  {contributionBreakdown.length > 0 ? (
                    <ResponsiveContainer width="100%" height={250}>
                      <PieChart>
                        <Pie
                          data={contributionBreakdown}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={100}
                          paddingAngle={2}
                          dataKey="value"
                        >
                          {contributionBreakdown.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-[250px] flex items-center justify-center text-gray-500">
                      No contribution data
                    </div>
                  )}
                </div>
                <div className="flex flex-col justify-center space-y-3">
                  {contributionBreakdown.map((entry, index) => (
                    <div key={entry.name} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div 
                          className="w-4 h-4 rounded-full" 
                          style={{ backgroundColor: COLORS[index % COLORS.length] }}
                        />
                        <span className="font-medium">{entry.name}</span>
                      </div>
                      <Badge variant="outline">{entry.value}</Badge>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}