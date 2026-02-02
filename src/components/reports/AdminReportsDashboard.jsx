import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  DollarSign, Users, Calendar, TrendingUp, TrendingDown,
  CheckCircle, AlertCircle, Clock, Target, Activity,
  ArrowUpRight, ArrowDownRight
} from 'lucide-react';
import {
  ResponsiveContainer, AreaChart, Area, BarChart, Bar,
  PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend
} from 'recharts';

const COLORS = ['#10B981', '#3B82F6', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];

function MetricCard({ title, value, subtitle, icon: Icon, trend, color = 'blue', onClick }) {
  const colorClasses = {
    green: 'bg-green-100 text-green-600 border-green-200',
    blue: 'bg-blue-100 text-blue-600 border-blue-200',
    orange: 'bg-orange-100 text-orange-600 border-orange-200',
    red: 'bg-red-100 text-red-600 border-red-200',
    purple: 'bg-purple-100 text-purple-600 border-purple-200'
  };

  const bgColors = {
    green: 'bg-green-50 hover:bg-green-100',
    blue: 'bg-blue-50 hover:bg-blue-100',
    orange: 'bg-orange-50 hover:bg-orange-100',
    red: 'bg-red-50 hover:bg-red-100',
    purple: 'bg-purple-50 hover:bg-purple-100'
  };

  return (
    <Card 
      className={`border-l-4 cursor-pointer transition-all ${bgColors[color]}`}
      onClick={onClick}
    >
      <CardContent className="pt-6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p className="text-sm font-medium text-gray-600">{title}</p>
            <p className="text-3xl font-bold mt-2">{value}</p>
            {subtitle && (
              <p className="text-xs text-gray-500 mt-1">{subtitle}</p>
            )}
            {trend && (
              <div className={`flex items-center gap-1 mt-2 text-xs font-medium ${
                trend.isPositive ? 'text-green-600' : 'text-red-600'
              }`}>
                {trend.isPositive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                <span>{trend.text}</span>
              </div>
            )}
          </div>
          <div className={`p-3 rounded-full border-2 ${colorClasses[color]}`}>
            <Icon className="h-6 w-6" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function AdminReportsDashboard({ 
  summary, 
  memberAnalytics, 
  eventPerformance,
  trendData,
  onDrillDown 
}) {
  // Member status distribution for pie chart
  const memberStatusData = [
    { name: 'Active', value: memberAnalytics.activeCount, color: '#10B981' },
    { name: 'Pending', value: memberAnalytics.pendingCount, color: '#F59E0B' },
    { name: 'Suspended', value: memberAnalytics.suspendedCount, color: '#EF4444' }
  ].filter(item => item.value > 0);

  // Contribution status for pie chart
  const contributionStatusData = [
    { name: 'Paid', value: memberAnalytics.paidContributions, color: '#10B981' },
    { name: 'Due', value: memberAnalytics.dueContributions, color: '#3B82F6' },
    { name: 'Past Due', value: memberAnalytics.pastDueContributions, color: '#EF4444' }
  ].filter(item => item.value > 0);

  // Event participation data
  const eventParticipationData = eventPerformance.topEvents.slice(0, 6).map(event => ({
    name: event.title.length > 20 ? event.title.substring(0, 20) + '...' : event.title,
    participants: event.participantCount,
    contributions: event.contributionsCollected,
    payouts: event.payoutsDisbursed
  }));

  return (
    <div className="space-y-6">
      {/* Financial Overview Section */}
      <div>
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <DollarSign className="h-5 w-5" />
          Financial Overview
        </h3>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard
            title="Total Revenue"
            value={`$${summary.totalRevenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
            subtitle="Contributions collected"
            icon={ArrowUpRight}
            color="green"
            trend={summary.revenueTrend}
            onClick={() => onDrillDown && onDrillDown('revenue')}
          />
          <MetricCard
            title="Total Payouts"
            value={`$${summary.totalPayouts.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
            subtitle="Benefits disbursed"
            icon={ArrowDownRight}
            color="orange"
            onClick={() => onDrillDown && onDrillDown('payouts')}
          />
          <MetricCard
            title="Outstanding Balance"
            value={`$${summary.outstandingBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
            subtitle={`${summary.overdueCount} overdue`}
            icon={AlertCircle}
            color={summary.overdueCount > 0 ? 'red' : 'blue'}
            onClick={() => onDrillDown && onDrillDown('outstanding')}
          />
          <MetricCard
            title="Net Activity"
            value={`$${summary.netActivity.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
            subtitle="Revenue - Payouts"
            icon={summary.netActivity >= 0 ? TrendingUp : TrendingDown}
            color={summary.netActivity >= 0 ? 'green' : 'red'}
          />
        </div>
      </div>

      {/* Financial Trend Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Financial Trends</CardTitle>
          <CardDescription>Revenue, payouts, and net activity over time</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={trendData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis dataKey="period" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `$${v}`} />
              <Tooltip 
                formatter={(value) => [`$${value.toFixed(2)}`, '']}
                contentStyle={{ borderRadius: '8px', border: '1px solid #E5E7EB' }}
              />
              <Legend />
              <Area 
                type="monotone" 
                dataKey="revenue" 
                name="Revenue"
                stroke="#10B981" 
                fill="#6EE7B7" 
                fillOpacity={0.6}
              />
              <Area 
                type="monotone" 
                dataKey="payouts" 
                name="Payouts"
                stroke="#F59E0B" 
                fill="#FCD34D" 
                fillOpacity={0.6}
              />
              <Area 
                type="monotone" 
                dataKey="netActivity" 
                name="Net Activity"
                stroke="#3B82F6" 
                fill="#93C5FD" 
                fillOpacity={0.6}
              />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Member Analytics Section */}
      <div>
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Users className="h-5 w-5" />
          Member Analytics
        </h3>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <MetricCard
            title="Total Members"
            value={memberAnalytics.totalMembers}
            subtitle={`${memberAnalytics.newMembers} new this period`}
            icon={Users}
            color="blue"
            onClick={() => onDrillDown && onDrillDown('members')}
          />
          <MetricCard
            title="Active Members"
            value={memberAnalytics.activeCount}
            subtitle={`${((memberAnalytics.activeCount / memberAnalytics.totalMembers) * 100).toFixed(1)}% of total`}
            icon={CheckCircle}
            color="green"
          />
          <MetricCard
            title="Engagement Score"
            value={`${memberAnalytics.engagementScore}%`}
            subtitle="Based on activity metrics"
            icon={Activity}
            color="purple"
          />
          <MetricCard
            title="Collection Rate"
            value={`${memberAnalytics.collectionRate.toFixed(1)}%`}
            subtitle="On-time payments"
            icon={Target}
            color={memberAnalytics.collectionRate >= 80 ? 'green' : 'orange'}
          />
        </div>

        {/* Member Status & Contribution Charts */}
        <div className="grid md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Member Status Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-center">
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie
                      data={memberStatusData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={90}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {memberStatusData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex flex-wrap gap-2 justify-center mt-4">
                {memberStatusData.map((entry) => (
                  <Badge 
                    key={entry.name} 
                    variant="outline"
                    style={{ borderColor: entry.color, color: entry.color }}
                  >
                    {entry.name}: {entry.value}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Contribution Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-center">
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie
                      data={contributionStatusData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={90}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {contributionStatusData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex flex-wrap gap-2 justify-center mt-4">
                {contributionStatusData.map((entry) => (
                  <Badge 
                    key={entry.name} 
                    variant="outline"
                    style={{ borderColor: entry.color, color: entry.color }}
                  >
                    {entry.name}: {entry.value}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Event Performance Section */}
      <div>
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Event Performance
        </h3>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <MetricCard
            title="Total Events"
            value={eventPerformance.totalEvents}
            subtitle={`${eventPerformance.activeEvents} currently active`}
            icon={Calendar}
            color="blue"
            onClick={() => onDrillDown && onDrillDown('events')}
          />
          <MetricCard
            title="Total Participation"
            value={eventPerformance.totalParticipants}
            subtitle="Across all events"
            icon={Users}
            color="green"
          />
          <MetricCard
            title="Contributions Generated"
            value={`$${eventPerformance.totalContributions.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
            subtitle="From events"
            icon={DollarSign}
            color="green"
          />
          <MetricCard
            title="Payouts Generated"
            value={`$${eventPerformance.totalPayouts.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
            subtitle="Event-related payouts"
            icon={ArrowDownRight}
            color="orange"
          />
        </div>

        {/* Event Performance Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Top Events by Participation</CardTitle>
            <CardDescription>Events with highest member engagement</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={eventParticipationData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip 
                  contentStyle={{ borderRadius: '8px', border: '1px solid #E5E7EB' }}
                  formatter={(value, name) => {
                    if (name === 'participants') return [value, 'Participants'];
                    return [`$${value.toFixed(2)}`, name === 'contributions' ? 'Contributions' : 'Payouts'];
                  }}
                />
                <Legend />
                <Bar dataKey="participants" name="Participants" fill="#3B82F6" />
                <Bar dataKey="contributions" name="Contributions" fill="#10B981" />
                <Bar dataKey="payouts" name="Payouts" fill="#F59E0B" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Event Status Summary */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-base">Event Status Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-4 bg-blue-50 rounded-lg">
                <p className="text-sm text-gray-600">Published</p>
                <p className="text-2xl font-bold text-blue-600">{eventPerformance.statusBreakdown.published}</p>
              </div>
              <div className="p-4 bg-green-50 rounded-lg">
                <p className="text-sm text-gray-600">Collecting</p>
                <p className="text-2xl font-bold text-green-600">{eventPerformance.statusBreakdown.collecting}</p>
              </div>
              <div className="p-4 bg-purple-50 rounded-lg">
                <p className="text-sm text-gray-600">Closed</p>
                <p className="text-2xl font-bold text-purple-600">{eventPerformance.statusBreakdown.closed}</p>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-600">Draft</p>
                <p className="text-2xl font-bold text-gray-600">{eventPerformance.statusBreakdown.draft}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Key Insights Panel */}
      <Card className="bg-gradient-to-br from-blue-50 to-purple-50 border-blue-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-blue-600" />
            Key Insights
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-3">
            {memberAnalytics.collectionRate < 80 && (
              <li className="flex items-start gap-2">
                <AlertCircle className="h-5 w-5 text-orange-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-orange-900">Collection rate below target</p>
                  <p className="text-sm text-orange-700">
                    Current: {memberAnalytics.collectionRate.toFixed(1)}%. Consider sending payment reminders.
                  </p>
                </div>
              </li>
            )}
            {summary.overdueCount > 0 && (
              <li className="flex items-start gap-2">
                <Clock className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-red-900">{summary.overdueCount} overdue contributions</p>
                  <p className="text-sm text-red-700">
                    ${summary.outstandingBalance.toFixed(2)} outstanding. Follow up with members.
                  </p>
                </div>
              </li>
            )}
            {memberAnalytics.engagementScore >= 80 && (
              <li className="flex items-start gap-2">
                <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-green-900">High member engagement</p>
                  <p className="text-sm text-green-700">
                    {memberAnalytics.engagementScore}% engagement score. Keep up the great work!
                  </p>
                </div>
              </li>
            )}
            {eventPerformance.activeEvents === 0 && (
              <li className="flex items-start gap-2">
                <AlertCircle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-blue-900">No active events</p>
                  <p className="text-sm text-blue-700">
                    Consider creating new events to keep members engaged.
                  </p>
                </div>
              </li>
            )}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}