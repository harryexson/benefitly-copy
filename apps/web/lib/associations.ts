import { withUserContext } from "@/lib/database";

export type MyOrganization = { id: string; slug: string; name: string; permissions: string[] };
export async function myOrganizations(userId: string): Promise<MyOrganization[]> {
  const [rows] = await withUserContext(userId, (tx) => [tx`select * from public.my_organizations()`]);
  return rows as unknown as MyOrganization[];
}

export async function getOrganizationBySlug(userId: string, slug: string) {
  const [rows] = await withUserContext(userId, (tx) => [
    tx`
      select o.id, o.slug, o.name, m.permissions
      from public.organizations o
      join public.organization_members m on m.organization_id = o.id
      where o.slug = ${slug} and m.user_id = ${userId} and m.status = 'active'
      limit 1
    `,
  ]);
  return (rows[0] as MyOrganization) ?? null;
}

export type Member = { id: string; member_number: string; membership_level: string | null; status: string; contact: Record<string, unknown>; joined_at: string | null };
export async function listMembers(userId: string, orgId: string): Promise<Member[]> {
  const [rows] = await withUserContext(userId, (tx) => [
    tx`select id, member_number, membership_level, status, contact, joined_at from public.members where organization_id = ${orgId} order by joined_at desc nulls last`,
  ]);
  return rows as unknown as Member[];
}

export type BenefitProgram = { id: string; name: string; description: string; maximum_amount: number | null; active: boolean };
export async function listBenefitPrograms(userId: string, orgId: string): Promise<BenefitProgram[]> {
  const [rows] = await withUserContext(userId, (tx) => [
    tx`select id, name, description, maximum_amount, active from public.benefit_programs where organization_id = ${orgId} order by created_at desc`,
  ]);
  return rows as unknown as BenefitProgram[];
}

export type BenefitClaim = { id: string; program_id: string; program_name: string; member_id: string; member_number: string; requested_amount: number; status: string; reason: string; created_at: string };
export async function listBenefitClaims(userId: string, orgId: string): Promise<BenefitClaim[]> {
  const [rows] = await withUserContext(userId, (tx) => [
    tx`
      select c.id, c.program_id, p.name as program_name, c.member_id, m.member_number, c.requested_amount, c.status, c.reason, c.created_at
      from public.benefit_claims c
      join public.benefit_programs p on p.id = c.program_id
      join public.members m on m.id = c.member_id
      where c.organization_id = ${orgId}
      order by c.created_at desc
    `,
  ]);
  return rows as unknown as BenefitClaim[];
}

export type OrgEvent = { id: string; title: string; description: string | null; starts_at: string; ends_at: string | null; location: string | null; capacity: number | null; registration_count: number };
export async function listEvents(userId: string, orgId: string): Promise<OrgEvent[]> {
  const [rows] = await withUserContext(userId, (tx) => [
    tx`
      select e.id, e.title, e.description, e.starts_at, e.ends_at, e.location, e.capacity,
        (select count(*) from public.event_registrations r where r.event_id = e.id and r.status != 'canceled') as registration_count
      from public.events e
      where e.organization_id = ${orgId}
      order by e.starts_at asc
    `,
  ]);
  return rows as unknown as OrgEvent[];
}

export type Announcement = { id: string; title: string; body: string; published_at: string | null };
export async function listAnnouncements(userId: string, orgId: string): Promise<Announcement[]> {
  const [rows] = await withUserContext(userId, (tx) => [
    tx`select id, title, body, published_at from public.announcements where organization_id = ${orgId} order by created_at desc`,
  ]);
  return rows as unknown as Announcement[];
}

export type MyMembership = { id: string } | null;
export async function myMembershipInOrg(userId: string, orgId: string): Promise<MyMembership> {
  const [rows] = await withUserContext(userId, (tx) => [tx`select id from public.members where organization_id = ${orgId} and user_id = ${userId} limit 1`]);
  return (rows[0] as MyMembership) ?? null;
}
