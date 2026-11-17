-- Organization subscriptions are billed through Stripe Billing. Paid plan changes happen only when
-- Stripe confirms a subscription (apply_organization_subscription, webhook-only); organization
-- managers can no longer switch themselves onto a paid tier for free.

insert into public.subscription_plans (tier, name, member_limit, monthly_price_cents, annual_price_cents, sort_order, features) values
  ('free', 'Free', 25, 0, 0, 0,
    array['Up to 25 members', 'Donations with optional donor tips', 'Campaigns, events and ticket sales', 'Community email support']),
  ('starter', 'Starter', 100, 2900, 29000, 1,
    array['Up to 100 members', 'Everything in Free, plus:', 'Member dues collection through Stripe', 'Benefit programs and approved payouts', 'CSV reports and email reminders']),
  ('growth', 'Growth', 500, 7900, 79000, 2,
    array['Up to 500 members', 'Everything in Starter, plus:', 'Volunteer and event registration', 'Bulk payout processing', 'Custom email templates and advanced roles', 'Priority email support']),
  ('scale', 'Scale', 2000, 19900, 199000, 3,
    array['Up to 2,000 members', 'Everything in Growth, plus:', 'Automated report delivery', 'API access', 'Dedicated onboarding and phone support']),
  ('enterprise', 'Enterprise', null, null, null, 4,
    array['Unlimited members', 'Everything in Scale, plus:', 'Custom integrations and SSO', 'Dedicated infrastructure', 'SLA and account manager'])
on conflict (tier) do update set name = excluded.name, member_limit = excluded.member_limit, monthly_price_cents = excluded.monthly_price_cents,
  annual_price_cents = excluded.annual_price_cents, sort_order = excluded.sort_order, features = excluded.features;

alter table public.organizations alter column plan_tier set default 'free';
update public.organizations set plan_tier = 'starter' where plan_tier = 'community' and subscription_status = 'active';
update public.organizations set plan_tier = 'free' where plan_tier = 'community';
delete from public.subscription_plans where tier = 'community';

alter table public.organizations add column stripe_customer_id text unique, add column stripe_subscription_id text unique;

-- Paid tiers are bought through billing. Platform admins keep the override in admin_set_organization_plan.
create or replace function public.set_organization_plan(target_org uuid, new_tier text)
returns public.organizations language plpgsql security definer set search_path = public as $$
declare updated public.organizations; current_count integer; new_limit integer; current_status text;
begin
  if not public.has_permission(target_org, 'organization.manage') then raise exception 'not authorized to change the plan'; end if;
  select subscription_status into current_status from public.organizations where id = target_org;
  if new_tier <> 'free' then raise exception 'paid plans are purchased through billing'; end if;
  if current_status = 'active' then raise exception 'cancel your subscription in billing before changing plans'; end if;

  select member_limit into new_limit from public.subscription_plans where tier = new_tier;
  if not found then raise exception 'unknown plan tier: %', new_tier; end if;

  select count(*) into current_count from public.members where organization_id = target_org and status = 'active';
  if new_limit is not null and current_count > new_limit then
    raise exception 'cannot downgrade: % active members exceeds the % plan limit of %', current_count, new_tier, new_limit;
  end if;

  update public.organizations set plan_tier = new_tier where id = target_org returning * into updated;
  if updated.id is null then raise exception 'organization not found'; end if;
  return updated;
end;
$$;

create function public.organization_billing_context(target_org uuid)
returns table(org_name text, org_slug text, plan_tier text, subscription_status text, stripe_customer_id text, stripe_subscription_id text)
language plpgsql security definer set search_path = public as $$
begin
  if not public.has_permission(target_org, 'organization.manage') then raise exception 'not authorized to manage billing'; end if;
  return query
    select o.name, o.slug, o.plan_tier, o.subscription_status, o.stripe_customer_id, o.stripe_subscription_id
    from public.organizations o where o.id = target_org;
end;
$$;
revoke all on function public.organization_billing_context(uuid) from public;
grant execute on function public.organization_billing_context(uuid) to public;

create function public.save_organization_stripe_customer(target_org uuid, customer_id text)
returns text language plpgsql security definer set search_path = public as $$
declare saved text;
begin
  if not public.has_permission(target_org, 'organization.manage') then raise exception 'not authorized to manage billing'; end if;
  update public.organizations set stripe_customer_id = coalesce(stripe_customer_id, save_organization_stripe_customer.customer_id)
  where id = target_org returning stripe_customer_id into saved;
  return saved;
end;
$$;
revoke all on function public.save_organization_stripe_customer(uuid, text) from public;
grant execute on function public.save_organization_stripe_customer(uuid, text) to public;

-- Called only from the Stripe webhook, which runs as benefitly_app after verifying the signature.
create function public.apply_organization_subscription(target_org uuid, new_tier text, new_status text, subscription_id text)
returns public.organizations language plpgsql security definer set search_path = public as $$
declare updated public.organizations;
begin
  update public.organizations
  set plan_tier = new_tier, subscription_status = new_status, stripe_subscription_id = apply_organization_subscription.subscription_id
  where id = target_org returning * into updated;
  if updated.id is null then raise exception 'organization not found'; end if;
  return updated;
end;
$$;
revoke all on function public.apply_organization_subscription(uuid, text, text, text) from public;
grant execute on function public.apply_organization_subscription(uuid, text, text, text) to benefitly_app;
