-- campaign_media (0002) had row level security enabled with zero policies, which -- since RLS
-- defaults to deny-all once enabled -- silently blocked every read and write, including public
-- campaign images on already-published campaigns. This migration adds the missing policies and
-- the columns needed to support photo/video upload.

alter table public.campaign_media add column if not exists media_type text not null default 'image' check (media_type in ('image', 'video'));
alter table public.campaign_media add column if not exists content_type text;
alter table public.campaign_media add column if not exists size_bytes integer check (size_bytes is null or size_bytes >= 0);
alter table public.campaign_media add column if not exists uploaded_by uuid references public.profiles(id);

create policy campaign_media_public_read on public.campaign_media for select using (
  exists (
    select 1 from public.campaigns c
    where c.id = campaign_id
      and (c.status = 'published' or c.owner_id = public.current_user_id() or (c.organization_id is not null and public.is_org_member(c.organization_id)))
  )
);

-- Inserts/deletes still go through the security-definer functions below rather than a policy,
-- so the owner/org-member check and the per-campaign media-count cap live in one place.
create function public.add_campaign_media(target_campaign uuid, key text, media_kind text, mime_type text, byte_size integer, alt text)
returns public.campaign_media language plpgsql security definer set search_path = public as $$
declare inserted public.campaign_media; campaign_owner uuid; campaign_org uuid; existing_count integer;
begin
  select owner_id, organization_id into campaign_owner, campaign_org from public.campaigns where id = target_campaign;
  if campaign_owner is distinct from public.current_user_id() and not (campaign_org is not null and public.is_org_member(campaign_org)) then
    raise exception 'not authorized to add media to this campaign';
  end if;
  select count(*) into existing_count from public.campaign_media where campaign_id = target_campaign;
  if existing_count >= 12 then raise exception 'campaigns are limited to 12 photos/videos'; end if;
  insert into public.campaign_media (campaign_id, storage_key, alt_text, position, media_type, content_type, size_bytes, uploaded_by)
  values (target_campaign, key, alt, existing_count, media_kind, mime_type, byte_size, public.current_user_id())
  returning * into inserted;
  return inserted;
end;
$$;
revoke all on function public.add_campaign_media(uuid, text, text, text, integer, text) from public;
grant execute on function public.add_campaign_media(uuid, text, text, text, integer, text) to public;

create function public.remove_campaign_media(media_id uuid) returns void language plpgsql security definer set search_path = public as $$
declare campaign_owner uuid; campaign_org uuid; target_campaign uuid;
begin
  select m.campaign_id, c.owner_id, c.organization_id into target_campaign, campaign_owner, campaign_org
  from public.campaign_media m join public.campaigns c on c.id = m.campaign_id where m.id = media_id;
  if campaign_owner is distinct from public.current_user_id() and not (campaign_org is not null and public.is_org_member(campaign_org)) then
    raise exception 'not authorized to remove this media';
  end if;
  delete from public.campaign_media where id = media_id;
end;
$$;
revoke all on function public.remove_campaign_media(uuid) from public;
grant execute on function public.remove_campaign_media(uuid) to public;
