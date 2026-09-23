import React, { useState, useEffect } from 'react';
import { Event, EventContribution, EventRSVP, EventTicket, Member, Payout, Volunteer } from '@/entities/all';
import { User } from '@/entities/User';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Search, DollarSign, Users, TrendingUp, Calendar, Eye, BarChart3, CreditCard, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import EventAnalytics from '../components/events/EventAnalytics';
import EventRegistrationTracker from '../components/events/EventRegistrationTracker';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

export default function EventDashboard() {
  const [events, setEvents] = useState([]);
  const [contributions, setContributions] = useState([]);
  const [rsvps, setRSVPs] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [members, setMembers] = useState([]);
  const [payouts, setPayouts] = useState([]);
  const [volunteers, setVolunteers] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [currentMember, setCurrentMember] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [processingPayment, setProcessingPayment] = useState(null);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setIsLoading(true);
      const [user, eventsList, contribsList, rsvpsList, ticketsList, membersList, payoutsList, volunteersList] = await Promise.all([
        User.me(),
        Event.list('-created_date'),
        EventContribution.list(),
        EventRSVP.list(),
        EventTicket.list(),
        Member.list(),
        Payout.list(),
        Volunteer.list()
      ]);
      
      setCurrentUser(user);
      setEvents(eventsList);
      setContributions(contribsList);
      setRSVPs(rsvpsList);
      setTickets(ticketsList);
      setMembers(membersList);
      setPayouts(payoutsList);
      setVolunteers(volunteersList);

      // Find current user's member profile
      const memberProfile = membersList.find(m => m.email === user.email);
      setCurrentMember(memberProfile);
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getEventMetrics = (event) => {
    const eventContribs = contributions.filter(c => c.event_id === event.id);
    const eventRSVPs = rsvps.filter(r => r.event_id === event.id);
    const eventTickets = tickets.filter(t => t.event_id === event.id);

    const totalDue = eventContribs.reduce((sum, c) => sum + c.amount_due, 0);
    const totalPaid = eventContribs.reduce((sum, c) => sum + c.amount_paid, 0);
    const paidCount = eventContribs.filter(c => c.status === 'Paid').length;
    const remainingBalance = totalDue - totalPaid;
    const collectionRate = totalDue > 0 ? (totalPaid / totalDue * 100) : 0;

    const confirmedRSVPs = eventRSVPs.filter(r => r.status === 'Confirmed').length;
    const ticketsSold = eventTickets.filter(t => t.payment_status === 'paid').length;
    const ticketRevenue = eventTickets
      .filter(t => t.payment_status === 'paid')
      .reduce((sum, t) => sum + t.amount, 0);

    return {
      totalDue,
      totalPaid,
      remainingBalance,
      collectionRate,
      totalMembers: eventContribs.length,
      paidCount,
      pendingCount: eventContribs.length - paidCount,
      rsvpCount: eventRSVPs.length,
      confirmedRSVPs,
      ticketsSold,
      ticketRevenue,
      contributions: eventContribs,
      rsvps: eventRSVPs,
      tickets: eventTickets
    };
  };

  const getMemberName = (memberId) => {
    const member = members.find(m => m.id === memberId);
    return member ? `${member.first_name} ${member.last_name}` : 'Unknown';
  };

  const handlePayContribution = async (contributionId) => {
    try {
      setProcessingPayment(contributionId);
      
      const response = await base44.functions.invoke('createContributionCheckout', {
        contribution_id: contributionId
      });

      if (response.data.checkoutUrl) {
        window.location.href = response.data.checkoutUrl;
      } else {
        toast.error('Failed to create payment session');
        setProcessingPayment(null);
      }
    } catch (error) {
      console.error('Payment error:', error);
      toast.error('Failed to initiate payment. Please try again.');
      setProcessingPayment(null);
    }
  };

  const filteredEvents = events.filter(event =>
    event.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    event.type.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalMetrics = {
    totalEvents: events.length,
    totalContributions: contributions.reduce((sum, c) => sum + c.amount_paid, 0),
    totalMembers: new Set(contributions.map(c => c.member_id)).size,
    avgCollectionRate: events.length > 0 ? 
      events.reduce((sum, e) => sum + getEventMetrics(e).collectionRate, 0) / events.length : 0
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Event Organizer Dashboard</h2>
        <p className="text-gray-500">Comprehensive metrics and insights for all events</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Events</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalMetrics.totalEvents}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Collected</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalMetrics.totalContributions.toFixed(2)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Contributors</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalMetrics.totalMembers}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Collection Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalMetrics.avgCollectionRate.toFixed(1)}%</div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="relative w-full max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
        <Input
          placeholder="Search events..."
          className="pl-9"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {/* Events List */}
      <div className="space-y-4">
        {filteredEvents.map(event => {
          const metrics = getEventMetrics(event);
          const isSelected = selectedEvent?.id === event.id;

          return (
            <Card key={event.id} className={isSelected ? 'border-blue-500' : ''}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="flex items-center gap-2">
                      {event.title}
                      <Badge variant={
                        event.status === 'Paid' ? 'success' :
                        event.status === 'Collecting' ? 'default' :
                        event.status === 'Announced' ? 'secondary' : 'outline'
                      }>
                        {event.status}
                      </Badge>
                    </CardTitle>
                    <CardDescription className="mt-1">
                      {event.type} • {format(new Date(event.event_date), 'MMM d, yyyy')}
                    </CardDescription>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedEvent(isSelected ? null : event)}
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    {isSelected ? 'Hide' : 'View'} Details
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {/* Metrics Grid */}
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-4">
                  <div>
                    <p className="text-xs text-gray-500">Total Due</p>
                    <p className="text-lg font-semibold">${metrics.totalDue.toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Total Paid</p>
                    <p className="text-lg font-semibold text-green-600">${metrics.totalPaid.toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Remaining</p>
                    <p className="text-lg font-semibold text-orange-600">${metrics.remainingBalance.toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Paid / Total</p>
                    <p className="text-lg font-semibold">{metrics.paidCount} / {metrics.totalMembers}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Collection Rate</p>
                    <p className="text-lg font-semibold">{metrics.collectionRate.toFixed(1)}%</p>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Collection Progress</span>
                    <span className="text-gray-500">{metrics.paidCount} of {metrics.totalMembers} paid</span>
                  </div>
                  <Progress value={metrics.collectionRate} className="h-2" />
                </div>

                {/* Additional Metrics */}
                {(event.requires_rsvp || event.is_paid_event) && (
                  <div className="mt-4 pt-4 border-t grid grid-cols-2 md:grid-cols-3 gap-4">
                    {event.requires_rsvp && (
                      <>
                        <div>
                          <p className="text-xs text-gray-500">Total RSVPs</p>
                          <p className="text-lg font-semibold">{metrics.rsvpCount}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Confirmed</p>
                          <p className="text-lg font-semibold text-green-600">{metrics.confirmedRSVPs}</p>
                        </div>
                      </>
                    )}
                    {event.is_paid_event && (
                      <>
                        <div>
                          <p className="text-xs text-gray-500">Tickets Sold</p>
                          <p className="text-lg font-semibold">{metrics.ticketsSold}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Ticket Revenue</p>
                          <p className="text-lg font-semibold text-green-600">${metrics.ticketRevenue.toFixed(2)}</p>
                        </div>
                      </>
                    )}
                  </div>
                )}

                {/* Detailed View */}
                {isSelected && (
                  <div className="mt-6 pt-6 border-t">
                    <Tabs defaultValue="analytics">
                      <TabsList>
                        <TabsTrigger value="analytics">
                          <BarChart3 className="h-4 w-4 mr-2" />
                          Analytics
                        </TabsTrigger>
                        <TabsTrigger value="registrations">Registrations</TabsTrigger>
                        <TabsTrigger value="contributions">Contributions</TabsTrigger>
                        {event.requires_rsvp && <TabsTrigger value="rsvps">RSVPs</TabsTrigger>}
                        {event.is_paid_event && <TabsTrigger value="tickets">Tickets</TabsTrigger>}
                      </TabsList>

                      <TabsContent value="analytics" className="mt-4">
                        <EventAnalytics
                          event={event}
                          contributions={metrics.contributions}
                          payouts={payouts.filter(p => p.event_id === event.id)}
                          tickets={metrics.tickets}
                          rsvps={metrics.rsvps}
                          volunteers={volunteers.filter(v => v.event_id === event.id)}
                          members={members}
                        />
                      </TabsContent>

                      <TabsContent value="registrations" className="mt-4">
                        <EventRegistrationTracker
                          tickets={metrics.tickets}
                          rsvps={metrics.rsvps}
                          volunteers={volunteers.filter(v => v.event_id === event.id)}
                          contributions={metrics.contributions}
                          members={members}
                        />
                      </TabsContent>

                      <TabsContent value="contributions" className="mt-4">
                        <div className="border rounded-lg">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Member</TableHead>
                                <TableHead>Amount Due</TableHead>
                                <TableHead>Amount Paid</TableHead>
                                <TableHead>Due Date</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">Action</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {metrics.contributions.length > 0 ? (
                                metrics.contributions.map(contrib => {
                                  const isCurrentUserContrib = currentMember && contrib.member_id === currentMember.id;
                                  const canPay = isCurrentUserContrib && (contrib.status === 'Due' || contrib.status === 'Past Due');
                                  
                                  return (
                                    <TableRow key={contrib.id} className={isCurrentUserContrib ? 'bg-blue-50' : ''}>
                                      <TableCell className="font-medium">
                                        {getMemberName(contrib.member_id)}
                                        {isCurrentUserContrib && (
                                          <Badge variant="outline" className="ml-2 text-xs">You</Badge>
                                        )}
                                      </TableCell>
                                      <TableCell>${contrib.amount_due.toFixed(2)}</TableCell>
                                      <TableCell>${contrib.amount_paid.toFixed(2)}</TableCell>
                                      <TableCell>{format(new Date(contrib.due_date), 'MMM d, yyyy')}</TableCell>
                                      <TableCell>
                                        <Badge variant={contrib.status === 'Paid' ? 'success' : 'outline'}
                                          className={contrib.status === 'Past Due' ? 'border-red-500 text-red-700 bg-red-50' : ''}>
                                          {contrib.status}
                                        </Badge>
                                      </TableCell>
                                      <TableCell className="text-right">
                                        {canPay && (
                                          <Button 
                                            size="sm"
                                            onClick={() => handlePayContribution(contrib.id)}
                                            disabled={processingPayment === contrib.id}
                                            className="bg-green-600 hover:bg-green-700"
                                          >
                                            {processingPayment === contrib.id ? (
                                              <>
                                                <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                                                Processing...
                                              </>
                                            ) : (
                                              <>
                                                <CreditCard className="mr-2 h-3 w-3" />
                                                Pay Now
                                              </>
                                            )}
                                          </Button>
                                        )}
                                      </TableCell>
                                    </TableRow>
                                  );
                                })
                              ) : (
                                <TableRow>
                                  <TableCell colSpan="6" className="text-center text-gray-500">
                                    No contributions yet
                                  </TableCell>
                                </TableRow>
                              )}
                            </TableBody>
                          </Table>
                        </div>
                      </TabsContent>

                      {event.requires_rsvp && (
                        <TabsContent value="rsvps" className="mt-4">
                          <div className="border rounded-lg">
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead>Member</TableHead>
                                  <TableHead>RSVP Date</TableHead>
                                  <TableHead>Status</TableHead>
                                  <TableHead>Guest Count</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {metrics.rsvps.length > 0 ? (
                                  metrics.rsvps.map(rsvp => (
                                    <TableRow key={rsvp.id}>
                                      <TableCell className="font-medium">{getMemberName(rsvp.member_id)}</TableCell>
                                      <TableCell>{format(new Date(rsvp.created_date), 'MMM d, yyyy')}</TableCell>
                                      <TableCell>
                                        <Badge variant={rsvp.status === 'Confirmed' ? 'success' : 'outline'}>
                                          {rsvp.status}
                                        </Badge>
                                      </TableCell>
                                      <TableCell>{rsvp.guest_count || 0}</TableCell>
                                    </TableRow>
                                  ))
                                ) : (
                                  <TableRow>
                                    <TableCell colSpan="4" className="text-center text-gray-500">
                                      No RSVPs yet
                                    </TableCell>
                                  </TableRow>
                                )}
                              </TableBody>
                            </Table>
                          </div>
                        </TabsContent>
                      )}

                      {event.is_paid_event && (
                        <TabsContent value="tickets" className="mt-4">
                          <div className="border rounded-lg">
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead>Member</TableHead>
                                  <TableHead>Ticket Type</TableHead>
                                  <TableHead>Amount</TableHead>
                                  <TableHead>Purchase Date</TableHead>
                                  <TableHead>Status</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {metrics.tickets.length > 0 ? (
                                  metrics.tickets.map(ticket => (
                                    <TableRow key={ticket.id}>
                                      <TableCell className="font-medium">{getMemberName(ticket.member_id)}</TableCell>
                                      <TableCell>{ticket.ticket_type}</TableCell>
                                      <TableCell>${ticket.amount.toFixed(2)}</TableCell>
                                      <TableCell>{format(new Date(ticket.purchased_at), 'MMM d, yyyy')}</TableCell>
                                      <TableCell>
                                        <Badge variant={ticket.payment_status === 'paid' ? 'success' : 'outline'}>
                                          {ticket.payment_status}
                                        </Badge>
                                      </TableCell>
                                    </TableRow>
                                  ))
                                ) : (
                                  <TableRow>
                                    <TableCell colSpan="5" className="text-center text-gray-500">
                                      No tickets sold yet
                                    </TableCell>
                                  </TableRow>
                                )}
                              </TableBody>
                            </Table>
                          </div>
                        </TabsContent>
                      )}
                    </Tabs>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}

        {filteredEvents.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center text-gray-500">
              No events found matching your search.
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}