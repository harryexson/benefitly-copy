import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { DollarSign, Users, TrendingUp, TrendingDown } from 'lucide-react';

const StatCard = ({ title, value, icon: Icon, isLoading }) => (
  <Card>
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
      <CardTitle className="text-sm font-medium text-gray-500">{title}</CardTitle>
      <Icon className="h-5 w-5 text-gray-400" />
    </CardHeader>
    <CardContent>
      {isLoading ? (
        <Skeleton className="h-8 w-24" />
      ) : (
        <div className="text-2xl font-bold">{value}</div>
      )}
    </CardContent>
  </Card>
);

export default function ReportSummaryCards({ summary, isLoading }) {
  const formatCurrency = (amount) => {
    if (typeof amount !== 'number') return '$0.00';
    return amount.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
  };
  
  const netIncomeColor = summary.netIncome >= 0 ? 'text-green-600' : 'text-red-600';
  const NetIncomeIcon = summary.netIncome >= 0 ? TrendingUp : TrendingDown;

  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <StatCard title="Total Revenue" value={formatCurrency(summary.totalRevenue)} icon={DollarSign} isLoading={isLoading} />
        <StatCard title="Total Payouts & Expenses" value={formatCurrency((summary.totalPayouts || 0) + (summary.totalExpenses || 0))} icon={DollarSign} isLoading={isLoading} />
        <Card>
             <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-500">Net Income</CardTitle>
                <NetIncomeIcon className={`h-5 w-5 ${netIncomeColor}`} />
             </CardHeader>
             <CardContent>
                 {isLoading ? (
                    <Skeleton className="h-8 w-24" />
                 ) : (
                    <div className={`text-2xl font-bold ${netIncomeColor}`}>{formatCurrency(summary.netIncome)}</div>
                 )}
             </CardContent>
        </Card>
        <StatCard title="Total Members" value={summary.totalMembers || 0} icon={Users} isLoading={isLoading} />
        <StatCard title="New Members in Period" value={summary.newMembers || 0} icon={Users} isLoading={isLoading} />
    </div>
  );
}