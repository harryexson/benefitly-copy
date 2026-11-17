-- Fixed-window rate limiter shared by every serverless instance. The counter table is not granted
-- to the app role: callers can only ask rate_limit_hit whether a request is allowed.
create table public.rate_limit_buckets (
  bucket_key text not null,
  window_start timestamptz not null,
  hits integer not null default 0 check (hits >= 0),
  primary key (bucket_key, window_start)
);
alter table public.rate_limit_buckets enable row level security;

create function public.rate_limit_hit(bucket text, max_hits integer, window_seconds integer) returns boolean
language plpgsql security definer set search_path = public as $$
declare window_begin timestamptz; current_hits integer;
begin
  if max_hits < 1 or window_seconds < 1 or window_seconds > 86400 then raise exception 'invalid rate limit'; end if;
  window_begin := to_timestamp(floor(extract(epoch from now()) / window_seconds) * window_seconds);
  insert into public.rate_limit_buckets (bucket_key, window_start, hits) values (bucket, window_begin, 1)
  on conflict (bucket_key, window_start) do update set hits = public.rate_limit_buckets.hits + 1
  returning hits into current_hits;
  if random() < 0.01 then
    delete from public.rate_limit_buckets where window_start < now() - interval '1 day';
  end if;
  return current_hits <= max_hits;
end;
$$;
revoke all on function public.rate_limit_hit(text, integer, integer) from public;
grant execute on function public.rate_limit_hit(text, integer, integer) to benefitly_app;
