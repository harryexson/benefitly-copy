import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { CreditCard, TrendingUp } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

const COLORS = ['#10B981', '#F59E0B', '#EF4444'];

export default function ContributionAnalysisChart({ data, isLoading }) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-64 w-full" />
        </CardContent>
      </Card>
    );
  }

  const contributionStatusData = [
    { name: 'Paid', value: data.contributionStatus.paid, color: COLORS[0] },
    { name: 'Due', value: data.contributionStatus.due, color: COLORS[1] },
    { name: 'Past Due', value: data.contributionStatus.pastDue, color: COLORS[2] }
  ].filter(item => item.value > 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="h-5 w-5" />
          Contribution Status Analysis
        </CardTitle>
      </CardHeader>
      <CardContent>
        {contributionStatusData.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={contributionStatusData}
                cx="50%"
                cy="50%"
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
                label={({ name, value, percent }) => `${name}: ${value} (${(percent * 100).toFixed(0)}%)`}
              >
                {contributionStatusData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex items-center justify-center h-64 text-gray-500">
            <div className="text-center">
              <TrendingUp className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p>No contribution data available for this period</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}