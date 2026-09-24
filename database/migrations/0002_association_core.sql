-- Core association, campaign-management and operational records.
-- All organization-scoped tables are protected by `is_org_member` from 0001.

create type public.member_status as enum ('pending', 'active', 'suspended', 'archived');
create type public.claim_status as enum ('submitted', 'under_review', 'approved', 'denied', 'paid', 'canceled');
create type public.payout_status as enum ('pending', 'verification_required', 'approved', 'processing', 'paid', 'failed', 'reversed', 'canceled');
create type public.event_registration_status as enum ('registered', 'waitlisted', 'checked_in', 'canceled');

create table public.members (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id), user_id uuid references public.profiles(id), member_number text not null, status public.member_status not null default 'pending', membership_level text, joined_at timestamptz, contact jsonb not null default '{}'::jsonb, notes text, unique (organization_id, member_number)
);
create index members_organization_status_idx on public.members (organization_id, status);

create table public.membership_types (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id), name text not null, dues_amount integer check (dues_amount >= 0), currency char(3) not null default 'USD', interval text not null default 'monthly', unique (organization_id, name)
);
create table public.member_activity (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id), member_id uuid not null references public.members(id), actor_id uuid references public.profiles(id), type text not null, metadata jsonb not null default '{}'::jsonb, created_at timestamptz not null default now()
);

create table public.contribution_types (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id), name text not null, kind text not null check (kind in ('dues', 'one_time', 'assessment', 'event', 'fundraiser')), unique (organization_id, name)
);
create table public.member_contributions (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id), member_id uuid not null references public.members(id), contribution_type_id uuid references public.contribution_types(id), amount integer not null check (amount > 0), currency char(3) not null default 'USD', status text not null check (status in ('pending', 'paid', 'failed', 'refunded')), payment_reference text, paid_at timestamptz, created_at timestamptz not null default now()
);
create index member_contributions_org_created_idx on public.member_contributions (organization_id, created_at desc);

create table public.benefit_programs (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id), name text not null, description text not null, eligibility text, maximum_amount integer check (maximum_amount >= 0), waiting_period_days integer not null default 0 check (waiting_period_days >= 0), required_documents jsonb not null default '[]'::jsonb, approval_policy jsonb not null default '{}'::jsonb, funding_source text, active boolean not null default true, created_at timestamptz not null default now()
);
create table public.benefit_claims (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id), program_id uuid not null references public.benefit_programs(id), member_id uuid not null references public.members(id), requested_amount integer not null check (requested_amount > 0), status public.claim_status not null default 'submitted', reason text not null, created_at timestamptz not null default now(), reviewed_at timestamptz
);
create table public.claim_approvals (
  id uuid primary key default gen_random_uuid(), claim_id uuid not null references public.benefit_claims(id), reviewer_id uuid not null references public.profiles(id), decision text not null check (decision in ('approved', 'denied')), note text, created_at timestamptz not null default now()
);

create table public.events (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id), title text not null, description text, starts_at timestamptz not null, ends_at timestamptz, location text, capacity integer check (capacity > 0), visibility text not null default 'members' check (visibility in ('public', 'members')), created_at timestamptz not null default now()
);
create table public.event_registrations (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id), event_id uuid not null references public.events(id), member_id uuid references public.members(id), status public.event_registration_status not null default 'registered', checked_in_at timestamptz, unique (event_id, member_id)
);

create table public.campaign_updates (id uuid primary key default gen_random_uuid(), campaign_id uuid not null references public.campaigns(id), author_id uuid not null references public.profiles(id), body text not null, created_at timestamptz not null default now());
create table public.campaign_beneficiaries (id uuid primary key default gen_random_uuid(), campaign_id uuid not null references public.campaigns(id), profile_id uuid references public.profiles(id), name text not null, relationship text, verified_at timestamptz);
create table public.campaign_media (id uuid primary key default gen_random_uuid(), campaign_id uuid not null references public.campaigns(id), storage_key text not null, alt_text text, position integer not null default 0, created_at timestamptz not null default now());

create table public.payment_accounts (id uuid primary key default gen_random_uuid(), organization_id uuid references public.organizations(id), owner_id uuid references public.profiles(id), provider text not null, provider_account_id text not null, status text not null default 'pending', unique (provider, provider_account_id));
create table public.payouts (id uuid primary key default gen_random_uuid(), organization_id uuid references public.organizations(id), campaign_id uuid references public.campaigns(id), payment_account_id uuid not null references public.payment_accounts(id), amount integer not null check (amount > 0), currency char(3) not null, status public.payout_status not null default 'pending', provider_payout_id text unique, requested_by uuid not null references public.profiles(id), approved_by uuid references public.profiles(id), idempotency_key uuid not null unique, created_at timestamptz not null default now(), updated_at timestamptz not null default now());

create table public.announcements (id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id), author_id uuid not null references public.profiles(id), title text not null, body text not null, published_at timestamptz, created_at timestamptz not null default now());
create table public.notifications (id uuid primary key default gen_random_uuid(), profile_id uuid not null references public.profiles(id), organization_id uuid references public.organizations(id), type text not null, payload jsonb not null default '{}'::jsonb, read_at timestamptz, created_at timestamptz not null default now());
create table public.support_tickets (id uuid primary key default gen_random_uuid(), profile_id uuid not null references public.profiles(id), organization_id uuid references public.organizations(id), subject text not null, body text not null, status text not null default 'open', created_at timestamptz not null default now());

alter table public.members enable row level security;
alter table public.membership_types enable row level security;
alter table public.member_activity enable row level security;
alter table public.contribution_types enable row level security;
alter table public.member_contributions enable row level security;
alter table public.benefit_programs enable row level security;
alter table public.benefit_claims enable row level security;
alter table public.events enable row level security;
alter table public.event_registrations enable row level security;
alter table public.campaign_updates enable row level security;
alter table public.campaign_beneficiaries enable row level security;
alter table public.campaign_media enable row level security;
alter table public.payment_accounts enable row level security;
alter table public.payouts enable row level security;
alter table public.announcements enable row level security;
alter table public.notifications enable row level security;
alter table public.support_tickets enable row level security;

create policy members_tenant_read on public.members for select using (public.is_org_member(organization_id));
create policy contributions_tenant_read on public.member_contributions for select using (public.is_org_member(organization_id));
create policy programs_tenant_read on public.benefit_programs for select using (public.is_org_member(organization_id));
create policy claims_tenant_read on public.benefit_claims for select using (public.is_org_member(organization_id));
create policy events_tenant_read on public.events for select using (visibility = 'public' or public.is_org_member(organization_id));
create policy event_registrations_tenant_read on public.event_registrations for select using (public.is_org_member(organization_id));
create policy payouts_tenant_read on public.payouts for select using (organization_id is not null and public.is_org_member(organization_id));
create policy announcements_tenant_read on public.announcements for select using (public.is_org_member(organization_id));
create policy notifications_self_read on public.notifications for select using (profile_id = public.current_user_id());
create policy support_tickets_self_read on public.support_tickets for select using (profile_id = public.current_user_id() or (organization_id is not null and public.is_org_member(organization_id)));
