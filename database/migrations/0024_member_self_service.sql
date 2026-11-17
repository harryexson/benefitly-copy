-- Read functions for member self-service and organization dues. Each returns only the caller's own
-- rows, or rows the caller's permissions allow, and never another member's personal details.

create function public.my_memberships()
returns table(member_id uuid, organization_id uuid, org_name text, org_slug text, member_number text, membership_level text,
  status text, dues_amount integer, currency text, paid_current boolean, last_paid_at timestamptz)
language sql stable security definer set search_path = public as $$
  select m.id, o.id, o.name, o.slug, m.member_number, m.membership_level, m.status::text,
    mt.dues_amount, coalesce(mt.currency::text, 'USD'),
    exists (select 1 from public.member_contributions c where c.member_id = m.id and c.status = 'paid' and c.paid_at > now() - interval '12 months'),
    (select max(c.paid_at) from public.member_contributions c where c.member_id = m.id and c.status = 'paid')
  from public.members m
  join public.organizations o on o.id = m.organization_id
  left join public.membership_types mt on mt.organization_id = m.organization_id and mt.name = m.membership_level
  where m.user_id = public.current_user_id()
  order by o.name
$$;
revoke all on function public.my_memberships() from public;
grant execute on function public.my_memberships() to public;

create function public.my_benefit_claims()
returns table(claim_id uuid, organization_name text, program_name text, requested_amount integer, status text, created_at timestamptz)
language sql stable security definer set search_path = public as $$
  select c.id, o.name, p.name, c.requested_amount, c.status::text, c.created_at
  from public.benefit_claims c
  join public.members m on m.id = c.member_id
  join public.organizations o on o.id = c.organization_id
  join public.benefit_programs p on p.id = c.program_id
  where m.user_id = public.current_user_id()
  order by c.created_at desc
$$;
revoke all on function public.my_benefit_claims() from public;
grant execute on function public.my_benefit_claims() to public;

create function public.organization_dues_overview(target_org uuid)
returns table(member_id uuid, member_number text, member_name text, membership_level text, status text, paid_current boolean, last_paid_at timestamptz)
language plpgsql security definer set search_path = public as $$
begin
  if not (public.has_permission(target_org, 'finance.manage') or public.has_permission(target_org, 'members.manage')) then
    raise exception 'not authorized to view dues';
  end if;
  return query
    select m.id, m.member_number, coalesce(m.contact->>'name', m.member_number), m.membership_level, m.status::text,
      exists (select 1 from public.member_contributions c where c.member_id = m.id and c.status = 'paid' and c.paid_at > now() - interval '12 months'),
      (select max(c.paid_at) from public.member_contributions c where c.member_id = m.id and c.status = 'paid')
    from public.members m
    where m.organization_id = target_org and m.status = 'active'
    order by m.member_number;
end;
$$;
revoke all on function public.organization_dues_overview(uuid) from public;
grant execute on function public.organization_dues_overview(uuid) to public;
