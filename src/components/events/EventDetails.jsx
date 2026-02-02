import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar, MapPin, HandHeart, Ticket, CreditCard, Loader2, CheckCircle2 } from 'lucide-react';
import { format } from 'date-fns';
import { Member, EventContribution, Volunteer, EventTicket } from '@/entities/all';
import { User } from '@/entities/User';
import { base44 } from '@/api/base44Client';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import VolunteerRequestDialog from './VolunteerRequestDialog';
import EventCalendarExport from './EventCalendarExport';
import EventCheckIn from './EventCheckIn';
import EventReportCard from './EventReportCard';
import { Alert, AlertDescription } from '@/components/ui/alert';

export default function EventDetails({ event }) {
  const [members, setMembers] = useState([]);
  const [contributions, setContributions] = useState([]);
  const [volunteers, setVolunteers] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRequestDialogOpen, setIsRequestDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('details');
  const [currentUser, setCurrentUser] = useState(null);
  const [currentMember, setCurrentMember] = useState(null);
  const [myContribution, setMyContribution] = useState(null);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);

  useEffect(() => {
    const loadRelatedData = async () => {
      if (!event) return;
      setIsLoading(true);
      try {
        const [user, memberList, contributionList, volunteerList, ticketList] = await Promise.all([
          User.me(),
          Member.list(),
          EventContribution.filter({ event_id: event.id }),
          Volunteer.filter({ event_id: event.id }),
          EventTicket.filter({ event_id: event.id })
        ]);
        
        setCurrentUser(user);
        setMembers(memberList);
        setContributions(contributionList);
        setVolunteers(volunteerList);
        setTickets(ticketList);

        // Find current user's member profile and contribution
        const memberProfile = memberList.find(m => m.email === user.email);
        setCurrentMember(memberProfile);
        
        if (memberProfile) {
          const userContribution = contributionList.find(c => c.member_id === memberProfile.id);
          setMyContribution(userContribution);
        }
      } catch (error) {
        console.error("Failed to load event details", error);
      } finally {
        setIsLoading(false);
      }
    };
    loadRelatedData();
  }, [event]);

  if (!event) {
    return <p>Select an event to see details</p>;
  }

  const getMemberName = (memberId) => {
    const member = members.find(m => m.id === memberId);
    return member ? `${member.first_name} ${member.last_name}` : 'Unknown Member';
  };

  const handlePayContribution = async () => {
    if (!myContribution) {
      console.error('No contribution found for current member');
      toast.error('Contribution not found. Please refresh and try again.');
      return;
    }
    
    try {
      setIsProcessingPayment(true);
      
      console.log('Initiating payment for contribution:', myContribution.id);
      
      const response = await base44.functions.invoke('createContributionCheckout', {
        contribution_id: myContribution.id
      });

      console.log('Payment response:', response.data);

      if (response.data.checkoutUrl) {
        console.log('Redirecting to Stripe checkout:', response.data.checkoutUrl);
        window.location.href = response.data.checkoutUrl;
      } else {
        console.error('No checkout URL in response:', response.data);
        toast.error(response.data.error || 'Failed to create payment session');
        setIsProcessingPayment(false);
      }
    } catch (error) {
      console.error('Payment error:', error);
      console.error('Error response:', error.response?.data);
      const errorMsg = error.response?.data?.error || error.message || 'Failed to initiate payment';
      toast.error(errorMsg, { duration: 5000 });
      setIsProcessingPayment(false);
    }
  };

  const statusColors = {
    Due: 'text-yellow-600',
    'Past Due': 'text-red-600',
    Paid: 'text-green-600',
  };

  const volunteerStatusColors = {
    Pending: 'bg-yellow-100 text-yellow-800',
    Confirmed: 'bg-blue-100 text-blue-800',
    Attended: 'bg-green-100 text-green-800',
    Cancelled: 'bg-red-100 text-red-800',
  };

  return (
    <Card className="flex-1">
      <CardHeader>
        <CardTitle>{event.title}</CardTitle>
        <CardDescription>{event.description}</CardDescription>
        <div className="flex flex-wrap gap-4 pt-2 text-sm text-gray-600">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            <span>{format(new Date(event.event_date), 'MMM d, yyyy')}</span>
          </div>
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4" />
            <span>{event.venue || 'N/A'}</span>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline">{event.type}</Badge>
          </div>
          {event.is_paid_event && (
            <Badge className="bg-green-100 text-green-800">
              <Ticket className="h-3 w-3 mr-1" />
              {event.tickets_sold || 0}/{event.tickets_available || 0} Tickets
            </Badge>
          )}
        </div>

        {/* Payment Action for Current User */}
        {myContribution && (myContribution.status === 'Due' || myContribution.status === 'Past Due') && (
          <Alert className={myContribution.status === 'Past Due' ? 'border-red-300 bg-red-50 mt-4' : 'border-blue-300 bg-gradient-to-r from-blue-50 to-indigo-50 mt-4'}>
            <CreditCard className="h-5 w-5" />
            <AlertDescription>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-bold text-gray-900 text-lg">Your Contribution Required</p>
                  <p className="text-sm text-gray-700 mt-2">
                    Amount Due: <span className="font-bold text-blue-600 text-lg">${myContribution.amount_due.toFixed(2)}</span>
                  </p>
                  <p className="text-xs text-gray-600 mt-1">
                    Due Date: {format(new Date(myContribution.due_date), 'MMMM d, yyyy')}
                  </p>
                  {myContribution.status === 'Past Due' && (
                    <Badge variant="outline" className="mt-2 border-red-600 text-red-800 bg-red-100 font-semibold">
                      ⚠️ PAST DUE
                    </Badge>
                  )}
                  {currentMember?.stripe_bank_account_id && (
                    <p className="text-xs text-green-700 mt-2 flex items-center gap-1">
                      <CheckCircle2 className="h-3 w-3" />
                      Bank account on file - ACH payment available
                    </p>
                  )}
                </div>
                <Button 
                  onClick={handlePayContribution}
                  disabled={isProcessingPayment}
                  size="lg"
                  className={myContribution.status === 'Past Due' 
                    ? 'bg-red-600 hover:bg-red-700 text-white font-bold px-6 py-6 text-lg' 
                    : 'bg-green-600 hover:bg-green-700 text-white font-bold px-6 py-6 text-lg'}
                >
                  {isProcessingPayment ? (
                    <>
                      <Loader2 className="mr-2 h-6 w-6 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <CreditCard className="mr-2 h-6 w-6" />
                      Pay Now
                    </>
                  )}
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {myContribution && myContribution.status === 'Paid' && (
          <Alert className="border-green-300 bg-green-50 mt-4">
            <CheckCircle2 className="h-5 w-5 text-green-600" />
            <AlertDescription>
              <div className="flex items-center gap-2">
                <div>
                  <p className="font-bold text-green-900">✓ Contribution Paid</p>
                  <p className="text-sm text-gray-700 mt-1">
                    You paid <span className="font-semibold">${myContribution.amount_paid.toFixed(2)}</span> on {format(new Date(myContribution.paid_at), 'MMM d, yyyy')}
                  </p>
                </div>
              </div>
            </AlertDescription>
          </Alert>
        )}

        <div className="pt-2">
          <EventCalendarExport event={event} />
        </div>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="flex-wrap">
            <TabsTrigger value="details">Details</TabsTrigger>
            <TabsTrigger value="contributions">Contributions ({contributions.length})</TabsTrigger>
            {event.is_paid_event && (
              <TabsTrigger value="tickets">Tickets ({tickets.length})</TabsTrigger>
            )}
            <TabsTrigger value="volunteers">Volunteers ({volunteers.length})</TabsTrigger>
            {event.check_in_enabled && (
              <TabsTrigger value="checkin">Check-In</TabsTrigger>
            )}
            <TabsTrigger value="reports">Reports</TabsTrigger>
          </TabsList>
          
          <TabsContent value="details" className="pt-4">
             <div className="space-y-4">
                <div>
                  <h4 className="font-semibold">Public Announcement Blurb</h4>
                  <p className="text-gray-700 p-3 bg-gray-50 rounded-md mt-1">{event.publicity_blurb || 'No public announcement text has been set for this event.'}</p>
                </div>
                <div>
                  <h4 className="font-semibold">Financials</h4>
                  <div className="flex gap-6 mt-1">
                    <p>Contribution per member: <strong className="text-blue-600">${event.contribution_amount.toFixed(2)}</strong></p>
                    <p>Due Date: <strong>{format(new Date(event.contribution_due_date), 'MMM d, yyyy')}</strong></p>
                  </div>
                </div>
             </div>
          </TabsContent>
          
          <TabsContent value="contributions">
            {/* Table of contributions */}
             <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Member</TableHead>
                        <TableHead>Amount Due</TableHead>
                        <TableHead>Status</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow><TableCell colSpan="3"><Skeleton className="h-8 w-full" /></TableCell></TableRow>
                  ) : contributions.map(c => (
                        <TableRow key={c.id}>
                            <TableCell>{getMemberName(c.member_id)}</TableCell>
                            <TableCell>${c.amount_due.toFixed(2)}</TableCell>
                            <TableCell>
                               <Badge variant="outline" className={statusColors[c.status]}>{c.status}</Badge>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
             </Table>
          </TabsContent>

          {event.is_paid_event && (
            <TabsContent value="tickets" className="pt-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Ticket #</TableHead>
                    <TableHead>Purchaser</TableHead>
                    <TableHead>Qty</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow><TableCell colSpan="5"><Skeleton className="h-8 w-full" /></TableCell></TableRow>
                  ) : tickets.length > 0 ? tickets.map(t => (
                    <TableRow key={t.id}>
                      <TableCell className="font-mono text-sm">{t.ticket_number}</TableCell>
                      <TableCell>
                        <div>{t.purchaser_name}</div>
                        <div className="text-xs text-gray-500">{t.purchaser_email}</div>
                      </TableCell>
                      <TableCell>{t.quantity}</TableCell>
                      <TableCell>${t.total_amount?.toFixed(2) || '0.00'}</TableCell>
                      <TableCell>
                        <Badge className={
                          t.status === 'confirmed' ? 'bg-green-100 text-green-800' :
                          t.status === 'checked_in' ? 'bg-blue-100 text-blue-800' :
                          t.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                          'bg-yellow-100 text-yellow-800'
                        }>{t.status}</Badge>
                      </TableCell>
                    </TableRow>
                  )) : (
                    <TableRow>
                      <TableCell colSpan="5" className="text-center h-24">No tickets sold yet.</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
              
              {tickets.length > 0 && (
                <div className="mt-4 p-4 bg-gray-50 rounded-lg grid grid-cols-3 gap-4 text-center">
                  <div>
                    <p className="text-sm text-gray-500">Total Sold</p>
                    <p className="text-xl font-bold">{tickets.reduce((sum, t) => sum + t.quantity, 0)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Revenue</p>
                    <p className="text-xl font-bold text-green-600">
                      ${tickets.filter(t => t.payment_status === 'paid').reduce((sum, t) => sum + (t.total_amount || 0), 0).toFixed(2)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Checked In</p>
                    <p className="text-xl font-bold text-blue-600">
                      {tickets.filter(t => t.status === 'checked_in').reduce((sum, t) => sum + t.quantity, 0)}
                    </p>
                  </div>
                </div>
              )}
            </TabsContent>
          )}

          <TabsContent value="volunteers" className="pt-4">
            <div className="flex justify-end mb-4">
              <Button onClick={() => setIsRequestDialogOpen(true)}>
                <HandHeart className="mr-2 h-4 w-4" />
                Request Volunteers
              </Button>
            </div>
             <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Phone</TableHead>
                        <TableHead>Status</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow><TableCell colSpan="4"><Skeleton className="h-8 w-full" /></TableCell></TableRow>
                  ) : volunteers.length > 0 ? volunteers.map(v => (
                        <TableRow key={v.id}>
                            <TableCell>{v.name}</TableCell>
                            <TableCell>{v.email}</TableCell>
                            <TableCell>{v.phone || 'N/A'}</TableCell>
                            <TableCell>
                                <Badge className={volunteerStatusColors[v.status]}>{v.status}</Badge>
                            </TableCell>
                        </TableRow>
                    )) : (
                    <TableRow>
                        <TableCell colSpan="4" className="text-center h-24">No volunteers have signed up for this event yet.</TableCell>
                    </TableRow>
                    )}
                </TableBody>
             </Table>
          </TabsContent>

          {event.check_in_enabled && (
            <TabsContent value="checkin" className="pt-4">
              <EventCheckIn event={event} />
            </TabsContent>
          )}

          <TabsContent value="reports" className="pt-4">
            <EventReportCard event={event} />
          </TabsContent>
        </Tabs>
      </CardContent>
      <VolunteerRequestDialog event={event} isOpen={isRequestDialogOpen} onClose={() => setIsRequestDialogOpen(false)} />
    </Card>
  );
}