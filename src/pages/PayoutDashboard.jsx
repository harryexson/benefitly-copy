import React, { useState, useEffect } from 'react';
import { Payout } from '@/entities/all';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { 
  DollarSign, 
  TrendingUp, 
  Clock, 
  CheckCircle,
  ArrowRight,
  FileText,
  CheckSquare
} from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachMonthOfInterval, subMonths } from 'date-fns';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { toast } from 'sonner';

const COLORS = {
  'Pending Approval': '#f59e0b',
  'Approved': '#3b82f6',
  'Disbursed': '#10b981',
  'Failed': '#ef4444'
};

const StatCard = ({ icon: Icon, label, value, color = 'blue', sublabel, onClick }) => (
  <Card className={onClick ? 'cursor-pointer hover:shadow-lg transition-shadow' : ''} onClick={onClick}>
    <CardContent className="pt-6">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="text-sm text-gray-500">{label}</p>
          <p className="text-3xl font-bold mt-1">{value}</p>
          {sublabel && (
            <p className="text-xs text-gray-500 mt-1">{sublabel}</p>
          )}
        </div>
        <div className={`p-3 rounded-full bg-${color}-100`}>
          <Icon className={`h-6 w-6 text-${color}-600`} />
        </div>
      </div>
    </CardContent>
  </Card>
);

