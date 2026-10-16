-- Platform fees are optional tips on donations and tickets. An organization with an active paid
-- subscription is exempt. Charges settle directly into the campaign's connected account, so the
-- platform only ever receives the tip (as Stripe's application fee), never the donation itself.

alter table public.organizations add column subscription_status text not null default 'none'
  check (subscription_status in ('none', 'active', 'past_due', 'canceled'));

-- Platform admin only for now; subscription billing will set this from Stripe webhooks.
create function public.set_organization_subscription_status(target_org uuid, new_status text)
returns public.organizations language plpgsql security definer set search_path = public as $$
declare updated public.organizations;
begin
  if not public.is_platform_admin() then raise exception 'not authorized to change subscriptions'; end if;
  update public.organizations set subscription_status = new_status where id = target_org returning * into updated;
  if updated.id is null then raise exception 'organization not found'; end if;
  return updated;
end;
$$;
revoke all on function public.set_organization_subscription_status(uuid, text) from public;
grant execute on function public.set_organization_subscription_status(uuid, text) to public;

create function public.campaign_platform_fee_waived(target_campaign uuid) returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.campaigns c
    join public.organizations o on o.id = c.organization_id
    where c.id = target_campaign and o.subscription_status = 'active'
  )
$$;
revoke all on function public.campaign_platform_fee_waived(uuid) from public;
grant execute on function public.campaign_platform_fee_waived(uuid) to public;

-- The connected account a donation was charged on: refunds of direct charges must be sent there.
alter table public.donations add column provider_account_id text;

create function public.attach_donation_provider_account(payment_intent_id text, account_id text)
returns void language sql security definer set search_path = public as $$
  update public.donations set provider_account_id = attach_donation_provider_account.account_id
  where provider_payment_id = attach_donation_provider_account.payment_intent_id and provider_account_id is null
$$;
revoke all on function public.attach_donation_provider_account(text, text) from public;
grant execute on function public.attach_donation_provider_account(text, text) to benefitly_app;
