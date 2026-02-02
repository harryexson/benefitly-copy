import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle2, Ticket, Calendar, MapPin, Loader2 } from 'lucide-react';
import { EventTicket, Event } from '@/entities/all';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { format } from 'date-fns';
import { toast } from 'sonner';

export default function EventTicketSuccess() {
  const [ticket, setTicket] = useState(null);
  const [event, setEvent] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isConfirming, setIsConfirming] = useState(false);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const ticketId = urlParams.get('ticket_id');
    const sessionId = urlParams.get('session_id');

    if (ticketId && sessionId) {
      confirmTicket(ticketId, sessionId);
    } else if (ticketId) {
      loadTicket(ticketId);
    }
  }, []);

  const confirmTicket = async (ticketId, sessionId) => {
    setIsConfirming(true);
    try {
      const response = await base44.functions.invoke('confirmEventTicket', {
        ticket_id: ticketId,
        session_id: sessionId
      });

      if (response.data.success) {
        await loadTicket(ticketId);
        toast.success('Payment confirmed!');
      }
    } catch (error) {
      console.error('Confirmation error:', error);
      toast.error('Failed to confirm payment. Please contact support.');
    } finally {
      setIsConfirming(false);
    }
  };

  const loadTicket = async (ticketId) => {
    try {
      setIsLoading(true);
      const tickets = await EventTicket.filter({ id: ticketId });
      if (tickets && tickets.length > 0) {
        setTicket(tickets[0]);
        
        const events = await Event.filter({ id: tickets[0].event_id });
        if (events && events.length > 0) {
          setEvent(events[0]);
        }
      }
    } catch (error) {
      console.error('Failed to load ticket:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading || isConfirming) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">
            {isConfirming ? 'Confirming your payment...' : 'Loading your ticket...'}
          </p>
        </div>
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="max-w-lg mx-auto py-12 text-center">
        <h2 className="text-2xl font-bold mb-4">Ticket Not Found</h2>
        <p className="text-gray-600 mb-6">We couldn't find your ticket. Please contact support.</p>
        <Button asChild>
          <Link to={createPageUrl('UpcomingEvents')}>Back to Events</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto py-12">
      <Card className="overflow-hidden">
        <div className="bg-green-500 p-6 text-center text-white">
          <CheckCircle2 className="h-16 w-16 mx-auto mb-4" />
          <h2 className="text-2xl font-bold">Purchase Confirmed!</h2>
          <p className="text-green-100 mt-2">Your tickets have been secured</p>
        </div>

        <CardContent className="p-6 space-y-6">
          {/* Ticket Details */}
          <div className="p-4 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
            <div className="flex items-center gap-2 mb-4">
              <Ticket className="h-5 w-5 text-blue-600" />
              <span className="font-mono text-lg font-bold">{ticket.ticket_number}</span>
            </div>
            
            {event && (
              <div className="space-y-2">
                <h3 className="font-semibold text-lg">{event.title}</h3>
                <div className="flex items-center gap-2 text-gray-600">
                  <Calendar className="h-4 w-4" />
                  <span>
                    {format(new Date(event.event_date), 'EEEE, MMMM d, yyyy')}
                    {event.event_time && ` at ${event.event_time}`}
                  </span>
                </div>
                {event.venue && (
                  <div className="flex items-center gap-2 text-gray-600">
                    <MapPin className="h-4 w-4" />
                    <span>{event.venue}</span>
                  </div>
                )}
              </div>
            )}

            <div className="mt-4 pt-4 border-t grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-500">Quantity</p>
                <p className="font-semibold">{ticket.quantity} ticket{ticket.quantity > 1 ? 's' : ''}</p>
              </div>
              <div>
                <p className="text-gray-500">Total Paid</p>
                <p className="font-semibold">${ticket.total_amount?.toFixed(2) || '0.00'}</p>
              </div>
              <div>
                <p className="text-gray-500">Purchaser</p>
                <p className="font-semibold">{ticket.purchaser_name}</p>
              </div>
              <div>
                <p className="text-gray-500">Email</p>
                <p className="font-semibold text-sm">{ticket.purchaser_email}</p>
              </div>
            </div>
          </div>

          {/* QR Code Placeholder */}
          <div className="text-center p-6 bg-white border rounded-lg">
            <div className="w-32 h-32 mx-auto bg-gray-100 rounded-lg flex items-center justify-center mb-4">
              <div className="grid grid-cols-5 gap-1">
                {[...Array(25)].map((_, i) => (
                  <div 
                    key={i} 
                    className={`w-4 h-4 ${Math.random() > 0.5 ? 'bg-black' : 'bg-white'}`} 
                  />
                ))}
              </div>
            </div>
            <p className="text-sm text-gray-500">
              Show this QR code at the event for check-in
            </p>
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-3">
            <p className="text-sm text-gray-500 text-center">
              A confirmation email has been sent to {ticket.purchaser_email}
            </p>
            <Button asChild className="w-full">
              <Link to={createPageUrl('UpcomingEvents')}>
                View All Events
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}