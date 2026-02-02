import React, { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Building2, Users, TrendingUp, Headphones, DollarSign, BarChart3, Shield, Target } from 'lucide-react';
import CRMDashboard from '../components/backoffice/CRMDashboard';
import MarketingIntelligence from '../components/backoffice/MarketingIntelligence';
import StaffManagement from '../components/backoffice/StaffManagement';
import OperationsDashboard from '../components/backoffice/OperationsDashboard';
import ClientAccountsTable from '../components/backoffice/ClientAccountsTable';
import { AssociationAccount, SupportTicket, User } from '@/entities/all';

export default function BackOfficeHub({ user }) {
  const [stats, setStats] = useState({
    totalAccounts: 0,
    activeAccounts: 0,
    totalRevenue: 0,
    openTickets: 0,
    totalStaff: 0
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadDashboardStats();
  }, []);

  const loadDashboardStats = async () => {
    try {
      const [accounts, tickets, users] = await Promise.all([
        AssociationAccount.list(),
        SupportTicket.list(),
        User.list()
      ]);

      const totalRevenue = accounts.reduce((sum, acc) => sum + (acc.total_revenue || 0), 0);
      const openTickets = tickets.filter(t => t.status === 'open' || t.status === 'in_progress').length;
      const staffUsers = users.filter(u => u.back_office_role && u.back_office_role !== 'None');

      setStats({
        totalAccounts: accounts.length,
        activeAccounts: accounts.filter(a => a.account_status === 'active').length,
        totalRevenue,
        openTickets,
        totalStaff: staffUsers.length
      });
    } catch (error) {
      console.error('Failed to load stats:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Accounts</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalAccounts}</div>
            <p className="text-xs text-muted-foreground">{stats.activeAccounts} active</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${(stats.totalRevenue / 1000).toFixed(1)}K</div>
            <p className="text-xs text-muted-foreground">All-time</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Open Tickets</CardTitle>
            <Headphones className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.openTickets}</div>
            <p className="text-xs text-muted-foreground">Requires attention</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Staff Members</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalStaff}</div>
            <p className="text-xs text-muted-foreground">Back office team</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Growth Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">+12%</div>
            <p className="text-xs text-muted-foreground">vs last month</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Tabs */}
      <Tabs defaultValue="crm" className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="crm">
            <Users className="h-4 w-4 mr-2" />
            CRM
          </TabsTrigger>
          <TabsTrigger value="marketing">
            <Target className="h-4 w-4 mr-2" />
            Marketing & Analysis
          </TabsTrigger>
          <TabsTrigger value="operations">
            <BarChart3 className="h-4 w-4 mr-2" />
            Operations
          </TabsTrigger>
          <TabsTrigger value="staff">
            <Shield className="h-4 w-4 mr-2" />
            Staff
          </TabsTrigger>
          <TabsTrigger value="accounts">
            <Building2 className="h-4 w-4 mr-2" />
            Accounts
          </TabsTrigger>
        </TabsList>

        <TabsContent value="crm" className="space-y-4">
          <CRMDashboard />
        </TabsContent>

        <TabsContent value="marketing" className="space-y-4">
          <MarketingIntelligence />
        </TabsContent>

        <TabsContent value="operations" className="space-y-4">
          <OperationsDashboard />
        </TabsContent>

        <TabsContent value="staff" className="space-y-4">
          <StaffManagement />
        </TabsContent>

        <TabsContent value="accounts" className="space-y-4">
          <ClientAccountsTable />
        </TabsContent>
      </Tabs>
    </div>
  );
}