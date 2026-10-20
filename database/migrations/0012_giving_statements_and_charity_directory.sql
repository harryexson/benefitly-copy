-- Donor giving statements (annual or on-demand, for tax/record purposes) and a curated
-- directory of reputable external charities donors can plan their giving around.
--
-- The directory is informational, not a payable destination: Benefitly has no payment
-- relationship with World Vision, Save the Children, etc. -- listing them as a real internal
-- `organizations` row (a payable Stripe Connect destination) would misrepresent an affiliation
-- that does not exist. `charity_directory` instead holds name/mission/category/an outbound link
-- to the charity's own site, the same shape a curated bookmark list would take. A donor's
-- giving_plans row can point at one of these (charity_directory_id) purely to track intent --
-- "I plan to give $50/month to Feed the Hungry" -- exactly like the existing free-text
-- `category` targeting already does, with no money moving through Benefitly for it.

create table public.charity_directory (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text not null,
  mission text not null,
  website_url text not null,
  logo_url text,
  ein text,
  sort_order integer not null default 0,
  active boolean not null default true
);

alter table public.charity_directory enable row level security;
create policy charity_directory_public_read on public.charity_directory for select using (active);
grant select on public.charity_directory to benefitly_app;

insert into public.charity_directory (name, category, mission, website_url, ein, sort_order) values
  ('World Vision', 'international-relief', 'Christian humanitarian organization dedicated to working with children, families and communities to overcome poverty and injustice.', 'https://www.worldvision.org', '95-1922279', 1),
  ('Samaritan''s Purse', 'disaster-relief', 'Provides spiritual and physical aid to hurting people around the world, including emergency relief for victims of war, poverty, natural disasters and disease.', 'https://www.samaritanspurse.org', '58-1437002', 2),
  ('Feeding America', 'hunger-relief', 'The largest hunger-relief organization in the United States, connecting people with food and supporting local food banks nationwide.', 'https://www.feedingamerica.org', '36-3673599', 3),
  ('Oxfam America', 'poverty-alleviation', 'Works to end the injustice of poverty by helping people build better lives and holding institutions accountable.', 'https://www.oxfamamerica.org', '23-7069110', 4),
  ('Save the Children', 'child-welfare', 'Gives children in the U.S. and around the world a healthy start, the opportunity to learn, and protection from harm.', 'https://www.savethechildren.org', '06-0726487', 5),
  ('Mercy Ships', 'medical-aid', 'Deploys hospital ships to deliver free, safe surgical and medical care to some of the world''s poorest nations.', 'https://www.mercyships.org', '58-1461656', 6),
  ('St. Jude Children''s Research Hospital', 'medical-research', 'Leading the way the world understands, treats and defeats childhood cancer and other life-threatening diseases -- families never receive a bill.', 'https://www.stjude.org', '62-0646012', 7),
  ('Doctors Without Borders / MSF', 'medical-aid', 'Provides emergency medical care to people affected by conflict, epidemics, disasters, or exclusion from healthcare, regardless of politics.', 'https://www.doctorswithoutborders.org', '13-3433452', 8),
  ('Habitat for Humanity', 'housing', 'Builds and repairs homes in partnership with families in need of decent, affordable housing.', 'https://www.habitat.org', '91-1914868', 9),
  ('American Red Cross', 'disaster-relief', 'Provides emergency assistance, disaster relief and disaster preparedness education in the United States.', 'https://www.redcross.org', '53-0196605', 10);

-- giving_plans (0011) can now optionally point at a directory entry instead of only a campaign
-- or a free-text category, so a donor can plan giving toward a specific named external charity.
alter table public.giving_plans add column charity_directory_id uuid references public.charity_directory(id);
alter table public.giving_plans drop constraint giving_plans_check;
alter table public.giving_plans add constraint giving_plans_target_check check (
  (campaign_id is not null)::integer + (category is not null)::integer + (charity_directory_id is not null)::integer = 1
);

create or replace function public.create_giving_plan(
  target_campaign uuid, target_category text, plan_amount_cents integer, plan_currency char(3),
  plan_cadence public.giving_plan_cadence, plan_annual_goal_cents integer, target_charity uuid default null
) returns public.giving_plans language plpgsql security definer set search_path = public as $$
declare inserted public.giving_plans;
begin
  insert into public.giving_plans (donor_id, campaign_id, category, charity_directory_id, amount_cents, currency, cadence, annual_goal_cents, next_reminder_at)
  values (
    public.current_user_id(), target_campaign, target_category, target_charity, plan_amount_cents, plan_currency, plan_cadence, plan_annual_goal_cents,
    now() + case plan_cadence
      when 'weekly' then interval '7 days'
      when 'monthly' then interval '1 month'
      when 'quarterly' then interval '3 months'
      else interval '1 year'
    end
  )
  returning * into inserted;
  return inserted;
end;
$$;
revoke all on function public.create_giving_plan(uuid, text, integer, char(3), public.giving_plan_cadence, integer, uuid) from public;
grant execute on function public.create_giving_plan(uuid, text, integer, char(3), public.giving_plan_cadence, integer, uuid) to public;
-- The old 6-arg overload (0011) is superseded; drop it so callers can't silently create a plan
-- that bypasses the 3-way target check above.
drop function public.create_giving_plan(uuid, text, integer, char(3), public.giving_plan_cadence, integer);

-- Donor giving statement: every succeeded donation in a year (or all-time when target_year is
-- null), for the signed-in donor only, plus the same organizer-name resolution listPublishedCampaigns
-- already uses. This is the record a donor needs at tax time or on demand.
create function public.my_giving_statement(target_year integer default null)
returns table (
  donation_id uuid, campaign_title text, campaign_slug text, organizer text,
  gross_amount integer, currency char(3), donated_at timestamptz
) language sql stable security definer set search_path = public as $$
  select d.id, c.title, c.slug, coalesce(o.name, p.name, 'Benefitly organizer'), d.gross_amount, d.currency, d.created_at
  from public.donations d
  join public.campaigns c on c.id = d.campaign_id
  left join public.organizations o on o.id = c.organization_id
  left join public.profiles p on p.id = c.owner_id
  where d.donor_id = public.current_user_id()
    and d.status = 'succeeded'
    and (target_year is null or extract(year from d.created_at) = target_year)
  order by d.created_at desc
$$;
revoke all on function public.my_giving_statement(integer) from public;
grant execute on function public.my_giving_statement(integer) to public;

-- Which years a donor actually has succeeded donations in, so the statement page can offer a
-- real year picker instead of guessing a range.
create function public.my_giving_years() returns setof integer
language sql stable security definer set search_path = public as $$
  select distinct extract(year from created_at)::integer from public.donations
  where donor_id = public.current_user_id() and status = 'succeeded'
  order by 1 desc
$$;
revoke all on function public.my_giving_years() from public;
grant execute on function public.my_giving_years() to public;
