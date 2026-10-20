import { sql, withUserContext } from "@/lib/database";

export type CampaignEvent = { id: string; title: string; description: string | null; starts_at: string; ends_at: string | null; location: string | null };

export async function listCampaignEvents(campaignId: string): Promise<CampaignEvent[]> {
  const rows = await sql`select * from public.list_campaign_events(${campaignId})`;
  return rows as unknown as CampaignEvent[];
}

export type TicketType = { id: string; name: string; price_cents: number; currency: string; quantity_available: number | null; quantity_sold: number };

export async function listEventTicketTypes(eventId: string): Promise<TicketType[]> {
  const rows = await sql`select * from public.list_event_ticket_types(${eventId})`;
  return rows as unknown as TicketType[];
}

export async function createCampaignEvent(
  userId: string,
  input: { campaignId: string; title: string; description?: string; startsAt: string; endsAt?: string; location?: string },
): Promise<CampaignEvent> {
  const [rows] = await withUserContext(userId, (tx) => [
    tx`select * from public.create_campaign_event(${input.campaignId}, ${input.title}, ${input.description ?? null}, ${input.startsAt}::timestamptz, ${input.endsAt ?? null}::timestamptz, ${input.location ?? null})`,
  ]);
  return rows[0] as unknown as CampaignEvent;
}

export async function createTicketType(
  userId: string,
  input: { eventId: string; name: string; priceCents: number; currency: string; quantityAvailable?: number },
): Promise<TicketType> {
  const [rows] = await withUserContext(userId, (tx) => [
    tx`select * from public.create_ticket_type(${input.eventId}, ${input.name}, ${input.priceCents}, ${input.currency}, ${input.quantityAvailable ?? null})`,
  ]);
  return rows[0] as unknown as TicketType;
}

export type Ticket = {
  id: string;
  ticket_type_id: string;
  campaign_event_id: string;
  donation_id: string;
  code: string;
  attendee_name: string;
  attendee_email: string;
  attendee_phone: string | null;
  status: "valid" | "checked_in" | "refunded" | "cancelled";
  checked_in_at: string | null;
  created_at: string;
};

export async function organizerListEventTickets(userId: string, eventId: string): Promise<Ticket[]> {
  const [rows] = await withUserContext(userId, (tx) => [tx`select * from public.organizer_list_event_tickets(${eventId})`]);
  return rows as unknown as Ticket[];
}

export async function organizerCheckInTicket(userId: string, eventId: string, code: string): Promise<Ticket> {
  const [rows] = await withUserContext(userId, (tx) => [tx`select * from public.organizer_check_in_ticket(${eventId}, ${code})`]);
  return rows[0] as unknown as Ticket;
}

export type SelfCheckInResult = { attendee_name: string; event_title: string; already_checked_in: boolean; checked_in_at: string };

export async function selfCheckInTicket(code: string): Promise<SelfCheckInResult> {
  const rows = await sql`select * from public.self_check_in_ticket(${code})`;
  return rows[0] as unknown as SelfCheckInResult;
}

export async function getCampaignEvent(eventId: string): Promise<(CampaignEvent & { campaign_id: string }) | null> {
  const rows = await sql`select id, campaign_id, title, description, starts_at, ends_at, location from public.campaign_events where id = ${eventId}`;
  return (rows[0] as (CampaignEvent & { campaign_id: string })) ?? null;
}
