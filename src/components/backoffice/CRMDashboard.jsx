import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { AssociationAccount, Member, EventContribution, SupportTicket } from '@/entities/all';
import { Users, DollarSign, TrendingUp, AlertCircle, Search, Mail, Phone, Building2 } from 'lucide-react';

export default function CRMDashboard() {
  const [accounts, setAccounts] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [customerInsights, setCustomerInsights] = useState({});
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadCRMData();
  }, []);

  const loadCRMData = async () => {
    try {
      const accountsData = await AssociationAccount.list();
      setAccounts(accountsData);

      // Calculate insights for each account
      const insights = {};
      for (const account of accountsData) {
        const members = await Member.filter({ created_by: account.owner_user_id });
        const contributions = await EventContribution.list();
        const tickets = await SupportTicket.filter({ association_account_id: account.id });

        insights[account.id] = {
          memberCount: members.length,
          ticketCount: tickets.length,
          lifetime_value: account.total_revenue || 0,
          engagement_score: calculateEngagementScore(account, members, contributions),
          health_status: determineHealthStatus(account, tickets)
        };
      }
      setCustomerInsights(insights);
    } catch (error) {
      console.error('Failed to load CRM data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const calculateEngagementScore = (account, members, contributions) => {
    // Simple engagement calculation
    const memberScore = members.length * 10;
    const activityScore = (account.current_member_count || 0) * 5;
    return Math.min(100, memberScore + activityScore);
  };

  const determineHealthStatus = (account, tickets) => {
    if (account.account_status === 'suspended') return 'critical';
    if (tickets.filter(t => t.status === 'open').length > 3) return 'warning';
    if (account.account_status === 'active') return 'healthy';
    return 'neutral';
  };

  const filteredAccounts = accounts.filter(account =>
    account.organization_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    account.contact_email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const healthColors = {
    healthy: 'bg-green-100 text-green-800',
    warning: 'bg-yellow-100 text-yellow-800',
    critical: 'bg-red-100 text-red-800',
    neutral: 'bg-gray-100 text-gray-800'
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Customer Relationship Management</CardTitle>
          <CardDescription>Manage customer accounts, track engagement, and monitor health</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="overview" className="w-full">
            <TabsList>
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="customers">All Customers</TabsTrigger>
              <TabsTrigger value="segments">Segments</TabsTrigger>
              <TabsTrigger value="insights">Insights</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-4">
                      <Users className="h-8 w-8 text-blue-600" />
                      <div>
                        <p className="text-2xl font-bold">{accounts.length}</p>
                        <p className="text-sm text-gray-500">Total Customers</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-4">
                      <DollarSign className="h-8 w-8 text-green-600" />
                      <div>
                        <p className="text-2xl font-bold">
                          ${(accounts.reduce((sum, a) => sum + (a.total_revenue || 0), 0) / 1000).toFixed(1)}K
                        </p>
                        <p className="text-sm text-gray-500">Total Revenue</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-4">
                      <TrendingUp className="h-8 w-8 text-purple-600" />
                      <div>
                        <p className="text-2xl font-bold">
                          {accounts.filter(a => a.account_status === 'active').length}
                        </p>
                        <p className="text-sm text-gray-500">Active Accounts</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-4">
                      <AlertCircle className="h-8 w-8 text-orange-600" />
                      <div>
                        <p className="text-2xl font-bold">
                          {Object.values(customerInsights).filter(i => i.health_status === 'critical' || i.health_status === 'warning').length}
                        </p>
                        <p className="text-sm text-gray-500">At Risk</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Recent Activity */}
              <Card>
                <CardHeader>
                  <CardTitle>Recent Customer Activity</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {accounts.slice(0, 5).map(account => {
                      const insight = customerInsights[account.id] || {};
                      return (
                        <div key={account.id} className="flex items-center justify-between p-3 border rounded-lg">
                          <div className="flex items-center gap-3">
                            <Building2 className="h-8 w-8 text-gray-400" />
                            <div>
                              <p className="font-medium">{account.organization_name}</p>
                              <p className="text-sm text-gray-500">{account.contact_email}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <Badge className={healthColors[insight.health_status || 'neutral']}>
                              {insight.health_status || 'neutral'}
                            </Badge>
                            <div className="text-right">
                              <p className="text-sm font-semibold">${(insight.lifetime_value || 0).toFixed(0)}</p>
                              <p className="text-xs text-gray-500">LTV</p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="customers" className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search customers..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Button>Export</Button>
              </div>

              <div className="space-y-2">
                {filteredAccounts.map(account => {
                  const insight = customerInsights[account.id] || {};
                  return (
                    <Card key={account.id} className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => setSelectedAccount(account)}>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <h4 className="font-semibold text-lg">{account.organization_name}</h4>
                              <Badge className={healthColors[insight.health_status || 'neutral']}>
                                {insight.health_status || 'neutral'}
                              </Badge>
                              <Badge variant="outline">{account.account_status}</Badge>
                            </div>
                            <div className="grid grid-cols-3 gap-4 text-sm">
                              <div className="flex items-center gap-2">
                                <Mail className="h-4 w-4 text-gray-400" />
                                <span className="text-gray-600">{account.contact_email}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <Phone className="h-4 w-4 text-gray-400" />
                                <span className="text-gray-600">{account.contact_phone}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <Users className="h-4 w-4 text-gray-400" />
                                <span className="text-gray-600">{insight.memberCount || 0} members</span>
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-2xl font-bold text-green-600">${(insight.lifetime_value || 0).toFixed(0)}</p>
                            <p className="text-xs text-gray-500">Lifetime Value</p>
                            <div className="mt-2">
                              <div className="w-24 bg-gray-200 rounded-full h-2">
                                <div 
                                  className="bg-blue-600 h-2 rounded-full" 
                                  style={{ width: `${insight.engagement_score || 0}%` }}
                                />
                              </div>
                              <p className="text-xs text-gray-500 mt-1">Engagement</p>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </TabsContent>

            <TabsContent value="segments" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">High Value</CardTitle>
                    <CardDescription>LTV &gt; $5,000</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-3xl font-bold">
                      {accounts.filter(a => (customerInsights[a.id]?.lifetime_value || 0) > 5000).length}
                    </p>
                    <p className="text-sm text-gray-500">customers</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">At Risk</CardTitle>
                    <CardDescription>Need attention</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-3xl font-bold text-orange-600">
                      {Object.values(customerInsights).filter(i => i.health_status === 'warning' || i.health_status === 'critical').length}
                    </p>
                    <p className="text-sm text-gray-500">customers</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">New Customers</CardTitle>
                    <CardDescription>Last 30 days</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-3xl font-bold text-green-600">
                      {accounts.filter(a => {
                        const created = new Date(a.created_date);
                        const thirtyDaysAgo = new Date();
                        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
                        return created > thirtyDaysAgo;
                      }).length}
                    </p>
                    <p className="text-sm text-gray-500">customers</p>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="insights" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Key Insights</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <h4 className="font-semibold text-blue-900 mb-2">🎯 Retention Opportunity</h4>
                    <p className="text-sm text-blue-800">
                      {Object.values(customerInsights).filter(i => i.health_status === 'warning').length} customers 
                      showing warning signs. Proactive outreach recommended.
                    </p>
                  </div>

                  <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                    <h4 className="font-semibold text-green-900 mb-2">💰 Revenue Growth</h4>
                    <p className="text-sm text-green-800">
                      Average customer LTV is ${(
                        Object.values(customerInsights).reduce((sum, i) => sum + (i.lifetime_value || 0), 0) / 
                        Math.max(1, Object.keys(customerInsights).length)
                      ).toFixed(0)}. Focus on upsell opportunities.
                    </p>
                  </div>

                  <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
                    <h4 className="font-semibold text-purple-900 mb-2">📈 Engagement Trends</h4>
                    <p className="text-sm text-purple-800">
                      High engagement customers ({Object.values(customerInsights).filter(i => i.engagement_score > 70).length}) 
                      are 3x more likely to renew. Consider loyalty program.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}