import React, { useState, useEffect, useMemo } from 'react';
import { Event, EventRSVP, User } from '@/entities/all';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, List, Grid3X3 } from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, addMonths, subMonths, isToday } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import EventCard from '../components/events/EventCard';
import TicketPurchaseDialog from '../components/events/TicketPurchaseDialog';
import { toast } from 'sonner';

const typeColors = {
  'Death': 'bg-gray-700',
  'Hospitalization': 'bg-red-500',
  'Loss of Loved One': 'bg-purple-500',
  'Fundraising Dinner': 'bg-amber-500',
  'Community Fair': 'bg-green-500',
  'Family Day': 'bg-blue-500',
  'Partner Banquet': 'bg-pink-500',
  'General Meeting': 'bg-slate-500',
  'Workshop': 'bg-indigo-500',
  'Social Gathering': 'bg-teal-500',
  'Other': 'bg-gray-500'
};

export default function EventCalendar() {
  const [events, setEvents] = useState([]);
  const [rsvps, setRsvps] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [viewType, setViewType] = useState('month');
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [isEventDialogOpen, setIsEventDialogOpen] = useState(false);
  const [isTicketDialogOpen, setIsTicketDialogOpen] = useState(false);
  const [filterType, setFilterType] = useState('all');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const user = await User.me();
      setCurrentUser(user);

      const [eventList, rsvpList] = await Promise.all([
        Event.filter({ status: { $in: ['Published', 'Announced', 'Collecting'] } }),
        EventRSVP.list()
      ]);

      setEvents(eventList);
      setRsvps(rsvpList);
    } catch (error) {
      console.error('Failed to load calendar data:', error);
      toast.error('Failed to load calendar');
    } finally {
      setIsLoading(false);
    }
  };

  const daysInMonth = useMemo(() => {
    const start = startOfMonth(currentMonth);
    const end = endOfMonth(currentMonth);
    return eachDayOfInterval({ start, end });
  }, [currentMonth]);

  const getEventsForDay = (day) => {
    return events.filter(event => {
      if (!event.event_date) return false;
      const eventDate = new Date(event.event_date);
      const matches = isSameDay(eventDate, day);
      if (filterType === 'all') return matches;
      return matches && event.type === filterType;
    });
  };

  const handlePrevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
  const handleNextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
  const handleToday = () => setCurrentMonth(new Date());

  const handleDayClick = (day) => {
    const dayEvents = getEventsForDay(day);
    if (dayEvents.length === 1) {
      setSelectedEvent(dayEvents[0]);
      setIsEventDialogOpen(true);
    } else if (dayEvents.length > 1) {
      setSelectedDate(day);
    }
  };

  const handleEventClick = (event) => {
    setSelectedEvent(event);
    setIsEventDialogOpen(true);
  };

  const handleRsvp = (event, status) => {
    if (status === 'buy_ticket') {
      setSelectedEvent(event);
      setIsTicketDialogOpen(true);
    }
  };

  const getUserRsvp = (eventId) => {
    return rsvps.find(r => r.event_id === eventId && r.user_id === currentUser?.id);
  };

  const getEventRsvpCount = (eventId) => {
    return rsvps.filter(r => r.event_id === eventId && r.status === 'going').length;
  };

  const eventTypes = [...new Set(events.map(e => e.type))];

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-[600px] w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Event Calendar</h2>
          <p className="text-gray-500">View all upcoming events at a glance</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Event Types</SelectItem>
              {eventTypes.map(type => (
                <SelectItem key={type} value={type}>{type}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="flex rounded-lg border">
            <Button
              variant={viewType === 'month' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setViewType('month')}
            >
              <Grid3X3 className="h-4 w-4" />
            </Button>
            <Button
              variant={viewType === 'list' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setViewType('list')}
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Calendar Navigation */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between py-4">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={handlePrevMonth}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" onClick={handleNextMonth}>
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={handleToday}>
              Today
            </Button>
          </div>
          <CardTitle className="text-xl">
            {format(currentMonth, 'MMMM yyyy')}
          </CardTitle>
          <div className="w-24" /> {/* Spacer for alignment */}
        </CardHeader>

        <CardContent>
          {viewType === 'month' ? (
            <div className="grid grid-cols-7 gap-1">
              {/* Day Headers */}
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                <div key={day} className="text-center text-sm font-medium text-gray-500 py-2">
                  {day}
                </div>
              ))}

              {/* Calendar Days */}
              {/* Add empty cells for days before the month starts */}
              {Array.from({ length: startOfMonth(currentMonth).getDay() }).map((_, i) => (
                <div key={`empty-${i}`} className="h-24 bg-gray-50 rounded" />
              ))}

              {daysInMonth.map(day => {
                const dayEvents = getEventsForDay(day);
                const isCurrentDay = isToday(day);
                
                return (
                  <div
                    key={day.toISOString()}
                    onClick={() => handleDayClick(day)}
                    className={`
                      h-24 p-1 border rounded cursor-pointer transition-colors
                      ${isCurrentDay ? 'bg-blue-50 border-blue-200' : 'hover:bg-gray-50'}
                      ${dayEvents.length > 0 ? 'border-blue-200' : ''}
                    `}
                  >
                    <div className={`
                      text-sm font-medium mb-1
                      ${isCurrentDay ? 'text-blue-600' : 'text-gray-700'}
                    `}>
                      {format(day, 'd')}
                    </div>
                    <div className="space-y-0.5 overflow-hidden">
                      {dayEvents.slice(0, 3).map(event => (
                        <div
                          key={event.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEventClick(event);
                          }}
                          className={`
                            text-xs px-1 py-0.5 rounded truncate text-white
                            ${typeColors[event.type] || 'bg-gray-500'}
                          `}
                        >
                          {event.title}
                        </div>
                      ))}
                      {dayEvents.length > 3 && (
                        <div className="text-xs text-gray-500 pl-1">
                          +{dayEvents.length - 3} more
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* List View */
            <div className="space-y-4">
              {events
                .filter(e => filterType === 'all' || e.type === filterType)
                .sort((a, b) => new Date(a.event_date) - new Date(b.event_date))
                .map(event => (
                  <EventCard
                    key={event.id}
                    event={event}
                    userRsvp={getUserRsvp(event.id)}
                    rsvpCount={getEventRsvpCount(event.id)}
                    onRsvp={handleRsvp}
                    onViewDetails={handleEventClick}
                    compact
                  />
                ))}
              {events.length === 0 && (
                <div className="text-center py-12 text-gray-500">
                  <CalendarIcon className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                  <p>No upcoming events</p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Legend */}
      <Card>
        <CardContent className="py-4">
          <div className="flex flex-wrap gap-3">
            {Object.entries(typeColors).map(([type, color]) => (
              <div key={type} className="flex items-center gap-1.5">
                <div className={`w-3 h-3 rounded ${color}`} />
                <span className="text-xs text-gray-600">{type}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Selected Date Events Modal */}
      <Dialog open={!!selectedDate} onOpenChange={() => setSelectedDate(null)}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>
              Events on {selectedDate && format(selectedDate, 'MMMM d, yyyy')}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-4">
            {selectedDate && getEventsForDay(selectedDate).map(event => (
              <EventCard
                key={event.id}
                event={event}
                userRsvp={getUserRsvp(event.id)}
                rsvpCount={getEventRsvpCount(event.id)}
                onRsvp={handleRsvp}
                onViewDetails={(e) => {
                  setSelectedDate(null);
                  handleEventClick(e);
                }}
                compact
              />
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Event Detail Modal */}
      <Dialog open={isEventDialogOpen} onOpenChange={setIsEventDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          {selectedEvent && (
            <EventCard
              event={selectedEvent}
              userRsvp={getUserRsvp(selectedEvent.id)}
              rsvpCount={getEventRsvpCount(selectedEvent.id)}
              onRsvp={handleRsvp}
              showRsvpButtons={true}
            />
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