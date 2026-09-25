-- Push-token registry and the notification-write path. notifications (0002) already has a
-- self-read policy but, like several other 0002/0003 tables, no insert policy -- every write
-- must go through record_notification below.

create table public.push_tokens (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id),
  token text not null unique,
  platform text not null check (platform in ('ios', 'android', 'web')),
  created_at timestamptz not null default now()
);
create index push_tokens_profile_idx on public.push_tokens (profile_id);

alter table public.push_tokens enable row level security;
create policy push_tokens_self_read on public.push_tokens for select using (profile_id = public.current_user_id());
create policy push_tokens_self_insert on public.push_tokens for insert with check (profile_id = public.current_user_id());
create policy push_tokens_self_delete on public.push_tokens for delete using (profile_id = public.current_user_id());

create function public.record_notification(target_profile uuid, target_organization uuid, notification_type text, notification_payload jsonb)
returns public.notifications language sql security definer set search_path = public as $$
  insert into public.notifications (profile_id, organization_id, type, payload)
  values (target_profile, target_organization, notification_type, notification_payload)
  returning *
$$;
revoke all on function public.record_notification(uuid, uuid, text, jsonb) from public;
grant execute on function public.record_notification(uuid, uuid, text, jsonb) to public;

create function public.mark_notification_read(notification_id uuid) returns public.notifications language sql security definer set search_path = public as $$
  update public.notifications set read_at = now() where id = notification_id and profile_id = public.current_user_id() returning *
$$;
revoke all on function public.mark_notification_read(uuid) from public;
grant execute on function public.mark_notification_read(uuid) to public;
