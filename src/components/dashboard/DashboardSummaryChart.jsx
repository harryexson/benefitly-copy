import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Skeleton } from '@/components/ui/skeleton';
import { TrendingUp } from 'lucide-react';

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white/80 backdrop-blur-sm p-3 border rounded-lg shadow-lg">
        <p className="font-bold text-gray-800">{label}</p>
        {payload.map((p, i) => (
          <p key={i} style={{ color: p.color }}>
            {`${p.name}: $${p.value.toFixed(2)}`}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

export default function DashboardSummaryChart({ data, isLoading }) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48 mb-2" />
          <Skeleton className="h-4 w-64" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-72 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-sm col-span-2">
      <CardHeader>
        <CardTitle>Financial Overview</CardTitle>
        <CardDescription>A summary of revenue vs. payouts for the selected period.</CardDescription>
      </CardHeader>
      <CardContent>
        {data.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data} margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.3} />
              <XAxis 
                dataKey="period" 
                tick={{ fontSize: 12 }} 
                axisLine={false} 
                tickLine={false}
              />
              <YAxis 
                tickFormatter={(value) => `$${value / 1000}k`} 
                tick={{ fontSize: 12 }} 
                axisLine={false} 
                tickLine={false}
                width={50}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(230, 230, 230, 0.4)' }} />
              <Legend wrapperStyle={{ fontSize: '14px', paddingTop: '20px' }} />
              <Bar dataKey="revenue" fill="#10B981" name="Revenue" radius={[4, 4, 0, 0]} />
              <Bar dataKey="payouts" fill="#EF4444" name="Payouts" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex items-center justify-center h-72 text-gray-500">
            <div className="text-center">
              <TrendingUp className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p>No financial data available for this period</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}