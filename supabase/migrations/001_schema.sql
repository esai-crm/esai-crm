-- ============================================
-- ESAI CRM - Full Database Schema
-- Run this in Supabase SQL Editor
-- ============================================

-- Enable extensions
create extension if not exists "uuid-ossp";
create extension if not exists "pg_cron";

-- ─── PROFILES ────────────────────────────────────────────
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  email text unique not null,
  full_name text,
  avatar_url text,
  role text default 'user' check (role in ('user', 'admin', 'superadmin')),
  plan text default 'trial' check (plan in ('trial', 'starter', 'pro', 'team')),
  plan_expires_at timestamptz default (now() + interval '14 days'),
  stripe_customer_id text unique,
  stripe_subscription_id text unique,
  language text default 'en' check (language in ('en', 'ru')),
  timezone text default 'UTC',
  onboarded boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.profiles enable row level security;

create policy "Users can view own profile"
  on public.profiles for select using (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update using (auth.uid() = id);

create policy "Admins can view all profiles"
  on public.profiles for select using (
    exists (select 1 from public.profiles where id = auth.uid() and role in ('admin','superadmin'))
  );

create policy "Admins can update all profiles"
  on public.profiles for update using (
    exists (select 1 from public.profiles where id = auth.uid() and role in ('admin','superadmin'))
  );

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email,'@',1)),
    new.raw_user_meta_data->>'avatar_url'
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ─── CONTACTS ────────────────────────────────────────────
create table public.contacts (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  first_name text not null,
  last_name text,
  email text,
  phone text,
  source text check (source in ('manual','website','referral','zillow','realtor','other')),
  status text default 'new' check (status in ('new','active','negotiating','closed_won','closed_lost','nurture')),
  ai_score integer default 50 check (ai_score between 0 and 100),
  ai_label text default 'warm' check (ai_label in ('hot','warm','cold')),
  ai_score_updated_at timestamptz,
  budget_min integer,
  budget_max integer,
  property_type text check (property_type in ('buy','rent','sell','invest')),
  notes text,
  tags text[] default '{}',
  last_contacted_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.contacts enable row level security;

create policy "Users manage own contacts"
  on public.contacts for all using (auth.uid() = user_id);

create policy "Admins view all contacts"
  on public.contacts for select using (
    exists (select 1 from public.profiles where id = auth.uid() and role in ('admin','superadmin'))
  );

create index idx_contacts_user_id on public.contacts(user_id);
create index idx_contacts_ai_label on public.contacts(ai_label);
create index idx_contacts_status on public.contacts(status);

-- ─── DEALS (PIPELINE) ────────────────────────────────────
create table public.deals (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  contact_id uuid references public.contacts(id) on delete set null,
  title text not null,
  stage text default 'new_lead' check (stage in (
    'new_lead','contacted','showing','offer','negotiation','under_contract','closed_won','closed_lost'
  )),
  value integer,
  commission_pct decimal(5,2) default 3.0,
  property_address text,
  expected_close_date date,
  closed_at timestamptz,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.deals enable row level security;

create policy "Users manage own deals"
  on public.deals for all using (auth.uid() = user_id);

create index idx_deals_user_id on public.deals(user_id);
create index idx_deals_stage on public.deals(stage);

-- ─── ACTIVITIES ──────────────────────────────────────────
create table public.activities (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  contact_id uuid references public.contacts(id) on delete cascade,
  deal_id uuid references public.deals(id) on delete set null,
  type text not null check (type in ('call','email','meeting','note','showing','offer','follow_up')),
  subject text,
  body text,
  completed boolean default false,
  scheduled_at timestamptz,
  completed_at timestamptz,
  ai_generated boolean default false,
  created_at timestamptz default now()
);

alter table public.activities enable row level security;

create policy "Users manage own activities"
  on public.activities for all using (auth.uid() = user_id);

create index idx_activities_contact_id on public.activities(contact_id);
create index idx_activities_scheduled_at on public.activities(scheduled_at);

-- ─── AI INTERACTIONS LOG ──────────────────────────────────
create table public.ai_logs (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  type text not null check (type in ('score','email_draft','reminder','analysis')),
  input jsonb,
  output jsonb,
  tokens_used integer,
  created_at timestamptz default now()
);

alter table public.ai_logs enable row level security;

create policy "Users view own ai logs"
  on public.ai_logs for select using (auth.uid() = user_id);

create policy "Service can insert ai logs"
  on public.ai_logs for insert with check (auth.uid() = user_id);

-- ─── SUBSCRIPTIONS / BILLING ────────────────────────────
create table public.subscriptions (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade unique not null,
  stripe_subscription_id text unique,
  stripe_customer_id text,
  plan text not null check (plan in ('trial','starter','pro','team')),
  status text not null check (status in ('active','past_due','canceled','trialing','paused')),
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.subscriptions enable row level security;

create policy "Users view own subscription"
  on public.subscriptions for select using (auth.uid() = user_id);

create policy "Admins manage all subscriptions"
  on public.subscriptions for all using (
    exists (select 1 from public.profiles where id = auth.uid() and role in ('admin','superadmin'))
  );

-- ─── REMINDERS ───────────────────────────────────────────
create table public.reminders (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  contact_id uuid references public.contacts(id) on delete cascade,
  deal_id uuid references public.deals(id) on delete set null,
  title text not null,
  body text,
  remind_at timestamptz not null,
  sent boolean default false,
  ai_generated boolean default false,
  created_at timestamptz default now()
);

alter table public.reminders enable row level security;

create policy "Users manage own reminders"
  on public.reminders for all using (auth.uid() = user_id);

create index idx_reminders_remind_at on public.reminders(remind_at) where sent = false;

-- ─── UPDATED_AT TRIGGER ──────────────────────────────────
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

create trigger set_updated_at before update on public.profiles
  for each row execute procedure public.set_updated_at();
create trigger set_updated_at before update on public.contacts
  for each row execute procedure public.set_updated_at();
create trigger set_updated_at before update on public.deals
  for each row execute procedure public.set_updated_at();
create trigger set_updated_at before update on public.subscriptions
  for each row execute procedure public.set_updated_at();

-- ─── ADMIN STATS VIEW ─────────────────────────────────────
create or replace view public.admin_stats as
select
  (select count(*) from public.profiles) as total_users,
  (select count(*) from public.profiles where plan = 'trial') as trial_users,
  (select count(*) from public.profiles where plan = 'starter') as starter_users,
  (select count(*) from public.profiles where plan = 'pro') as pro_users,
  (select count(*) from public.profiles where plan = 'team') as team_users,
  (select count(*) from public.profiles where created_at > now() - interval '7 days') as new_users_7d,
  (select count(*) from public.contacts) as total_contacts,
  (select count(*) from public.deals where stage = 'closed_won') as total_closed_deals,
  (select coalesce(sum(value * commission_pct / 100), 0) from public.deals where stage = 'closed_won') as total_revenue_commissions;

-- Grant access to authenticated users for admin stats (admins only via RLS on profiles check in app)
grant select on public.admin_stats to authenticated;
