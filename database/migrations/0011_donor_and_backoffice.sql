-- Donor-facing giving features and a real platform-admin back office. Before this migration a
-- donor could not see their own donation history at all (donations_tenant_read (0001) only
-- lets the *campaign owner/org* read a donation row, never the donor), "giving plan" existed
-- only as browser localStorage (apps/web/components/giving-plan.tsx), and the only back-office
-- screen was the moderation queue -- there was no cross-tenant view of organizations, no way to
-- read audit_logs or webhook_events except directly as the owner role.

-- ===== Donor read access =====
-- Additive: donations_tenant_read (0001) is untouched, this just adds the donor's own view of it.
create policy donations_donor_read on public.donations for select using (donor_id = public.current_user_id());

-- ===== Saved campaigns (replaces the localStorage-only "save" list in giving-plan.tsx) =====
create table public.saved_campaigns (
  profile_id uuid not null references public.profiles(id),
  campaign_id uuid not null references public.campaigns(id),
  created_at timestamptz not null default now(),
  primary key (profile_id, campaign_id)
);
alter table public.saved_campaigns enable row level security;
create policy saved_campaigns_owner_read on public.saved_campaigns for select using (profile_id = public.current_user_id());
revoke insert, update, delete on public.saved_campaigns from public;
-- This migration runs after 0009_force_row_level_security.sql, which grants per table by name
-- rather than relying on default privileges (see that migration and 0010's own grant for
-- subscription_plans) -- a table created here needs the same explicit grant.
grant select on public.saved_campaigns to benefitly_app;

-- security definer: saved_campaigns has no insert/delete policy at all (like payment_accounts,
-- 0003) -- toggling on behalf of the caller happens here, atomically, rather than via a policy
-- that would need to special-case "insert/delete my own row".
create function public.toggle_saved_campaign(target_campaign uuid) returns boolean language plpgsql security definer set search_path = public as $$
begin
  delete from public.saved_campaigns where profile_id = public.current_user_id() and campaign_id = target_campaign;
  if found then return false; end if;
  insert into public.saved_campaigns (profile_id, campaign_id) values (public.current_user_id(), target_campaign);
  return true;
end;
$$;
revoke all on function public.toggle_saved_campaign(uuid) from public;
grant execute on function public.toggle_saved_campaign(uuid) to public;

-- ===== Giving plans: a donor's recurring/planned giving intent =====
-- This tracks the donor's own commitment (amount, cadence, target) and reminds them -- it does
-- not itself charge a payment method. Automated recurring charging needs a payment provider's
-- own subscription primitive (Stripe/Adyen), which is not wired up yet (see
-- docs/architecture/PAYMENT_PROVIDER_DECISION.md); building that execution path against
-- placeholder provider credentials would not be something that could actually be verified to
-- work, unlike everything else in this schema. This is the real, DB-backed half of the feature:
-- the plan itself, persisted per-donor and readable only by that donor.
create type public.giving_plan_cadence as enum ('weekly', 'monthly', 'quarterly', 'annually');
create type public.giving_plan_status as enum ('active', 'paused', 'cancelled');

create table public.giving_plans (
  id uuid primary key default gen_random_uuid(),
  donor_id uuid not null references public.profiles(id),
  campaign_id uuid references public.campaigns(id),
  category text,
  amount_cents integer not null check (amount_cents > 0),
  currency char(3) not null default 'USD',
  cadence public.giving_plan_cadence not null,
  status public.giving_plan_status not null default 'active',
  annual_goal_cents integer check (annual_goal_cents is null or annual_goal_cents > 0),
  next_reminder_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (campaign_id is not null or category is not null)
);
create index giving_plans_donor_idx on public.giving_plans (donor_id, status);
alter table public.giving_plans enable row level security;
create policy giving_plans_owner_read on public.giving_plans for select using (donor_id = public.current_user_id());
revoke insert, update, delete on public.giving_plans from public;
grant select on public.giving_plans to benefitly_app;

create function public.create_giving_plan(
  target_campaign uuid, target_category text, plan_amount_cents integer, plan_currency char(3),
  plan_cadence public.giving_plan_cadence, plan_annual_goal_cents integer
) returns public.giving_plans language plpgsql security definer set search_path = public as $$
declare inserted public.giving_plans;
begin
  insert into public.giving_plans (donor_id, campaign_id, category, amount_cents, currency, cadence, annual_goal_cents, next_reminder_at)
  values (
    public.current_user_id(), target_campaign, target_category, plan_amount_cents, plan_currency, plan_cadence, plan_annual_goal_cents,
    now() + case plan_cadence
      when 'weekly' then interval '7 days'
      when 'monthly' then interval '1 month'
      when 'quarterly' then interval '3 months'
      else interval '1 year'
    end
  )
  returning * into inserted;
  return inserted;
end;
$$;
revoke all on function public.create_giving_plan(uuid, text, integer, char(3), public.giving_plan_cadence, integer) from public;
grant execute on function public.create_giving_plan(uuid, text, integer, char(3), public.giving_plan_cadence, integer) to public;

create function public.set_giving_plan_status(target_plan uuid, new_status public.giving_plan_status)
returns public.giving_plans language plpgsql security definer set search_path = public as $$
declare updated public.giving_plans;
begin
  update public.giving_plans set status = new_status, updated_at = now()
  where id = target_plan and donor_id = public.current_user_id()
  returning * into updated;
  if updated.id is null then raise exception 'giving plan not found'; end if;
  return updated;
end;
$$;
revoke all on function public.set_giving_plan_status(uuid, public.giving_plan_status) from public;
grant execute on function public.set_giving_plan_status(uuid, public.giving_plan_status) to public;

