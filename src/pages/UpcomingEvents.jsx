import React, { useState, useEffect } from 'react';
import { Event, EventRSVP, Member, User } from '@/entities/all';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Calendar, Clock, MapPin, Users, Search, CalendarDays, Check, HelpCircle, X, Bell } from 'lucide-react';
import { format, isPast, isToday, addDays, isWithinInterval } from 'date-fns';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';
import EventCard from '../components/events/EventCard';
import RSVPList from '../components/events/RSVPList';
import TicketPurchaseDialog from '../components/events/TicketPurchaseDialog';

export default function UpcomingEvents() {
  const [events, setEvents] = useState([]);
  const [rsvps, setRsvps] = useState([]);
  const [members, setMembers] = useState([]);
  const [users, setUsers] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [currentMember, setCurrentMember] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('upcoming');
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [isRsvpDialogOpen, setIsRsvpDialogOpen] = useState(false);
  const [isTicketDialogOpen, setIsTicketDialogOpen] = useState(false);
  const [rsvpForm, setRsvpForm] = useState({ status: 'going', guest_count: 0, notes: '' });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const user = await User.me();
      setCurrentUser(user);

      const [eventList, rsvpList, memberList, userList] = await Promise.all([
        Event.filter({ status: { $in: ['Published', 'Announced', 'Collecting'] } }, 'event_date'),
        EventRSVP.list(),
        Member.list(),
        User.list()
      ]);

      setEvents(eventList);
      setRsvps(rsvpList);
      setMembers(memberList);
      setUsers(userList);

      // Find if current user is a member
      const member = memberList.find(m => m.email === user.email);
      setCurrentMember(member);
    } catch (error) {
      console.error('Failed to load events:', error);
      toast.error('Failed to load events');
    } finally {
      setIsLoading(false);
    }
  };

  const getUserRsvp = (eventId) => {
    return rsvps.find(r => 
      r.event_id === eventId && 
      (r.member_id === currentMember?.id || r.user_id === currentUser?.id)
    );
  };

  const getEventRsvpCount = (eventId) => {
    return rsvps.filter(r => r.event_id === eventId && r.status === 'going').length;
  };

  const handleRsvp = async (event, status) => {
    // Handle buy ticket action
    if (status === 'buy_ticket') {
      setSelectedEvent(event);
      setIsTicketDialogOpen(true);
      return;
    }
    
    setSelectedEvent(event);
    setRsvpForm({ status, guest_count: 0, notes: '' });
    
    const existingRsvp = getUserRsvp(event.id);
    if (existingRsvp) {
      setRsvpForm({
        status,
        guest_count: existingRsvp.guest_count || 0,
        notes: existingRsvp.notes || ''
      });
    }
    
    setIsRsvpDialogOpen(true);
  };

  const handleSubmitRsvp = async () => {
    if (!selectedEvent) return;

    try {
      const existingRsvp = getUserRsvp(selectedEvent.id);
      
      const rsvpData = {
        event_id: selectedEvent.id,
        member_id: currentMember?.id || null,
        user_id: currentUser.id,
        status: rsvpForm.status,
        guest_count: rsvpForm.guest_count,
        notes: rsvpForm.notes
      };

      if (existingRsvp) {
        await EventRSVP.update(existingRsvp.id, rsvpData);
        toast.success('RSVP updated!');
      } else {
        await EventRSVP.create(rsvpData);
        toast.success('RSVP submitted!');
      }

      setIsRsvpDialogOpen(false);
      setSelectedEvent(null);
      loadData();
    } catch (error) {
      console.error('Failed to submit RSVP:', error);
      toast.error('Failed to submit RSVP');
    }
  };

  const handleViewDetails = (event) => {
    setSelectedEvent(event);
  };

  // Filter events
  const now = new Date();
  const thisWeekEnd = addDays(now, 7);
  const thisMonthEnd = addDays(now, 30);

  const upcomingEvents = events.filter(e => e.event_date && !isPast(new Date(e.event_date)));
  const thisWeekEvents = upcomingEvents.filter(e => 
    isWithinInterval(new Date(e.event_date), { start: now, end: thisWeekEnd })
  );
  const myRsvpEvents = events.filter(e => getUserRsvp(e.id)?.status === 'going');
  const pastEvents = events.filter(e => e.event_date && isPast(new Date(e.event_date)) && !isToday(new Date(e.event_date)));

  const filteredEvents = (tab) => {
    let eventList;
    switch (tab) {
      case 'this_week': eventList = thisWeekEvents; break;
      case 'my_rsvps': eventList = myRsvpEvents; break;
      case 'past': eventList = pastEvents; break;
      default: eventList = upcomingEvents;
    }
    
    if (!searchTerm) return eventList;
    return eventList.filter(e => 
      e.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      e.type.toLowerCase().includes(searchTerm.toLowerCase()) ||
      e.venue?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-24 w-full" />
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Upcoming Events</h2>
          <p className="text-gray-500">View and RSVP to association events</p>
        </div>
        <div className="relative w-full md:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
          <Input
            placeholder="Search events..."
            className="pl-9"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <CalendarDays className="h-8 w-8 mx-auto text-blue-500 mb-2" />
            <p className="text-2xl font-bold">{upcomingEvents.length}</p>
            <p className="text-xs text-gray-500">Upcoming Events</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Calendar className="h-8 w-8 mx-auto text-orange-500 mb-2" />
            <p className="text-2xl font-bold">{thisWeekEvents.length}</p>
            <p className="text-xs text-gray-500">This Week</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Check className="h-8 w-8 mx-auto text-green-500 mb-2" />
            <p className="text-2xl font-bold">{myRsvpEvents.length}</p>
            <p className="text-xs text-gray-500">My RSVPs</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Users className="h-8 w-8 mx-auto text-purple-500 mb-2" />
            <p className="text-2xl font-bold">
              {rsvps.filter(r => r.status === 'going').length}
            </p>
            <p className="text-xs text-gray-500">Total Attendees</p>
          </CardContent>
        </Card>
      </div>

      {/* Events Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList>
          <TabsTrigger value="upcoming">All Upcoming ({upcomingEvents.length})</TabsTrigger>
          <TabsTrigger value="this_week">This Week ({thisWeekEvents.length})</TabsTrigger>
          <TabsTrigger value="my_rsvps">My RSVPs ({myRsvpEvents.length})</TabsTrigger>
          <TabsTrigger value="past">Past Events</TabsTrigger>
        </TabsList>

        {['upcoming', 'this_week', 'my_rsvps', 'past'].map(tab => (
          <TabsContent key={tab} value={tab} className="mt-6">
            {filteredEvents(tab).length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <CalendarDays className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Events Found</h3>
                  <p className="text-gray-600">
                    {tab === 'my_rsvps' 
                      ? "You haven't RSVPed to any events yet." 
                      : "Check back later for upcoming events."}
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredEvents(tab).map(event => (
                  <EventCard
                    key={event.id}
                    event={event}
                    userRsvp={getUserRsvp(event.id)}
                    rsvpCount={getEventRsvpCount(event.id)}
                    onRsvp={handleRsvp}
                    onViewDetails={handleViewDetails}
                    showRsvpButtons={tab !== 'past'}
                  />
                ))}
              </div>
            )}
          </TabsContent>
        ))}
      </Tabs>

      {/* RSVP Dialog */}
      <Dialog open={isRsvpDialogOpen} onOpenChange={setIsRsvpDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>RSVP to Event</DialogTitle>
          </DialogHeader>
          
          {selectedEvent && (
            <div className="space-y-4 py-4">
              <div className="p-3 bg-gray-50 rounded-lg">
                <h4 className="font-medium">{selectedEvent.title}</h4>
                <p className="text-sm text-gray-500">
                  {selectedEvent.event_date && format(new Date(selectedEvent.event_date), 'EEEE, MMMM d, yyyy')}
                  {selectedEvent.event_time && ` at ${selectedEvent.event_time}`}
                </p>
              </div>

              <div className="space-y-2">
                <Label>Your Response</Label>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant={rsvpForm.status === 'going' ? 'default' : 'outline'}
                    className={rsvpForm.status === 'going' ? 'bg-green-600' : ''}
                    onClick={() => setRsvpForm({ ...rsvpForm, status: 'going' })}
                  >
                    <Check className="h-4 w-4 mr-1" /> Going
                  </Button>
                  <Button
                    type="button"
                    variant={rsvpForm.status === 'maybe' ? 'default' : 'outline'}
                    className={rsvpForm.status === 'maybe' ? 'bg-yellow-600' : ''}
                    onClick={() => setRsvpForm({ ...rsvpForm, status: 'maybe' })}
                  >
                    <HelpCircle className="h-4 w-4 mr-1" /> Maybe
                  </Button>
                  <Button
                    type="button"
                    variant={rsvpForm.status === 'not_going' ? 'default' : 'outline'}
                    className={rsvpForm.status === 'not_going' ? 'bg-red-600' : ''}
                    onClick={() => setRsvpForm({ ...rsvpForm, status: 'not_going' })}
                  >
                    <X className="h-4 w-4 mr-1" /> No
                  </Button>
                </div>
              </div>

              {rsvpForm.status === 'going' && (
                <div className="space-y-2">
                  <Label htmlFor="guests">Additional Guests</Label>
                  <Select
                    value={String(rsvpForm.guest_count)}
                    onValueChange={(value) => setRsvpForm({ ...rsvpForm, guest_count: parseInt(value) })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0">Just me</SelectItem>
                      <SelectItem value="1">+1 guest</SelectItem>
                      <SelectItem value="2">+2 guests</SelectItem>
                      <SelectItem value="3">+3 guests</SelectItem>
                      <SelectItem value="4">+4 guests</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="notes">Notes (optional)</Label>
                <Textarea
                  id="notes"
                  placeholder="Any dietary restrictions or special requests?"
                  value={rsvpForm.notes}
                  onChange={(e) => setRsvpForm({ ...rsvpForm, notes: e.target.value })}
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsRsvpDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSubmitRsvp}>Submit RSVP</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Event Details Dialog */}
      <Dialog open={!!selectedEvent && !isRsvpDialogOpen} onOpenChange={() => setSelectedEvent(null)}>
        <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
          {selectedEvent && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge>{selectedEvent.type}</Badge>
                  <Badge variant="outline">{selectedEvent.status}</Badge>
                </div>
                <DialogTitle className="text-2xl mt-2">{selectedEvent.title}</DialogTitle>
              </DialogHeader>

              <div className="space-y-6 py-4">
                {/* Event Details */}
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <Calendar className="h-5 w-5 text-blue-500" />
                      <div>
                        <p className="font-medium">
                          {selectedEvent.event_date 
                            ? format(new Date(selectedEvent.event_date), 'EEEE, MMMM d, yyyy')
                            : 'Date TBD'}
                        </p>
                        <p className="text-sm text-gray-500">Date</p>
                      </div>
                    </div>

                    {selectedEvent.event_time && (
                      <div className="flex items-center gap-3">
                        <Clock className="h-5 w-5 text-blue-500" />
                        <div>
                          <p className="font-medium">
                            {selectedEvent.event_time}
                            {selectedEvent.event_end_time && ` - ${selectedEvent.event_end_time}`}
                          </p>
                          <p className="text-sm text-gray-500">Time</p>
                        </div>
                      </div>
                    )}

                    {selectedEvent.venue && (
                      <div className="flex items-center gap-3">
                        <MapPin className="h-5 w-5 text-red-500" />
                        <div>
                          <p className="font-medium">{selectedEvent.venue}</p>
                          {selectedEvent.venue_details && (
                            <p className="text-sm text-gray-500">{selectedEvent.venue_details}</p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  <div>
                    {selectedEvent.description && (
                      <div className="p-4 bg-gray-50 rounded-lg">
                        <p className="text-gray-700 whitespace-pre-wrap">{selectedEvent.description}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* RSVP List for admins */}
                {selectedEvent.requires_rsvp && (
                  <RSVPList
                    rsvps={rsvps.filter(r => r.event_id === selectedEvent.id)}
                    members={members}
                    users={users}
                  />
                )}

                {/* RSVP Button */}
                {selectedEvent.requires_rsvp && !isPast(new Date(selectedEvent.event_date)) && (
                  <div className="flex justify-center">
                    <Button onClick={() => handleRsvp(selectedEvent, getUserRsvp(selectedEvent.id)?.status || 'going')}>
                      <Bell className="h-4 w-4 mr-2" />
                      {getUserRsvp(selectedEvent.id) ? 'Update RSVP' : 'RSVP Now'}
                    </Button>
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
      {/* Ticket Purchase Dialog */}
      <TicketPurchaseDialog
        event={selectedEvent}
        isOpen={isTicketDialogOpen}
        onClose={() => {
          setIsTicketDialogOpen(false);
          setSelectedEvent(null);
        }}
        currentUser={currentUser}
      />
    </div>
  );
}