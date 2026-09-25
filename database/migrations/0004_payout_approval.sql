-- Payout visibility fixes + the admin approve/execute workflow.
-- 0002's payouts_tenant_read policy only covers organization-owned campaigns; an individual
-- organizer (organization_id is null) could not see their own payout rows at all. Fixed here
-- with an owner-read policy, alongside the admin-read policy and the functions that carry a
-- payout from 'pending' through 'approved' to 'paid'/'failed'.

create policy payouts_owner_read on public.payouts for select using (
  exists (select 1 from public.campaigns c where c.id = campaign_id and c.owner_id = public.current_user_id())
);
create policy payouts_admin_read on public.payouts for select using (public.is_platform_admin());

-- Admin-only queue of payouts awaiting a decision, with enough campaign/provider context to act.
create function public.list_pending_payouts()
returns table (
  id uuid, campaign_id uuid, campaign_title text, campaign_slug text,
  amount integer, currency char(3), status public.payout_status,
  provider text, provider_account_id text, requested_by uuid, requester_name text, created_at timestamptz
) language sql stable security definer set search_path = public as $$
  select p.id, p.campaign_id, c.title, c.slug, p.amount, p.currency, p.status,
    pa.provider, pa.provider_account_id, p.requested_by, prof.name, p.created_at
  from public.payouts p
  join public.campaigns c on c.id = p.campaign_id
  join public.payment_accounts pa on pa.id = p.payment_account_id
  left join public.profiles prof on prof.id = p.requested_by
  where public.is_platform_admin() and p.status in ('pending', 'verification_required')
  order by p.created_at asc
$$;
revoke all on function public.list_pending_payouts() from public;
grant execute on function public.list_pending_payouts() to public;

-- Step 1: admin approves. Does not talk to a payment provider -- see mark_payout_executed/failed,
-- called by application code right after the provider call actually succeeds or fails.
create function public.approve_payout(target_payout uuid)
returns public.payouts language plpgsql security definer set search_path = public as $$
declare result public.payouts;
begin
  if not public.is_platform_admin() then raise exception 'not authorized to approve payouts'; end if;
  update public.payouts set status = 'approved', approved_by = public.current_user_id(), updated_at = now()
  where id = target_payout and status in ('pending', 'verification_required')
  returning * into result;
  if result.id is null then raise exception 'payout is not awaiting approval'; end if;
  return result;
end;
$$;
revoke all on function public.approve_payout(uuid) from public;
grant execute on function public.approve_payout(uuid) to public;

create function public.mark_payout_executed(target_payout uuid, provider_payout_id text, new_status public.payout_status)
returns public.payouts language plpgsql security definer set search_path = public as $$
declare result public.payouts;
begin
  if not public.is_platform_admin() then raise exception 'not authorized to update payouts'; end if;
  update public.payouts set status = new_status, provider_payout_id = mark_payout_executed.provider_payout_id, updated_at = now()
  where id = target_payout and status = 'approved'
  returning * into result;
  return result;
end;
$$;
revoke all on function public.mark_payout_executed(uuid, text, public.payout_status) from public;
grant execute on function public.mark_payout_executed(uuid, text, public.payout_status) to public;

create function public.mark_payout_failed(target_payout uuid) returns public.payouts language plpgsql security definer set search_path = public as $$
declare result public.payouts;
begin
  if not public.is_platform_admin() then raise exception 'not authorized to update payouts'; end if;
  update public.payouts set status = 'failed', updated_at = now() where id = target_payout and status = 'approved' returning * into result;
  return result;
end;
$$;
revoke all on function public.mark_payout_failed(uuid) from public;
grant execute on function public.mark_payout_failed(uuid) to public;
