import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { ticket_number, event_id } = await req.json();

    if (!ticket_number) {
      return Response.json({ error: 'Ticket number required' }, { status: 400 });
    }

    // Fetch the ticket by ticket number
    const tickets = await base44.entities.EventTicket.filter({ ticket_number: ticket_number });
    if (!tickets || tickets.length === 0) {
      return Response.json({ 
        error: 'Ticket not found', 
        valid: false 
      }, { status: 404 });
    }
    const ticket = tickets[0];

    // Verify event matches if provided
    if (event_id && ticket.event_id !== event_id) {
      return Response.json({ 
        error: 'Ticket is not valid for this event', 
        valid: false 
      }, { status: 400 });
    }

    // Check ticket status
    if (ticket.status === 'checked_in') {
      return Response.json({
        error: 'Ticket has already been checked in',
        valid: false,
        checked_in_at: ticket.checked_in_at,
        ticket: ticket
      }, { status: 400 });
    }

    if (ticket.status === 'cancelled' || ticket.status === 'refunded') {
      return Response.json({
        error: 'Ticket has been cancelled or refunded',
        valid: false,
        status: ticket.status
      }, { status: 400 });
    }

    if (ticket.payment_status !== 'paid') {
      return Response.json({
        error: 'Ticket payment is not complete',
        valid: false,
        payment_status: ticket.payment_status
      }, { status: 400 });
    }

    // Check in the ticket
    const now = new Date().toISOString();
    await base44.asServiceRole.entities.EventTicket.update(ticket.id, {
      status: 'checked_in',
      checked_in_at: now,
      checked_in_by: user.id
    });

    // Fetch event details for response
    const events = await base44.entities.Event.filter({ id: ticket.event_id });
    const event = events && events.length > 0 ? events[0] : null;

    return Response.json({
      success: true,
      valid: true,
      message: 'Check-in successful!',
      ticket: {
        ...ticket,
        status: 'checked_in',
        checked_in_at: now
      },
      event: event ? {
        title: event.title,
        event_date: event.event_date,
        venue: event.venue
      } : null,
      attendee: {
        name: ticket.purchaser_name,
        email: ticket.purchaser_email,
        quantity: ticket.quantity,
        guest_names: ticket.guest_names
      }
    });

  } catch (error) {
    console.error('Check-in error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});