-- ===== Donor dashboard reads =====
create function public.my_donations() returns table (
  id uuid, campaign_id uuid, campaign_title text, campaign_slug text,
  gross_amount integer, currency char(3), status public.donation_status, created_at timestamptz
) language sql stable security definer set search_path = public as $$
  select d.id, d.campaign_id, c.title, c.slug, d.gross_amount, d.currency, d.status, d.created_at
  from public.donations d join public.campaigns c on c.id = d.campaign_id
  where d.donor_id = public.current_user_id()
  order by d.created_at desc
$$;
revoke all on function public.my_donations() from public;
grant execute on function public.my_donations() to public;

create function public.my_giving_summary() returns table (
  total_given_cents bigint, campaigns_supported integer, donation_count integer, ytd_given_cents bigint
) language sql stable security definer set search_path = public as $$
  select
    coalesce(sum(gross_amount) filter (where status = 'succeeded'), 0)::bigint,
    count(distinct campaign_id) filter (where status = 'succeeded')::integer,
    count(*) filter (where status = 'succeeded')::integer,
    coalesce(sum(gross_amount) filter (where status = 'succeeded' and created_at >= date_trunc('year', now())), 0)::bigint
  from public.donations where donor_id = public.current_user_id()
$$;
revoke all on function public.my_giving_summary() from public;
grant execute on function public.my_giving_summary() to public;

-- ===== Platform-admin back office =====
-- Same style as list_pending_payouts (0004): guard in the WHERE clause rather than raising, so a
-- non-admin caller simply sees an empty result instead of an error leaking "you're not an admin".

create function public.platform_stats() returns table (
  total_campaigns integer, published_campaigns integer, total_organizations integer,
  total_raised_cents bigint, total_donors integer, pending_reviews integer, open_reports integer, pending_payouts integer
) language sql stable security definer set search_path = public as $$
  select
    (select count(*)::integer from public.campaigns),
    (select count(*)::integer from public.campaigns where status = 'published'),
    (select count(*)::integer from public.organizations),
    (select coalesce(sum(gross_amount), 0) from public.donations where status = 'succeeded'),
    (select count(distinct donor_id)::integer from public.donations where status = 'succeeded' and donor_id is not null),
    (select count(*)::integer from public.campaign_reviews where status = 'pending'),
    (select count(*)::integer from public.campaign_reports where status = 'open'),
    (select count(*)::integer from public.payouts where status in ('pending', 'verification_required'))
  where public.is_platform_admin()
$$;
revoke all on function public.platform_stats() from public;
grant execute on function public.platform_stats() to public;

create function public.list_organizations_admin() returns table (
  id uuid, name text, slug text, plan_tier text, member_count integer, total_raised_cents bigint, created_at timestamptz
) language sql stable security definer set search_path = public as $$
  select o.id, o.name, o.slug, o.plan_tier,
    (select count(*)::integer from public.members m where m.organization_id = o.id and m.status = 'active'),
    coalesce((select sum(c.raised_amount) from public.campaigns c where c.organization_id = o.id), 0)::bigint,
    o.created_at
  from public.organizations o
  where public.is_platform_admin()
  order by o.created_at desc
$$;
revoke all on function public.list_organizations_admin() from public;
grant execute on function public.list_organizations_admin() to public;

-- Mirrors set_organization_plan (0010) but for a platform admin acting on any org, not an org
-- member acting on their own org -- has_permission(org, 'organization.manage') would reject an
-- admin with no membership row in that org at all, which is the normal case.
create function public.admin_set_organization_plan(target_org uuid, new_tier text)
returns public.organizations language plpgsql security definer set search_path = public as $$
declare updated public.organizations; current_count integer; new_limit integer;
begin
  if not public.is_platform_admin() then raise exception 'not authorized'; end if;
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
revoke all on function public.admin_set_organization_plan(uuid, text) from public;
grant execute on function public.admin_set_organization_plan(uuid, text) to public;

create function public.list_audit_log_admin(row_limit integer default 100) returns setof public.audit_logs
language sql stable security definer set search_path = public as $$
  select * from public.audit_logs where public.is_platform_admin() order by created_at desc limit row_limit
$$;
revoke all on function public.list_audit_log_admin(integer) from public;
grant execute on function public.list_audit_log_admin(integer) to public;

create function public.list_webhook_events_admin(row_limit integer default 100) returns setof public.webhook_events
language sql stable security definer set search_path = public as $$
  select * from public.webhook_events where public.is_platform_admin() order by received_at desc limit row_limit
$$;
revoke all on function public.list_webhook_events_admin(integer) from public;
grant execute on function public.list_webhook_events_admin(integer) to public;

-- ===== Organizer dashboard: per-campaign donor list =====
-- donations_tenant_read (0001) already lets the campaign owner/org member select these rows
-- directly; this just shapes the join the dashboard actually wants (donor name, no need for a
-- new grant since donations+campaigns+profiles are all already select-granted to benefitly_app).
create function public.list_campaign_donors(target_campaign uuid) returns table (
  id uuid, donor_name text, gross_amount integer, currency char(3), status public.donation_status, created_at timestamptz
) language sql stable security definer set search_path = public as $$
  select d.id, coalesce(p.name, 'Anonymous'), d.gross_amount, d.currency, d.status, d.created_at
  from public.donations d
  join public.campaigns c on c.id = d.campaign_id
  left join public.profiles p on p.id = d.donor_id
  where d.campaign_id = target_campaign
    and (c.owner_id = public.current_user_id() or (c.organization_id is not null and public.is_org_member(c.organization_id)))
  order by d.created_at desc
$$;
revoke all on function public.list_campaign_donors(uuid) from public;
grant execute on function public.list_campaign_donors(uuid) to public;
