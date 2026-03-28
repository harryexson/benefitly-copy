import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';
import Stripe from 'npm:stripe@17.7.0';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'));

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { ticket_id, session_id } = await req.json();

    if (!ticket_id || !session_id) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Fetch the ticket
    const tickets = await base44.entities.EventTicket.filter({ id: ticket_id });
    if (!tickets || tickets.length === 0) {
      return Response.json({ error: 'Ticket not found' }, { status: 404 });
    }
    const ticket = tickets[0];

    // Verify the Stripe session
    const session = await stripe.checkout.sessions.retrieve(session_id);

    if (session.payment_status !== 'paid') {
      return Response.json({ 
        error: 'Payment not completed', 
        status: session.payment_status 
      }, { status: 400 });
    }

    // Update ticket status
    await base44.asServiceRole.entities.EventTicket.update(ticket_id, {
      status: 'confirmed',
      payment_status: 'paid',
      stripe_payment_intent_id: session.payment_intent
    });

    // Update event tickets sold count and revenue
    const events = await base44.entities.Event.filter({ id: ticket.event_id });
    if (events && events.length > 0) {
      const event = events[0];
      await base44.asServiceRole.entities.Event.update(event.id, {
        tickets_sold: (event.tickets_sold || 0) + ticket.quantity,
        total_revenue: (event.total_revenue || 0) + ticket.total_amount
      });
    }

    // Send confirmation email
    await base44.integrations.Core.SendEmail({
      to: ticket.purchaser_email,
      subject: `Your Tickets are Confirmed - ${events[0]?.title || 'Event'}`,
      body: `
        <h2>Your tickets have been confirmed!</h2>
        <p>Thank you for your purchase.</p>
        <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin: 0 0 10px 0;">Ticket Details</h3>
          <p><strong>Ticket Number:</strong> ${ticket.ticket_number}</p>
          <p><strong>Quantity:</strong> ${ticket.quantity}</p>
          <p><strong>Total Paid:</strong> $${ticket.total_amount.toFixed(2)}</p>
        </div>
        <p>Please bring this confirmation or your ticket QR code to the event.</p>
        <p>We look forward to seeing you!</p>
      `
    });

    return Response.json({
      success: true,
      ticket: ticket,
      message: 'Ticket confirmed successfully!'
    });

  } catch (error) {
    console.error('Ticket confirmation error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});