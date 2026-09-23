import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { Users, TrendingUp } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

export default function MembershipGrowthChart({ data, isLoading, detailed = false }) {
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

  const formatPeriod = (period) => {
    const [year, month] = period.split('-');
    return new Date(year, month - 1).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Membership Growth
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          {detailed ? (
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="period" 
                tickFormatter={formatPeriod}
              />
              <YAxis />
              <Tooltip 
                labelFormatter={formatPeriod}
                formatter={(value, name) => [value, name === 'newMembers' ? 'New Members' : 'Total Members']}
              />
              <Bar dataKey="newMembers" fill="#3B82F6" name="New Members" />
              <Bar dataKey="totalMembers" fill="#10B981" name="Total Members" />
            </BarChart>
          ) : (
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="period" 
                tickFormatter={formatPeriod}
              />
              <YAxis />
              <Tooltip 
                labelFormatter={formatPeriod}
                formatter={(value, name) => [value, name === 'totalMembers' ? 'Total Members' : 'New Members']}
              />
              <Line 
                type="monotone" 
                dataKey="totalMembers" 
                stroke="#3B82F6" 
                strokeWidth={2}
                name="Total Members"
              />
              <Line 
                type="monotone" 
                dataKey="newMembers" 
                stroke="#10B981" 
                strokeWidth={2}
                name="New Members"
              />
            </LineChart>
          )}
        </ResponsiveContainer>
        {data.length === 0 && (
          <div className="flex items-center justify-center h-64 text-gray-500">
            <div className="text-center">
              <TrendingUp className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p>No membership data available for this period</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}