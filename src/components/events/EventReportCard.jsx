import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  DollarSign, Users, Ticket, TrendingUp, 
  CheckCircle2, Clock, Download, PieChart 
} from 'lucide-react';
import { EventContribution, EventTicket, EventRSVP, Payout } from '@/entities/all';
import { Skeleton } from '@/components/ui/skeleton';
import { PieChart as RechartsPieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

const COLORS = ['#22c55e', '#f59e0b', '#ef4444', '#3b82f6'];

export default function EventReportCard({ event }) {
  const [contributions, setContributions] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [rsvps, setRsvps] = useState([]);
  const [payouts, setPayouts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (event?.id) loadReportData();
  }, [event?.id]);

  const loadReportData = async () => {
    try {
      setIsLoading(true);
      const [contribList, ticketList, rsvpList, payoutList] = await Promise.all([
        EventContribution.filter({ event_id: event.id }),
        EventTicket.filter({ event_id: event.id }),
        EventRSVP.filter({ event_id: event.id }),
        Payout.filter({ event_id: event.id })
      ]);
      setContributions(contribList);
      setTickets(ticketList);
      setRsvps(rsvpList);
      setPayouts(payoutList);
    } catch (error) {
      console.error('Failed to load report data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="grid grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-24" />)}
          </div>
        </CardContent>
      </Card>
    );
  }

  // Calculate metrics
  const totalContributionsExpected = contributions.reduce((sum, c) => sum + (c.amount_due || 0), 0);
  const totalContributionsCollected = contributions.filter(c => c.status === 'Paid').reduce((sum, c) => sum + (c.amount_paid || 0), 0);
  const contributionRate = contributions.length > 0 ? (contributions.filter(c => c.status === 'Paid').length / contributions.length) * 100 : 0;

  const totalTicketRevenue = tickets.filter(t => t.payment_status === 'paid').reduce((sum, t) => sum + (t.total_amount || 0), 0);
  const ticketsSold = tickets.filter(t => t.status === 'confirmed' || t.status === 'checked_in').reduce((sum, t) => sum + t.quantity, 0);
  const ticketsCheckedIn = tickets.filter(t => t.status === 'checked_in').reduce((sum, t) => sum + t.quantity, 0);

  const totalPayoutsDisbursed = payouts.filter(p => p.status === 'Disbursed').reduce((sum, p) => sum + p.amount, 0);

  const rsvpGoing = rsvps.filter(r => r.status === 'going').length;
  const rsvpMaybe = rsvps.filter(r => r.status === 'maybe').length;
  const rsvpNo = rsvps.filter(r => r.status === 'not_going').length;

  const contributionStatusData = [
    { name: 'Paid', value: contributions.filter(c => c.status === 'Paid').length, color: '#22c55e' },
    { name: 'Due', value: contributions.filter(c => c.status === 'Due').length, color: '#f59e0b' },
    { name: 'Past Due', value: contributions.filter(c => c.status === 'Past Due').length, color: '#ef4444' },
    { name: 'Written Off', value: contributions.filter(c => c.status === 'Written Off').length, color: '#9ca3af' }
  ].filter(d => d.value > 0);

  const exportReport = () => {
    const reportData = {
      event: event.title,
      date: event.event_date,
      contributions: {
        expected: totalContributionsExpected,
        collected: totalContributionsCollected,
        rate: contributionRate.toFixed(1) + '%'
      },
      tickets: {
        sold: ticketsSold,
        revenue: totalTicketRevenue,
        checkedIn: ticketsCheckedIn
      },
      rsvps: { going: rsvpGoing, maybe: rsvpMaybe, declined: rsvpNo },
      payouts: totalPayoutsDisbursed
    };

    const csvContent = `Event Report: ${event.title}\nDate: ${event.event_date}\n\nContributions\nExpected,$${totalContributionsExpected}\nCollected,$${totalContributionsCollected}\nCollection Rate,${contributionRate.toFixed(1)}%\n\nTickets\nSold,${ticketsSold}\nRevenue,$${totalTicketRevenue}\nChecked In,${ticketsCheckedIn}\n\nRSVPs\nGoing,${rsvpGoing}\nMaybe,${rsvpMaybe}\nDeclined,${rsvpNo}\n\nPayouts Disbursed,$${totalPayoutsDisbursed}`;

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${event.title.replace(/[^a-z0-9]/gi, '_')}_report.csv`;
    a.click();
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <PieChart className="h-5 w-5" />
          Event Report
        </CardTitle>
        <Button variant="outline" size="sm" onClick={exportReport}>
          <Download className="h-4 w-4 mr-2" />
          Export
        </Button>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="overview">
          <TabsList className="mb-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="contributions">Contributions</TabsTrigger>
            <TabsTrigger value="attendance">Attendance</TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
                    <DollarSign className="h-4 w-4" />
                    Contributions
                  </div>
                  <p className="text-2xl font-bold">${totalContributionsCollected.toFixed(0)}</p>
                  <p className="text-xs text-gray-500">of ${totalContributionsExpected.toFixed(0)} expected</p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
                    <Ticket className="h-4 w-4" />
                    Ticket Sales
                  </div>
                  <p className="text-2xl font-bold">${totalTicketRevenue.toFixed(0)}</p>
                  <p className="text-xs text-gray-500">{ticketsSold} tickets sold</p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
                    <Users className="h-4 w-4" />
                    Attendance
                  </div>
                  <p className="text-2xl font-bold">{rsvpGoing + ticketsCheckedIn}</p>
                  <p className="text-xs text-gray-500">{ticketsCheckedIn} checked in</p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
                    <TrendingUp className="h-4 w-4" />
                    Payouts
                  </div>
                  <p className="text-2xl font-bold">${totalPayoutsDisbursed.toFixed(0)}</p>
                  <p className="text-xs text-gray-500">{payouts.filter(p => p.status === 'Disbursed').length} payouts</p>
                </CardContent>
              </Card>
            </div>

            <div className="p-4 bg-gray-50 rounded-lg">
              <h4 className="font-medium mb-2">Net Revenue</h4>
              <p className="text-3xl font-bold text-green-600">
                ${(totalContributionsCollected + totalTicketRevenue - totalPayoutsDisbursed).toFixed(2)}
              </p>
            </div>
          </TabsContent>

          <TabsContent value="contributions">
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-medium mb-4">Collection Progress</h4>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Collection Rate</span>
                      <span className="font-medium">{contributionRate.toFixed(1)}%</span>
                    </div>
                    <Progress value={contributionRate} className="h-3" />
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="p-3 bg-green-50 rounded-lg">
                      <p className="text-green-800 font-medium">Collected</p>
                      <p className="text-xl font-bold text-green-600">${totalContributionsCollected.toFixed(0)}</p>
                    </div>
                    <div className="p-3 bg-orange-50 rounded-lg">
                      <p className="text-orange-800 font-medium">Outstanding</p>
                      <p className="text-xl font-bold text-orange-600">${(totalContributionsExpected - totalContributionsCollected).toFixed(0)}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="font-medium mb-4">Status Breakdown</h4>
                {contributionStatusData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={200}>
                    <RechartsPieChart>
                      <Pie
                        data={contributionStatusData}
                        cx="50%"
                        cy="50%"
                        innerRadius={40}
                        outerRadius={80}
                        dataKey="value"
                        label={({ name, value }) => `${name}: ${value}`}
                      >
                        {contributionStatusData.map((entry, index) => (
                          <Cell key={index} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </RechartsPieChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-gray-500 text-center py-8">No contribution data</p>
                )}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="attendance">
            <div className="grid md:grid-cols-3 gap-4">
              <Card className="bg-green-50">
                <CardContent className="p-4 text-center">
                  <CheckCircle2 className="h-8 w-8 mx-auto text-green-500 mb-2" />
                  <p className="text-2xl font-bold text-green-700">{rsvpGoing}</p>
                  <p className="text-sm text-green-600">Going</p>
                </CardContent>
              </Card>
              <Card className="bg-yellow-50">
                <CardContent className="p-4 text-center">
                  <Clock className="h-8 w-8 mx-auto text-yellow-500 mb-2" />
                  <p className="text-2xl font-bold text-yellow-700">{rsvpMaybe}</p>
                  <p className="text-sm text-yellow-600">Maybe</p>
                </CardContent>
              </Card>
              <Card className="bg-red-50">
                <CardContent className="p-4 text-center">
                  <Users className="h-8 w-8 mx-auto text-red-500 mb-2" />
                  <p className="text-2xl font-bold text-red-700">{rsvpNo}</p>
                  <p className="text-sm text-red-600">Declined</p>
                </CardContent>
              </Card>
            </div>

            {event.is_paid_event && (
              <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                <h4 className="font-medium text-blue-900 mb-2">Ticket Check-In Rate</h4>
                <div className="flex items-center gap-4">
                  <Progress value={ticketsSold > 0 ? (ticketsCheckedIn / ticketsSold) * 100 : 0} className="flex-1 h-3" />
                  <span className="font-bold text-blue-700">
                    {ticketsCheckedIn} / {ticketsSold}
                  </span>
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}