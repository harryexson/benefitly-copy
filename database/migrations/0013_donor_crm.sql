-- Organization-facing donor CRM: a donor list built automatically from every succeeded donation
-- against that organization's campaigns (no manual entry), filterable by date/amount/campaign,
-- plus a per-donor full-history drill-down. Same WHERE-clause-guard style as
-- list_campaign_donors (0011): unauthorized callers get an empty result, not an error.

create function public.list_organization_donors(
  target_org uuid, from_date timestamptz default null, to_date timestamptz default null,
  min_amount integer default null, target_campaign uuid default null
) returns table (
  donor_id uuid, donor_name text, donor_email text, donation_count integer,
  total_given integer, currency char(3), first_gift_at timestamptz, last_gift_at timestamptz
) language sql stable security definer set search_path = public as $$
  select d.donor_id, coalesce(p.name, 'Anonymous'), p.email, count(*)::integer, sum(d.gross_amount)::integer, min(d.currency), min(d.created_at), max(d.created_at)
  from public.donations d
  join public.campaigns c on c.id = d.campaign_id
  left join public.profiles p on p.id = d.donor_id
  where c.organization_id = target_org
    and d.status = 'succeeded'
    and d.donor_id is not null
    and public.has_permission(target_org, 'finance.manage')
    and (from_date is null or d.created_at >= from_date)
    and (to_date is null or d.created_at <= to_date)
    and (target_campaign is null or d.campaign_id = target_campaign)
  group by d.donor_id, p.name, p.email
  having (min_amount is null or sum(d.gross_amount) >= min_amount)
  order by sum(d.gross_amount) desc
$$;
revoke all on function public.list_organization_donors(uuid, timestamptz, timestamptz, integer, uuid) from public;
grant execute on function public.list_organization_donors(uuid, timestamptz, timestamptz, integer, uuid) to public;

-- Full gift history for one donor within one organization -- the drill-down behind a donor row.
create function public.donor_history_in_organization(target_org uuid, target_donor uuid)
returns table (donation_id uuid, campaign_title text, campaign_slug text, gross_amount integer, currency char(3), created_at timestamptz)
language sql stable security definer set search_path = public as $$
  select d.id, c.title, c.slug, d.gross_amount, d.currency, d.created_at
  from public.donations d
  join public.campaigns c on c.id = d.campaign_id
  where c.organization_id = target_org
    and d.donor_id = target_donor
    and d.status = 'succeeded'
    and public.has_permission(target_org, 'finance.manage')
  order by d.created_at desc
$$;
revoke all on function public.donor_history_in_organization(uuid, uuid) from public;
grant execute on function public.donor_history_in_organization(uuid, uuid) to public;

-- Every campaign an organization has published, for the donor-list campaign filter dropdown.
create function public.organization_campaign_options(target_org uuid) returns table (id uuid, title text)
language sql stable security definer set search_path = public as $$
  select c.id, c.title from public.campaigns c
  where c.organization_id = target_org and public.has_permission(target_org, 'finance.manage')
  order by c.created_at desc
$$;
revoke all on function public.organization_campaign_options(uuid) from public;
grant execute on function public.organization_campaign_options(uuid) to public;
