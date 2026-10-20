-- Paid subscription tiers for the association-management platform, and the member-count gate
-- that enforces them. Benefitly's subscription fee is separate from Payment Provider processing
-- fees (see docs/architecture/PAYMENT_PROVIDER_DECISION.md); this table only tracks the
-- administrative plan an organization is on and the limits that come with it.

create table public.subscription_plans (
  tier text primary key,
  name text not null,
  member_limit integer, -- null = unlimited (Enterprise)
  monthly_price_cents integer, -- null = custom pricing (Enterprise)
  annual_price_cents integer,
  sort_order integer not null,
  features text[] not null default '{}'
);

insert into public.subscription_plans (tier, name, member_limit, monthly_price_cents, annual_price_cents, sort_order, features) values
  ('community', 'Community', 50, 3500, 42000 - 7000, 1,
    array['Up to 50 members','Member & event management','Contribution collection','Basic benefit payouts','Standard reports','Email support']),
  ('starter', 'Starter', 100, 3300, 39600 - 6600, 2,
    array['Up to 100 members','All Community features, plus:','Advanced payout management','PDF & CSV reports','Stripe integration','Email reminders']),
  ('growth', 'Growth', 300, 6600, 79200 - 13200, 3,
    array['Up to 300 members','All Starter features, plus:','Volunteer management','Bulk payout processing','Custom email templates','Advanced user roles','Priority support']),
  ('scale', 'Scale', 1000, 16500, 198000 - 33000, 4,
    array['Up to 1,000 members','All Growth features, plus:','Automated report delivery','White-glove onboarding','Dedicated account manager','API access','Phone & email support']),
  ('enterprise', 'Enterprise', null, null, null, 5,
    array['Over 1,000 members','All Scale features, plus:','Dedicated infrastructure','Custom integrations','Custom SSO integration','24/7 phone support','SLA guarantee']);

alter table public.organizations add column plan_tier text not null default 'community' references public.subscription_plans(tier);

-- Read access to the plan catalog is public -- it's marketing/pricing data, not tenant data.
alter table public.subscription_plans enable row level security;
create policy subscription_plans_public_read on public.subscription_plans for select using (true);

-- This migration runs after 0009_force_row_level_security.sql (see database/README.md's apply
-- order), so benefitly_app already exists. A table created after 0009 gets no privileges by
-- default -- 0009 grants per table by name rather than relying on default privileges -- so
-- subscription_plans needs its own explicit grant the same way every other app-facing table does.
grant select on public.subscription_plans to benefitly_app;

-- security definer: same reasoning as add_member itself -- called from RLS-restricted context
-- and needs to read organization_members/subscription_plans without depending on the caller's
-- own grants.
create function public.organization_member_usage(target_org uuid)
returns table (member_count integer, member_limit integer, plan_tier text, plan_name text)
language sql stable security definer set search_path = public as $$
  select
    (select count(*)::integer from public.members where organization_id = target_org and status = 'active'),
    p.member_limit,
    o.plan_tier,
    p.name
  from public.organizations o
  join public.subscription_plans p on p.tier = o.plan_tier
  where o.id = target_org
$$;
revoke all on function public.organization_member_usage(uuid) from public;
grant execute on function public.organization_member_usage(uuid) to public;

create or replace function public.add_member(target_org uuid, member_user_id uuid, number text, level text, contact_info jsonb)
returns public.members language plpgsql security definer set search_path = public as $$
declare inserted public.members; current_count integer; plan_limit integer;
begin
  if not public.has_permission(target_org, 'members.manage') then raise exception 'not authorized to manage members'; end if;

  select count(*) into current_count from public.members where organization_id = target_org and status = 'active';
  select p.member_limit into plan_limit from public.organizations o join public.subscription_plans p on p.tier = o.plan_tier where o.id = target_org;
  if plan_limit is not null and current_count >= plan_limit then
    raise exception 'member limit reached for your plan (% of % members) -- upgrade your plan to add more', current_count, plan_limit;
  end if;

  insert into public.members (organization_id, user_id, member_number, membership_level, contact, status, joined_at)
  values (target_org, member_user_id, number, level, coalesce(contact_info, '{}'::jsonb), 'active', now())
  returning * into inserted;
  return inserted;
end;
$$;

create function public.set_organization_plan(target_org uuid, new_tier text)
returns public.organizations language plpgsql security definer set search_path = public as $$
declare updated public.organizations; current_count integer; new_limit integer;
begin
  if not public.has_permission(target_org, 'organization.manage') then raise exception 'not authorized to change the plan'; end if;
  select member_limit into new_limit from public.subscription_plans where tier = new_tier;
  if not found then raise exception 'unknown plan tier: %', new_tier; end if;

  select count(*) into current_count from public.members where organization_id = target_org and status = 'active';
  if new_limit is not null and current_count > new_limit then
    raise exception 'cannot downgrade: % active members exceeds the % plan limit of %', current_count, new_tier, new_limit;
  end if;

  update public.organizations set plan_tier = new_tier where id = target_org returning * into updated;
  return updated;
end;
$$;
revoke all on function public.set_organization_plan(uuid, text) from public;
grant execute on function public.set_organization_plan(uuid, text) to public;
