import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar, Clock, MapPin, Users, Check, X, HelpCircle, Ticket } from 'lucide-react';
import { format, isPast, isToday, isTomorrow } from 'date-fns';
import EventCalendarExport from './EventCalendarExport';

const statusColors = {
  Draft: 'bg-gray-100 text-gray-800',
  Published: 'bg-blue-100 text-blue-800',
  Announced: 'bg-green-100 text-green-800',
  Collecting: 'bg-yellow-100 text-yellow-800',
  Closed: 'bg-gray-100 text-gray-800',
  Paid: 'bg-purple-100 text-purple-800',
  Canceled: 'bg-red-100 text-red-800'
};

const typeColors = {
  'Death': 'bg-gray-700 text-white',
  'Hospitalization': 'bg-red-100 text-red-800',
  'Loss of Loved One': 'bg-purple-100 text-purple-800',
  'Fundraising Dinner': 'bg-amber-100 text-amber-800',
  'Community Fair': 'bg-green-100 text-green-800',
  'Family Day': 'bg-blue-100 text-blue-800',
  'Partner Banquet': 'bg-pink-100 text-pink-800',
  'General Meeting': 'bg-slate-100 text-slate-800',
  'Workshop': 'bg-indigo-100 text-indigo-800',
  'Social Gathering': 'bg-teal-100 text-teal-800',
  'Other': 'bg-gray-100 text-gray-800'
};

