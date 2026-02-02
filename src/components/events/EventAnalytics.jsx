import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Users, DollarSign, Clock, UserCheck, Ticket 
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from 'recharts';

const COLORS = ['#10B981', '#3B82F6', '#F59E0B', '#EF4444', '#8B5CF6'];

export default function EventAnalytics({ 
  event, 
  contributions, 
  payouts, 
  tickets, 
  rsvps,
  volunteers,
  members 
}) {
  // Calculate key metrics
  const totalMembers = members?.length || 0;
  const contributionStats = {
    total: contributions?.length || 0,
    paid: contributions?.filter(c => c.status === 'Paid').length || 0,
    pending: contributions?.filter(c => ['Due', 'Past Due'].includes(c.status)).length || 0,
    revenue: contributions?.filter(c => c.status === 'Paid').reduce((sum, c) => sum + (c.amount_paid || 0), 0) || 0,
    outstanding: contributions?.filter(c => ['Due', 'Past Due'].includes(c.status)).reduce((sum, c) => sum + c.amount_due, 0) || 0
  };

  const ticketStats = {
    total: tickets?.length || 0,
    checkedIn: tickets?.filter(t => t.checked_in).length || 0,
    pending: tickets?.filter(t => !t.checked_in).length || 0,
    revenue: event?.total_revenue || 0
  };

  const rsvpStats = {
    total: rsvps?.length || 0,
    confirmed: rsvps?.filter(r => r.status === 'Confirmed').length || 0,
    declined: rsvps?.filter(r => r.status === 'Declined').length || 0,
    pending: rsvps?.filter(r => r.status === 'Pending').length || 0
  };

  const volunteerStats = {
    total: volunteers?.length || 0,
    confirmed: volunteers?.filter(v => v.status === 'Confirmed').length || 0,
    attended: volunteers?.filter(v => v.status === 'Attended').length || 0
  };

  const payoutStats = {
    total: payouts?.reduce((sum, p) => sum + p.amount, 0) || 0,
    disbursed: payouts?.filter(p => p.status === 'Disbursed').reduce((sum, p) => sum + p.amount, 0) || 0,
    pending: payouts?.filter(p => ['Pending Approval', 'Approved'].includes(p.status)).reduce((sum, p) => sum + p.amount, 0) || 0
  };

  // Engagement metrics
  const engagementRate = totalMembers > 0 
    ? ((contributionStats.paid / totalMembers) * 100).toFixed(1) 
    : 0;

  const collectionRate = contributionStats.total > 0 
    ? ((contributionStats.paid / contributionStats.total) * 100).toFixed(1) 
    : 0;

  const attendanceRate = ticketStats.total > 0 
    ? ((ticketStats.checkedIn / ticketStats.total) * 100).toFixed(1) 
    : 0;

  // Prepare chart data
  const contributionBreakdown = [
    { name: 'Paid', value: contributionStats.paid, color: '#10B981' },
    { name: 'Pending', value: contributionStats.pending, color: '#F59E0B' }
  ].filter(item => item.value > 0);

  const rsvpBreakdown = [
    { name: 'Confirmed', value: rsvpStats.confirmed, color: '#10B981' },
    { name: 'Declined', value: rsvpStats.declined, color: '#EF4444' },
    { name: 'Pending', value: rsvpStats.pending, color: '#F59E0B' }
  ].filter(item => item.value > 0);

  const financialSummary = [
    { category: 'Contributions', amount: contributionStats.revenue },
    { category: 'Tickets', amount: ticketStats.revenue },
    { category: 'Payouts', amount: -payoutStats.disbursed }
  ];

  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-600 font-medium">Member Participation</p>
                <p className="text-3xl font-bold text-blue-900 mt-1">{engagementRate}%</p>
                <p className="text-xs text-blue-600 mt-1">
                  {contributionStats.paid} of {totalMembers} members
                </p>
              </div>
              <div className="w-12 h-12 rounded-full bg-blue-200 flex items-center justify-center">
                <Users className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-green-600 font-medium">Collection Rate</p>
                <p className="text-3xl font-bold text-green-900 mt-1">{collectionRate}%</p>
                <p className="text-xs text-green-600 mt-1">
                  ${contributionStats.revenue.toFixed(2)} collected
                </p>
              </div>
              <div className="w-12 h-12 rounded-full bg-green-200 flex items-center justify-center">
                <DollarSign className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        {event?.is_paid_event && (
          <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-purple-600 font-medium">Tickets Sold</p>
                  <p className="text-3xl font-bold text-purple-900 mt-1">
                    {ticketStats.total}/{event.tickets_available || 0}
                  </p>
                  <p className="text-xs text-purple-600 mt-1">
                    ${ticketStats.revenue.toFixed(2)} revenue
                  </p>
                </div>
                <div className="w-12 h-12 rounded-full bg-purple-200 flex items-center justify-center">
                  <Ticket className="h-6 w-6 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {event?.check_in_enabled && ticketStats.total > 0 && (
          <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-orange-600 font-medium">Attendance Rate</p>
                  <p className="text-3xl font-bold text-orange-900 mt-1">{attendanceRate}%</p>
                  <p className="text-xs text-orange-600 mt-1">
                    {ticketStats.checkedIn} checked in
                  </p>
                </div>
                <div className="w-12 h-12 rounded-full bg-orange-200 flex items-center justify-center">
                  <UserCheck className="h-6 w-6 text-orange-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Charts */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Contribution Status */}
        {contributionBreakdown.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Contribution Status</CardTitle>
              <CardDescription>Payment collection breakdown</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={contributionBreakdown}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {contributionBreakdown.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex justify-center gap-4 mt-4">
                {contributionBreakdown.map((item) => (
                  <Badge 
                    key={item.name}
                    variant="outline"
                    style={{ borderColor: item.color, color: item.color }}
                  >
                    {item.name}: {item.value}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* RSVP Breakdown */}
        {event?.requires_rsvp && rsvpBreakdown.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>RSVP Status</CardTitle>
              <CardDescription>Response breakdown</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={rsvpBreakdown}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {rsvpBreakdown.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex justify-center gap-4 mt-4">
                {rsvpBreakdown.map((item) => (
                  <Badge 
                    key={item.name}
                    variant="outline"
                    style={{ borderColor: item.color, color: item.color }}
                  >
                    {item.name}: {item.value}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Financial Summary */}
        {(contributionStats.revenue > 0 || ticketStats.revenue > 0 || payoutStats.disbursed > 0) && (
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Financial Summary</CardTitle>
              <CardDescription>Revenue and expenses breakdown</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={financialSummary}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                  <XAxis dataKey="category" />
                  <YAxis tickFormatter={(v) => `$${Math.abs(v)}`} />
                  <Tooltip 
                    formatter={(value) => [`$${Math.abs(value).toFixed(2)}`, '']}
                    contentStyle={{ borderRadius: '8px', border: '1px solid #E5E7EB' }}
                  />
                  <Bar 
                    dataKey="amount" 
                    fill="#3B82F6"
                    radius={[8, 8, 0, 0]}
                  >
                    {financialSummary.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={entry.amount >= 0 ? '#10B981' : '#EF4444'} 
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                <div className="flex justify-between items-center">
                  <span className="font-medium">Net Position:</span>
                  <span className={`text-xl font-bold ${
                    (contributionStats.revenue + ticketStats.revenue - payoutStats.disbursed) >= 0 
                      ? 'text-green-600' 
                      : 'text-red-600'
                  }`}>
                    ${(contributionStats.revenue + ticketStats.revenue - payoutStats.disbursed).toFixed(2)}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Detailed Stats */}
      <div className="grid md:grid-cols-3 gap-4">
        {/* Outstanding Contributions */}
        {contributionStats.outstanding > 0 && (
          <Card className="border-orange-200 bg-orange-50">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-orange-600 font-medium">Outstanding</p>
                  <p className="text-2xl font-bold text-orange-900 mt-1">
                    ${contributionStats.outstanding.toFixed(2)}
                  </p>
                  <p className="text-xs text-orange-600 mt-1">
                    {contributionStats.pending} pending payment{contributionStats.pending !== 1 ? 's' : ''}
                  </p>
                </div>
                <Clock className="h-8 w-8 text-orange-500" />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Volunteers */}
        {volunteerStats.total > 0 && (
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 font-medium">Volunteers</p>
                  <p className="text-2xl font-bold mt-1">{volunteerStats.total}</p>
                  <p className="text-xs text-gray-600 mt-1">
                    {volunteerStats.confirmed} confirmed
                  </p>
                </div>
                <Users className="h-8 w-8 text-gray-400" />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Pending Payouts */}
        {payoutStats.pending > 0 && (
          <Card className="border-yellow-200 bg-yellow-50">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-yellow-600 font-medium">Pending Payouts</p>
                  <p className="text-2xl font-bold text-yellow-900 mt-1">
                    ${payoutStats.pending.toFixed(2)}
                  </p>
                  <p className="text-xs text-yellow-600 mt-1">Awaiting disbursement</p>
                </div>
                <DollarSign className="h-8 w-8 text-yellow-500" />
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}