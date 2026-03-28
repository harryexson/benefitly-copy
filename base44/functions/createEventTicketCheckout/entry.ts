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

    const { event_id, quantity, ticket_type, purchaser_info } = await req.json();

    if (!event_id || !quantity) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Fetch the event
    const events = await base44.entities.Event.filter({ id: event_id });
    if (!events || events.length === 0) {
      return Response.json({ error: 'Event not found' }, { status: 404 });
    }
    const event = events[0];

    // Check if tickets are available
    const ticketsRemaining = (event.tickets_available || 0) - (event.tickets_sold || 0);
    if (ticketsRemaining < quantity) {
      return Response.json({ 
        error: 'Not enough tickets available', 
        available: ticketsRemaining 
      }, { status: 400 });
    }

    // Determine ticket price
    let unitPrice = event.ticket_price || 0;
    let appliedTicketType = ticket_type || 'standard';

    // Check for early bird pricing
    if (event.early_bird_price && event.early_bird_deadline) {
      const now = new Date();
      const earlyBirdDeadline = new Date(event.early_bird_deadline);
      if (now <= earlyBirdDeadline) {
        unitPrice = event.early_bird_price;
        appliedTicketType = 'early_bird';
      }
    }

    const totalAmount = unitPrice * quantity;

    // Generate unique ticket number
    const ticketNumber = `TKT-${event_id.slice(-6)}-${Date.now().toString(36).toUpperCase()}`;

    // Create ticket record
    const ticket = await base44.asServiceRole.entities.EventTicket.create({
      event_id: event_id,
      member_id: purchaser_info?.member_id || null,
      user_id: user.id,
      ticket_number: ticketNumber,
      ticket_type: appliedTicketType,
      quantity: quantity,
      unit_price: unitPrice,
      total_amount: totalAmount,
      status: 'pending',
      payment_status: 'unpaid',
      purchaser_name: purchaser_info?.name || user.full_name,
      purchaser_email: purchaser_info?.email || user.email,
      purchaser_phone: purchaser_info?.phone || '',
      guest_names: purchaser_info?.guest_names || '',
      special_requests: purchaser_info?.special_requests || '',
      qr_code: ticketNumber
    });

    // If ticket is free, mark as confirmed
    if (totalAmount === 0) {
      await base44.asServiceRole.entities.EventTicket.update(ticket.id, {
        status: 'confirmed',
        payment_status: 'paid'
      });

      // Update event tickets sold count
      await base44.asServiceRole.entities.Event.update(event_id, {
        tickets_sold: (event.tickets_sold || 0) + quantity
      });

      return Response.json({
        success: true,
        ticket_id: ticket.id,
        ticket_number: ticketNumber,
        free: true,
        message: 'Free ticket confirmed!'
      });
    }

    // Use custom domain
    const appHost = 'https://benefitly.app';
    
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'payment',
      customer_email: purchaser_info?.email || user.email,
      line_items: [
        {
          price_data: {
            currency: event.currency?.toLowerCase() || 'usd',
            product_data: {
              name: `${event.title} - ${appliedTicketType === 'early_bird' ? 'Early Bird' : 'Standard'} Ticket`,
              description: `${quantity} ticket(s) for ${event.title}`,
              metadata: {
                event_id: event_id,
                ticket_id: ticket.id
              }
            },
            unit_amount: Math.round(unitPrice * 100),
          },
          quantity: quantity,
        },
      ],
      metadata: {
        ticket_id: ticket.id,
        event_id: event_id,
        user_id: user.id,
        type: 'event_ticket'
      },
      success_url: `${appHost}/EventTicketSuccess?ticket_id=${ticket.id}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appHost}/UpcomingEvents?cancelled=true`,
    });

    // Update ticket with stripe session ID
    await base44.asServiceRole.entities.EventTicket.update(ticket.id, {
      stripe_payment_intent_id: session.id
    });

    return Response.json({
      success: true,
      checkout_url: session.url,
      ticket_id: ticket.id,
      ticket_number: ticketNumber,
      session_id: session.id
    });

  } catch (error) {
    console.error('Ticket checkout error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});