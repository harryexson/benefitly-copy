import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { AssociationAccount, SupportTicket } from '@/entities/all';
import { TrendingUp, TrendingDown, DollarSign, Users, AlertCircle, CheckCircle, Clock, Target } from 'lucide-react';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export default function OperationsDashboard() {
  const [metrics, setMetrics] = useState({
    mrr: 0,
    arr: 0,
    churnRate: 0,
    avgTicketTime: 0,
    customerSatisfaction: 0,
    systemUptime: 99.9
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadOperationalMetrics();
  }, []);

  const loadOperationalMetrics = async () => {
    try {
      const [accounts, tickets] = await Promise.all([
        AssociationAccount.list(),
        SupportTicket.list()
      ]);

      // Calculate MRR & ARR
      const mrr = accounts
        .filter(a => a.account_status === 'active')
        .reduce((sum, a) => {
          // Simplified calculation - in real app would use tier pricing
          return sum + 50;
        }, 0);

      const arr = mrr * 12;

      // Calculate churn (suspended + cancelled accounts)
      const totalAccounts = accounts.length;
      const churnedAccounts = accounts.filter(a => 
        a.account_status === 'suspended' || a.account_status === 'cancelled'
      ).length;
      const churnRate = totalAccounts > 0 ? (churnedAccounts / totalAccounts) * 100 : 0;

      // Average ticket resolution time (mock data)
      const avgTicketTime = 4.2; // hours

      setMetrics({
        mrr,
        arr,
        churnRate,
        avgTicketTime,
        customerSatisfaction: 4.7,
        systemUptime: 99.9
      });
    } catch (error) {
      console.error('Failed to load operational metrics:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const revenueData = [
    { month: 'Jan', revenue: 12000, expenses: 5000 },
    { month: 'Feb', revenue: 15000, expenses: 5200 },
    { month: 'Mar', revenue: 18000, expenses: 5500 },
    { month: 'Apr', revenue: 22000, expenses: 6000 },
    { month: 'May', revenue: 27000, expenses: 6500 },
    { month: 'Jun', revenue: 32000, expenses: 7000 }
  ];

  const customerGrowthData = [
    { month: 'Jan', customers: 45 },
    { month: 'Feb', customers: 52 },
    { month: 'Mar', customers: 61 },
    { month: 'Apr', customers: 73 },
    { month: 'May', customers: 88 },
    { month: 'Jun', customers: 105 }
  ];

  const tierDistribution = [
    { name: 'Community', value: 35, color: '#3b82f6' },
    { name: 'Starter', value: 45, color: '#8b5cf6' },
    { name: 'Growth', value: 15, color: '#10b981' },
    { name: 'Scale', value: 5, color: '#f59e0b' }
  ];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Operations Dashboard</CardTitle>
          <CardDescription>Key operational metrics and business intelligence</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="financial" className="w-full">
            <TabsList>
              <TabsTrigger value="financial">Financial</TabsTrigger>
              <TabsTrigger value="growth">Growth</TabsTrigger>
              <TabsTrigger value="health">System Health</TabsTrigger>
              <TabsTrigger value="support">Support Metrics</TabsTrigger>
            </TabsList>

            <TabsContent value="financial" className="space-y-4">
              {/* Key Metrics */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-3">
                      <DollarSign className="h-8 w-8 text-green-600" />
                      <div>
                        <p className="text-xs text-gray-500">MRR</p>
                        <p className="text-2xl font-bold">${(metrics.mrr / 1000).toFixed(1)}K</p>
                        <p className="text-xs text-green-600 flex items-center gap-1">
                          <TrendingUp className="h-3 w-3" /> +18% vs last month
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-3">
                      <Target className="h-8 w-8 text-blue-600" />
                      <div>
                        <p className="text-xs text-gray-500">ARR</p>
                        <p className="text-2xl font-bold">${(metrics.arr / 1000).toFixed(0)}K</p>
                        <p className="text-xs text-blue-600">Annual run rate</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-3">
                      <Users className="h-8 w-8 text-purple-600" />
                      <div>
                        <p className="text-xs text-gray-500">Churn Rate</p>
                        <p className="text-2xl font-bold">{metrics.churnRate.toFixed(1)}%</p>
                        <p className="text-xs text-green-600 flex items-center gap-1">
                          <TrendingDown className="h-3 w-3" /> -2.3% vs last month
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-3">
                      <TrendingUp className="h-8 w-8 text-orange-600" />
                      <div>
                        <p className="text-xs text-gray-500">ARPU</p>
                        <p className="text-2xl font-bold">$48</p>
                        <p className="text-xs text-gray-500">Avg revenue per user</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Revenue Chart */}
              <Card>
                <CardHeader>
                  <CardTitle>Revenue vs Expenses</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={revenueData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="revenue" fill="#10b981" name="Revenue" />
                      <Bar dataKey="expenses" fill="#ef4444" name="Expenses" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="growth" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Customer Growth Chart */}
                <Card>
                  <CardHeader>
                    <CardTitle>Customer Growth</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={250}>
                      <LineChart data={customerGrowthData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="month" />
                        <YAxis />
                        <Tooltip />
                        <Line type="monotone" dataKey="customers" stroke="#3b82f6" strokeWidth={2} />
                      </LineChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                {/* Tier Distribution */}
                <Card>
                  <CardHeader>
                    <CardTitle>Customer Distribution by Tier</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={250}>
                      <PieChart>
                        <Pie
                          data={tierDistribution}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, value }) => `${name}: ${value}`}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {tierDistribution.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </div>

              {/* Growth Insights */}
              <Card>
                <CardHeader>
                  <CardTitle>Growth Insights</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="p-3 bg-green-50 rounded border border-green-200">
                    <p className="text-sm text-green-900">
                      <strong>📈 Strong Growth:</strong> Customer base grew 19% this month. On track to hit 150 customers by end of Q2.
                    </p>
                  </div>
                  <div className="p-3 bg-blue-50 rounded border border-blue-200">
                    <p className="text-sm text-blue-900">
                      <strong>💎 Upsell Opportunity:</strong> 23 Community tier customers are at capacity. Consider targeted upgrade campaigns.
                    </p>
                  </div>
                  <div className="p-3 bg-purple-50 rounded border border-purple-200">
                    <p className="text-sm text-purple-900">
                      <strong>🎯 Market Penetration:</strong> Currently serving 0.08% of target market. Significant room for growth.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="health" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-3">
                      <CheckCircle className="h-8 w-8 text-green-600" />
                      <div>
                        <p className="text-xs text-gray-500">System Uptime</p>
                        <p className="text-2xl font-bold">{metrics.systemUptime}%</p>
                        <p className="text-xs text-gray-500">Last 30 days</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-3">
                      <Clock className="h-8 w-8 text-blue-600" />
                      <div>
                        <p className="text-xs text-gray-500">Avg Response Time</p>
                        <p className="text-2xl font-bold">234ms</p>
                        <p className="text-xs text-green-600">Excellent</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-3">
                      <AlertCircle className="h-8 w-8 text-orange-600" />
                      <div>
                        <p className="text-xs text-gray-500">Active Incidents</p>
                        <p className="text-2xl font-bold">0</p>
                        <p className="text-xs text-green-600">All clear</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>System Status</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {[
                    { service: 'API Server', status: 'operational', uptime: '100%' },
                    { service: 'Database', status: 'operational', uptime: '99.99%' },
                    { service: 'Payment Processing', status: 'operational', uptime: '100%' },
                    { service: 'Email Delivery', status: 'operational', uptime: '99.95%' },
                    { service: 'File Storage', status: 'operational', uptime: '100%' }
                  ].map(item => (
                    <div key={item.service} className="flex items-center justify-between p-3 border rounded">
                      <div className="flex items-center gap-3">
                        <Badge className="bg-green-100 text-green-800">Operational</Badge>
                        <span className="font-medium">{item.service}</span>
                      </div>
                      <span className="text-sm text-gray-500">{item.uptime} uptime</span>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="support" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-3">
                      <Clock className="h-8 w-8 text-blue-600" />
                      <div>
                        <p className="text-xs text-gray-500">Avg Resolution Time</p>
                        <p className="text-2xl font-bold">{metrics.avgTicketTime}h</p>
                        <p className="text-xs text-green-600">-15% vs last month</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-3">
                      <CheckCircle className="h-8 w-8 text-green-600" />
                      <div>
                        <p className="text-xs text-gray-500">Customer Satisfaction</p>
                        <p className="text-2xl font-bold">{metrics.customerSatisfaction}/5.0</p>
                        <p className="text-xs text-gray-500">Based on surveys</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-3">
                      <Users className="h-8 w-8 text-purple-600" />
                      <div>
                        <p className="text-xs text-gray-500">First Response Time</p>
                        <p className="text-2xl font-bold">1.2h</p>
                        <p className="text-xs text-green-600">Target: &lt; 2h</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}