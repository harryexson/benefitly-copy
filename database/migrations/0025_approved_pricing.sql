-- Approved pricing: Free 50 members; Starter $39/mo or $390/yr up to 150 members; Growth $99/mo or
-- $990/yr up to 500; Scale $249/mo or $2,490/yr up to 2,000; Enterprise custom. The first 100
-- organizations to pay for Starter get the founder price of $29/mo or $290/yr.

update public.subscription_plans set name = 'Free', member_limit = 50, monthly_price_cents = 0, annual_price_cents = 0,
  features = array['Up to 50 members', 'Member invitations by email', 'Donations with optional donor tips', 'Campaigns, events and ticket sales', 'Community email support']
where tier = 'free';
update public.subscription_plans set member_limit = 150, monthly_price_cents = 3900, annual_price_cents = 39000,
  features = array['Up to 150 members', 'Everything in Free, plus:', 'Member dues collection through Stripe', 'Benefit programs and approved payouts']
where tier = 'starter';
update public.subscription_plans set monthly_price_cents = 9900, annual_price_cents = 99000 where tier = 'growth';
update public.subscription_plans set monthly_price_cents = 24900, annual_price_cents = 249000 where tier = 'scale';

alter table public.organizations add column founder_pricing boolean not null default false;

create function public.founder_slots_remaining(limit_count integer default 100) returns integer
language sql stable security definer set search_path = public as $$
  select greatest(0, limit_count - (select count(*)::integer from public.organizations where founder_pricing))
$$;
revoke all on function public.founder_slots_remaining(integer) from public;
grant execute on function public.founder_slots_remaining(integer) to benefitly_app;

-- Called by the webhook only after Stripe confirms the first payment, so abandoned checkouts never
-- use up a founder slot. The advisory lock makes the count-and-claim atomic across instances.
create function public.mark_founder_pricing(target_org uuid, limit_count integer default 100) returns boolean
language plpgsql security definer set search_path = public as $$
declare taken integer;
begin
  perform pg_advisory_xact_lock(hashtext('founder_pricing'));
  if exists (select 1 from public.organizations where id = target_org and founder_pricing) then return true; end if;
  select count(*)::integer into taken from public.organizations where founder_pricing;
  if taken >= limit_count then return false; end if;
  update public.organizations set founder_pricing = true where id = target_org;
  return true;
end;
$$;
revoke all on function public.mark_founder_pricing(uuid, integer) from public;
grant execute on function public.mark_founder_pricing(uuid, integer) to benefitly_app;

drop function public.organization_billing_context(uuid);
create function public.organization_billing_context(target_org uuid)
returns table(org_name text, org_slug text, plan_tier text, subscription_status text, stripe_customer_id text, stripe_subscription_id text, founder_pricing boolean)
language plpgsql security definer set search_path = public as $$
begin
  if not public.has_permission(target_org, 'organization.manage') then raise exception 'not authorized to manage billing'; end if;
  return query
    select o.name, o.slug, o.plan_tier, o.subscription_status, o.stripe_customer_id, o.stripe_subscription_id, o.founder_pricing
    from public.organizations o where o.id = target_org;
end;
$$;
revoke all on function public.organization_billing_context(uuid) from public;
grant execute on function public.organization_billing_context(uuid) to public;