export default function EventCard({ 
  event, 
  userRsvp, 
  rsvpCount = 0,
  onRsvp, 
  onViewDetails,
  showRsvpButtons = true,
  compact = false
}) {
  const eventDate = event.event_date ? new Date(event.event_date) : null;
  const isEventPast = eventDate && isPast(eventDate) && !isToday(eventDate);
  const isEventToday = eventDate && isToday(eventDate);
  const isEventTomorrow = eventDate && isTomorrow(eventDate);
  
  const rsvpDeadlinePassed = event.rsvp_deadline && isPast(new Date(event.rsvp_deadline));
  const canRsvp = event.requires_rsvp && !isEventPast && !rsvpDeadlinePassed;

  const getDateLabel = () => {
    if (isEventToday) return 'Today';
    if (isEventTomorrow) return 'Tomorrow';
    return eventDate ? format(eventDate, 'EEEE, MMMM d, yyyy') : 'Date TBD';
  };

  if (compact) {
    return (
      <div 
        className="p-3 border rounded-lg hover:shadow-sm cursor-pointer transition-shadow"
        onClick={() => onViewDetails?.(event)}
      >
        <div className="flex items-center justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <Badge className={typeColors[event.type] || typeColors['Other']} variant="secondary">
                {event.type}
              </Badge>
              {(isEventToday || isEventTomorrow) && (
                <Badge className="bg-orange-100 text-orange-800">
                  {isEventToday ? 'Today' : 'Tomorrow'}
                </Badge>
              )}
            </div>
            <h4 className="font-medium mt-1 truncate">{event.title}</h4>
            <div className="flex items-center gap-3 text-xs text-gray-500 mt-1">
              {eventDate && (
                <span className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {format(eventDate, 'MMM d')}
                </span>
              )}
              {event.event_time && (
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {event.event_time}
                </span>
              )}
            </div>
          </div>
          {userRsvp && (
            <Badge variant="outline" className={
              userRsvp.status === 'going' ? 'border-green-500 text-green-700' :
              userRsvp.status === 'maybe' ? 'border-yellow-500 text-yellow-700' :
              'border-red-500 text-red-700'
            }>
              {userRsvp.status === 'going' ? 'Going' : userRsvp.status === 'maybe' ? 'Maybe' : 'Not Going'}
            </Badge>
          )}
        </div>
      </div>
    );
  }

  return (
    <Card className={`overflow-hidden ${isEventPast ? 'opacity-60' : ''}`}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 flex-wrap mb-2">
              <Badge className={typeColors[event.type] || typeColors['Other']}>
                {event.type}
              </Badge>
              <Badge className={statusColors[event.status]}>
                {event.status}
              </Badge>
              {(isEventToday || isEventTomorrow) && (
                <Badge className="bg-orange-500 text-white">
                  {isEventToday ? '🎉 Today!' : '📅 Tomorrow'}
                </Badge>
              )}
              {isEventPast && <Badge variant="outline">Past Event</Badge>}
            </div>
            <CardTitle className="text-xl">{event.title}</CardTitle>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {event.publicity_blurb && (
          <p className="text-gray-600">{event.publicity_blurb}</p>
        )}
        
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="flex items-center gap-2 text-gray-600">
            <Calendar className="h-4 w-4 text-blue-500" />
            <span>{getDateLabel()}</span>
          </div>
          
          {event.event_time && (
            <div className="flex items-center gap-2 text-gray-600">
              <Clock className="h-4 w-4 text-blue-500" />
              <span>
                {event.event_time}
                {event.event_end_time && ` - ${event.event_end_time}`}
              </span>
            </div>
          )}
          
          {event.venue && (
            <div className="flex items-center gap-2 text-gray-600 col-span-2">
              <MapPin className="h-4 w-4 text-red-500" />
              <span>{event.venue}</span>
            </div>
          )}
          
          {event.requires_rsvp && (
            <div className="flex items-center gap-2 text-gray-600">
              <Users className="h-4 w-4 text-green-500" />
              <span>
                {rsvpCount} attending
                {event.max_attendees > 0 && ` / ${event.max_attendees} max`}
              </span>
            </div>
          )}
          
          {event.is_paid_event && (
            <div className="flex items-center gap-2 text-gray-600 col-span-2">
              <Ticket className="h-4 w-4 text-purple-500" />
              <span>
                ${event.ticket_price?.toFixed(2) || '0.00'} per ticket
                {event.tickets_available > 0 && ` • ${(event.tickets_available || 0) - (event.tickets_sold || 0)} left`}
              </span>
            </div>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          <EventCalendarExport event={event} />
        </div>

        {/* RSVP Section */}
        {showRsvpButtons && canRsvp && (
          <div className="pt-4 border-t">
            <p className="text-sm text-gray-500 mb-3">
              {event.rsvp_deadline && (
                <span>RSVP by {format(new Date(event.rsvp_deadline), 'MMMM d, yyyy')}</span>
              )}
            </p>
            
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant={userRsvp?.status === 'going' ? 'default' : 'outline'}
                className={userRsvp?.status === 'going' ? 'bg-green-600 hover:bg-green-700' : ''}
                onClick={() => onRsvp?.(event, 'going')}
              >
                <Check className="h-4 w-4 mr-1" />
                Going
              </Button>
              <Button
                size="sm"
                variant={userRsvp?.status === 'maybe' ? 'default' : 'outline'}
                className={userRsvp?.status === 'maybe' ? 'bg-yellow-600 hover:bg-yellow-700' : ''}
                onClick={() => onRsvp?.(event, 'maybe')}
              >
                <HelpCircle className="h-4 w-4 mr-1" />
                Maybe
              </Button>
              <Button
                size="sm"
                variant={userRsvp?.status === 'not_going' ? 'default' : 'outline'}
                className={userRsvp?.status === 'not_going' ? 'bg-red-600 hover:bg-red-700' : ''}
                onClick={() => onRsvp?.(event, 'not_going')}
              >
                <X className="h-4 w-4 mr-1" />
                Can't Go
              </Button>
            </div>
          </div>
        )}

        {/* View Details Button */}
        <div className="pt-2 flex gap-2">
          <Button variant="outline" className="flex-1" onClick={() => onViewDetails?.(event)}>
            View Details
          </Button>
          {event.is_paid_event && !isEventPast && (event.tickets_available || 0) - (event.tickets_sold || 0) > 0 && (
            <Button className="flex-1 bg-purple-600 hover:bg-purple-700" onClick={() => onRsvp?.(event, 'buy_ticket')}>
              <Ticket className="h-4 w-4 mr-1" />
              Buy Tickets
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}