export default function PayoutDashboard({ user }) {
  const [payouts, setPayouts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadPayoutData();
  }, []);

  const loadPayoutData = async () => {
    try {
      setIsLoading(true);
      const allPayouts = await Payout.list('-created_date');
      setPayouts(allPayouts);
    } catch (error) {
      console.error('Failed to load payout data:', error);
      toast.error('Failed to load payout data');
    } finally {
      setIsLoading(false);
    }
  };

  // Calculate statistics
  const stats = {
    totalPayouts: payouts.length,
    totalAmount: payouts.reduce((sum, p) => sum + p.amount, 0),
    averageAmount: payouts.length > 0
      ? payouts.reduce((sum, p) => sum + p.amount, 0) / payouts.length
      : 0,
    byStatus: {
      pending: payouts.filter(p => p.status === 'Pending Approval').length,
      approved: payouts.filter(p => p.status === 'Approved').length,
      disbursed: payouts.filter(p => p.status === 'Disbursed').length,
      failed: payouts.filter(p => p.status === 'Failed').length
    },
    totalDisbursed: payouts
      .filter(p => p.status === 'Disbursed')
      .reduce((sum, p) => sum + p.amount, 0),
    last30Days: payouts.filter(p => {
      const date = new Date(p.created_date);
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      return date >= thirtyDaysAgo;
    }).length
  };

  // Prepare status distribution data
  const statusData = [
    { name: 'Pending Approval', value: stats.byStatus.pending, color: COLORS['Pending Approval'] },
    { name: 'Approved', value: stats.byStatus.approved, color: COLORS['Approved'] },
    { name: 'Disbursed', value: stats.byStatus.disbursed, color: COLORS['Disbursed'] },
    { name: 'Failed', value: stats.byStatus.failed, color: COLORS['Failed'] }
  ].filter(item => item.value > 0);

  // Prepare monthly trend data (last 6 months)
  const last6Months = eachMonthOfInterval({
    start: subMonths(new Date(), 5),
    end: new Date()
  });

  const monthlyData = last6Months.map(month => {
    const monthStart = startOfMonth(month);
    const monthEnd = endOfMonth(month);
    
    const monthPayouts = payouts.filter(p => {
      const date = new Date(p.created_date);
      return date >= monthStart && date <= monthEnd;
    });

    const disbursed = monthPayouts.filter(p => p.status === 'Disbursed');

    return {
      month: format(month, 'MMM'),
      count: monthPayouts.length,
      amount: monthPayouts.reduce((sum, p) => sum + p.amount, 0),
      disbursed: disbursed.length,
      disbursedAmount: disbursed.reduce((sum, p) => sum + p.amount, 0)
    };
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-32 w-full" />
        <div className="grid md:grid-cols-4 gap-6">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Payout Dashboard</h1>
          <p className="text-gray-600 mt-1">
            Real-time analytics and insights for member payouts
          </p>
        </div>
        <div className="flex gap-3">
          <Button asChild variant="outline">
            <Link to={createPageUrl('PayoutApproval')}>
              <CheckSquare className="h-4 w-4 mr-2" />
              Approve Payouts
            </Link>
          </Button>
          <Button asChild className="bg-blue-600 hover:bg-blue-700">
            <Link to={createPageUrl('PayoutReporting')}>
              <FileText className="h-4 w-4 mr-2" />
              View Reports
            </Link>
          </Button>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid md:grid-cols-4 gap-6">
        <StatCard
          icon={DollarSign}
          label="Total Payouts"
          value={stats.totalPayouts}
          sublabel={`$${stats.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} total`}
          color="blue"
        />
        <StatCard
          icon={TrendingUp}
          label="Average Amount"
          value={`$${stats.averageAmount.toFixed(2)}`}
          sublabel="Per payout"
          color="green"
        />
        <StatCard
          icon={CheckCircle}
          label="Disbursed"
          value={`$${stats.totalDisbursed.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          sublabel={`${stats.byStatus.disbursed} payouts completed`}
          color="green"
        />
        <StatCard
          icon={Clock}
          label="Pending Approval"
          value={stats.byStatus.pending}
          sublabel="Awaiting action"
          color="orange"
          onClick={() => window.location.href = createPageUrl('PayoutApproval')}
        />
      </div>

      {/* Charts Row */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Status Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Payout Status Distribution</CardTitle>
            <CardDescription>
              Breakdown of payouts by current status
            </CardDescription>
          </CardHeader>
          <CardContent>
            {statusData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={statusData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, value }) => `${name}: ${value}`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {statusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[300px] text-gray-500">
                No payout data available
              </div>
            )}
          </CardContent>
        </Card>

        {/* Status Counts */}
        <Card>
          <CardHeader>
            <CardTitle>Status Summary</CardTitle>
            <CardDescription>
              Current count by payout status
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={statusData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" fill="#3b82f6">
                  {statusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Trends Over Time */}
      <Card>
        <CardHeader>
          <CardTitle>Payout Trends (Last 6 Months)</CardTitle>
          <CardDescription>
            Monthly payout volume and disbursement amounts
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={350}>
            <LineChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis yAxisId="left" />
              <YAxis yAxisId="right" orientation="right" />
              <Tooltip 
                formatter={(value, name) => {
                  if (name.includes('Amount')) {
                    return [`$${Number(value).toFixed(2)}`, name];
                  }
                  return [value, name];
                }}
              />
              <Legend />
              <Line 
                yAxisId="left"
                type="monotone" 
                dataKey="count" 
                stroke="#3b82f6" 
                strokeWidth={2}
                name="Total Payouts"
              />
              <Line 
                yAxisId="left"
                type="monotone" 
                dataKey="disbursed" 
                stroke="#10b981" 
                strokeWidth={2}
                name="Disbursed Count"
              />
              <Line 
                yAxisId="right"
                type="monotone" 
                dataKey="disbursedAmount" 
                stroke="#f59e0b" 
                strokeWidth={2}
                name="Disbursed Amount ($)"
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <div className="grid md:grid-cols-2 gap-6">
        <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200 cursor-pointer hover:shadow-lg transition-shadow"
          onClick={() => window.location.href = createPageUrl('PayoutApproval')}>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-orange-900">Review Pending Payouts</h3>
                <p className="text-sm text-orange-700 mt-1">
                  {stats.byStatus.pending} payout{stats.byStatus.pending !== 1 ? 's' : ''} awaiting approval
                </p>
                <Button className="mt-4 bg-orange-600 hover:bg-orange-700">
                  Go to Approvals
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
              <div className="h-16 w-16 rounded-full bg-orange-200 flex items-center justify-center">
                <CheckSquare className="h-8 w-8 text-orange-700" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200 cursor-pointer hover:shadow-lg transition-shadow"
          onClick={() => window.location.href = createPageUrl('PayoutReporting')}>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-blue-900">Advanced Reports</h3>
                <p className="text-sm text-blue-700 mt-1">
                  Detailed analytics and CSV export
                </p>
                <Button className="mt-4 bg-blue-600 hover:bg-blue-700">
                  View Reports
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
              <div className="h-16 w-16 rounded-full bg-blue-200 flex items-center justify-center">
                <FileText className="h-8 w-8 text-blue-700" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity Alert */}
      {stats.last30Days > 0 && (
        <Card className="bg-gradient-to-r from-green-50 to-emerald-50 border-green-200">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <CheckCircle className="h-6 w-6 text-green-600" />
              <div>
                <p className="font-semibold text-green-900">
                  {stats.last30Days} payouts processed in the last 30 days
                </p>
                <p className="text-sm text-green-700">
                  System is operating normally
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}