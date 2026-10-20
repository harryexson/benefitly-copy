-- Three more tables from 0002/0003 had row level security enabled with no policies at all
-- (RLS defaults to deny-all once enabled, for every operation, not just the ones without an
-- explicit policy): campaign_beneficiaries and campaign_updates had no read policy, and
-- campaign_reviews had a read policy but no insert policy. Combined, this meant:
--   1. A published campaign's beneficiary was never visible to anyone.
--   2. Campaign updates could never be read, and could never be written at all (insert would
--      raise "new row violates row-level security policy").
--   3. apps/web's own POST /api/campaigns route -- which inserts into campaigns,
--      campaign_beneficiaries and campaign_reviews in one CTE -- would fail outright against a
--      real database, because two of those three inserts had no policy permitting them.
-- Fixed by adding the missing read policies and replacing the raw multi-table insert with a
-- single security-definer function, consistent with every other multi-table write in this schema.

create policy campaign_beneficiaries_read on public.campaign_beneficiaries for select using (
  exists (
    select 1 from public.campaigns c
    where c.id = campaign_id
      and (c.status = 'published' or c.owner_id = public.current_user_id() or (c.organization_id is not null and public.is_org_member(c.organization_id)))
  )
);

create policy campaign_updates_read on public.campaign_updates for select using (
  exists (
    select 1 from public.campaigns c
    where c.id = campaign_id
      and (c.status = 'published' or c.owner_id = public.current_user_id() or (c.organization_id is not null and public.is_org_member(c.organization_id)))
  )
);

create function public.create_campaign_with_review(
  campaign_title text, campaign_story text, campaign_category text, campaign_location text,
  campaign_currency char(3), campaign_goal_amount integer, campaign_organization_id uuid,
  campaign_slug text, beneficiary_name text, beneficiary_relationship text
) returns public.campaigns language plpgsql security definer set search_path = public as $$
declare created public.campaigns;
begin
  if campaign_organization_id is not null and not public.is_org_member(campaign_organization_id) then
    raise exception 'not a member of this organization';
  end if;
  insert into public.campaigns (slug, organization_id, owner_id, title, story, category, location, currency, goal_amount, status)
  values (campaign_slug, campaign_organization_id, public.current_user_id(), campaign_title, campaign_story, campaign_category, campaign_location, campaign_currency, campaign_goal_amount, 'review')
  returning * into created;

  insert into public.campaign_beneficiaries (campaign_id, profile_id, name, relationship)
  values (created.id, public.current_user_id(), beneficiary_name, beneficiary_relationship);

  insert into public.campaign_reviews (campaign_id, status, submitted_by)
  values (created.id, 'pending', public.current_user_id());

  return created;
end;
$$;
revoke all on function public.create_campaign_with_review(text, text, text, text, char(3), integer, uuid, text, text, text) from public;
grant execute on function public.create_campaign_with_review(text, text, text, text, char(3), integer, uuid, text, text, text) to public;

create function public.post_campaign_update(target_campaign uuid, update_body text)
returns public.campaign_updates language plpgsql security definer set search_path = public as $$
declare inserted public.campaign_updates; campaign_owner uuid; campaign_org uuid;
begin
  select owner_id, organization_id into campaign_owner, campaign_org from public.campaigns where id = target_campaign;
  if campaign_owner is distinct from public.current_user_id() and not (campaign_org is not null and public.is_org_member(campaign_org)) then
    raise exception 'not authorized to post updates for this campaign';
  end if;
  insert into public.campaign_updates (campaign_id, author_id, body) values (target_campaign, public.current_user_id(), update_body) returning * into inserted;
  return inserted;
end;
$$;
revoke all on function public.post_campaign_update(uuid, text) from public;
grant execute on function public.post_campaign_update(uuid, text) to public;
