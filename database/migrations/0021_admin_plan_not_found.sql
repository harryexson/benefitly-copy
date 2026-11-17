-- The platform-admin plan override returned no row, and no error, for an unknown organization.
-- Callers treated that as success. It now refuses, like set_organization_plan does.
create or replace function public.admin_set_organization_plan(target_org uuid, new_tier text)
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
  if updated.id is null then raise exception 'organization not found'; end if;
  return updated;
end;
$$;
