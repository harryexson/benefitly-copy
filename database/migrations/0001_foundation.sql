create extension if not exists pgcrypto;

create type public.organization_member_status as enum ('invited', 'active', 'suspended', 'archived');
create type public.campaign_status as enum ('draft', 'review', 'published', 'paused', 'completed');
create type public.donation_status as enum ('pending', 'succeeded', 'failed', 'refunded', 'disputed');

create table public.profiles (id uuid primary key, email text unique not null, name text not null, image_url text, created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create table public.organizations (id uuid primary key default gen_random_uuid(), slug text unique not null, name text not null, created_by uuid not null references public.profiles(id), created_at timestamptz not null default now());
create table public.organization_members (organization_id uuid not null references public.organizations(id), user_id uuid not null references public.profiles(id), status public.organization_member_status not null default 'invited', permissions text[] not null default '{}', joined_at timestamptz, primary key (organization_id, user_id));
create table public.campaigns (id uuid primary key default gen_random_uuid(), slug text unique not null, organization_id uuid references public.organizations(id), owner_id uuid not null references public.profiles(id), title text not null check (char_length(title) between 5 and 160), story text not null, category text not null, location text, currency char(3) not null default 'USD', goal_amount integer not null check (goal_amount > 0), raised_amount integer not null default 0 check (raised_amount >= 0), supporter_count integer not null default 0 check (supporter_count >= 0), status public.campaign_status not null default 'draft', published_at timestamptz, created_at timestamptz not null default now());
create index campaigns_public_idx on public.campaigns (status, published_at desc) where status = 'published';
create index campaigns_organization_idx on public.campaigns (organization_id, created_at desc);
create table public.donations (id uuid primary key default gen_random_uuid(), campaign_id uuid not null references public.campaigns(id), donor_id uuid references public.profiles(id), gross_amount integer not null check (gross_amount > 0), platform_contribution integer not null default 0 check (platform_contribution >= 0), processor_fee integer not null default 0 check (processor_fee >= 0), net_campaign_amount integer not null check (net_campaign_amount >= 0), currency char(3) not null, status public.donation_status not null default 'pending', idempotency_key uuid not null unique, provider_payment_id text unique, created_at timestamptz not null default now());
create table public.ledger_entries (id uuid primary key default gen_random_uuid(), organization_id uuid references public.organizations(id), campaign_id uuid references public.campaigns(id), donation_id uuid references public.donations(id), event_type text not null, amount integer not null, currency char(3) not null, occurred_at timestamptz not null default now(), metadata jsonb not null default '{}'::jsonb);
create table public.audit_logs (id uuid primary key default gen_random_uuid(), organization_id uuid references public.organizations(id), actor_id uuid references public.profiles(id), action text not null, resource_type text not null, resource_id uuid, metadata jsonb not null default '{}'::jsonb, created_at timestamptz not null default now());

alter table public.organizations enable row level security;
alter table public.organization_members enable row level security;
alter table public.campaigns enable row level security;
alter table public.donations enable row level security;
alter table public.ledger_entries enable row level security;
alter table public.audit_logs enable row level security;

-- The API must issue `set_config('app.user_id', verified_session_user_id, true)` per transaction.
create function public.current_user_id() returns uuid language sql stable as $$ select nullif(current_setting('app.user_id', true), '')::uuid $$;
create function public.is_org_member(target_org uuid) returns boolean language sql stable as $$ select exists (select 1 from public.organization_members where organization_id = target_org and user_id = public.current_user_id() and status = 'active') $$;
create policy organization_members_select on public.organization_members for select using (user_id = public.current_user_id() or public.is_org_member(organization_id));
create policy organizations_select on public.organizations for select using (public.is_org_member(id) or created_by = public.current_user_id());
create policy campaigns_public_read on public.campaigns for select using (status = 'published' or owner_id = public.current_user_id() or (organization_id is not null and public.is_org_member(organization_id)));
create policy donations_tenant_read on public.donations for select using (exists (select 1 from public.campaigns c where c.id = campaign_id and (c.owner_id = public.current_user_id() or (c.organization_id is not null and public.is_org_member(c.organization_id)))));
create policy ledger_tenant_read on public.ledger_entries for select using (organization_id is not null and public.is_org_member(organization_id));
create policy audit_tenant_read on public.audit_logs for select using (organization_id is not null and public.is_org_member(organization_id));

revoke insert, update, delete on public.donations, public.ledger_entries, public.audit_logs from public;
