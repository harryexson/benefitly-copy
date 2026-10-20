-- Member dues checkout support. Dues are charged directly on the organization's connected account
-- (see StripeConnectAdapter.createDirectCharge), so this migration only records and settles them.

create unique index member_contributions_payment_reference_key on public.member_contributions (payment_reference)
  where payment_reference is not null;

-- Retrying the same checkout (same PaymentIntent) returns the existing pending row instead of
-- recording a second dues payment. Replaces 0015's version (its parameter name cannot change in place).
drop function public.create_member_dues_payment(uuid, text, integer, char(3), text);
create function public.create_member_dues_payment(target_member uuid, contribution_type_name text, amount_value integer, currency_code char(3), provider_reference text)
returns public.member_contributions language plpgsql security definer set search_path = public as $$
declare target_org uuid; owner_id uuid; kind_id uuid; result public.member_contributions;
begin
  select organization_id, user_id into target_org, owner_id from public.members where id = target_member;
  if owner_id is distinct from public.current_user_id() then raise exception 'not authorized to pay dues for this member'; end if;
  select id into kind_id from public.contribution_types where organization_id = target_org and name = contribution_type_name;
  if kind_id is null then
    insert into public.contribution_types (organization_id, name, kind) values (target_org, contribution_type_name, 'dues') returning id into kind_id;
  end if;
  insert into public.member_contributions (organization_id, member_id, contribution_type_id, amount, currency, status, payment_reference)
  values (target_org, target_member, kind_id, amount_value, currency_code, 'pending', provider_reference)
  on conflict (payment_reference) where payment_reference is not null
  do update set payment_reference = excluded.payment_reference
  returning * into result;
  return result;
end;
$$;
revoke all on function public.create_member_dues_payment(uuid, text, integer, char(3), text) from public;
grant execute on function public.create_member_dues_payment(uuid, text, integer, char(3), text) to public;

-- The organization's active connected account, visible only to the member paying. Returns no row
-- until the organization's Stripe onboarding is complete, so dues cannot be charged early.
create function public.member_dues_destination(target_member uuid)
returns table(provider_account_id text) language plpgsql security definer set search_path = public as $$
declare owner_id uuid; target_org uuid;
begin
  select user_id, organization_id into owner_id, target_org from public.members where id = target_member;
  if owner_id is distinct from public.current_user_id() then raise exception 'not authorized to pay dues for this member'; end if;
  return query
    select pa.provider_account_id from public.payment_accounts pa
    where pa.organization_id = target_org and pa.provider = 'stripe_connect' and pa.status = 'active'
    limit 1;
end;
$$;
revoke all on function public.member_dues_destination(uuid) from public;
grant execute on function public.member_dues_destination(uuid) to public;
