-- SiteFlow core schema: profiles, subscriptions, usage tracking
-- Run this once in Supabase SQL Editor after project creation.

-- Extra profile fields beyond what auth.users already stores
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  created_at timestamptz not null default now()
);

-- Explicit Data API grants for profiles (required from Oct 30, 2026 —
-- Supabase stops auto-granting these for newly created tables; RLS
-- policies elsewhere in this file still govern actual row access, this just lets the
-- Data API reach the table at all).
grant select, insert, update, delete on public.profiles to anon;
grant select, insert, update, delete on public.profiles to authenticated;
grant select, insert, update, delete on public.profiles to service_role;

-- Which plan/tier a user is on, synced from Patreon webhooks later
create table if not exists subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  patreon_id text,
  tier text not null default 'free',           -- 'free' | 'chatbot' | 'seo' | 'forms' | 'analytics' | 'bundle'
  status text not null default 'trialing',      -- 'trialing' | 'active' | 'canceled' | 'past_due'
  trial_ends_at timestamptz,
  current_period_end timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id)
);

-- Explicit Data API grants for subscriptions (required from Oct 30, 2026 —
-- Supabase stops auto-granting these for newly created tables; RLS
-- policies elsewhere in this file still govern actual row access, this just lets the
-- Data API reach the table at all).
grant select, insert, update, delete on public.subscriptions to anon;
grant select, insert, update, delete on public.subscriptions to authenticated;
grant select, insert, update, delete on public.subscriptions to service_role;

-- Per-tool usage counters, checked server-side to enforce trial/free limits
create table if not exists usage_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  tool text not null,           -- 'chatbot' | 'seo' | 'forms' | 'analytics' | 'free_tool_x'
  event_type text not null,     -- e.g. 'message_sent', 'page_crawled', 'form_submission'
  quantity int not null default 1,
  created_at timestamptz not null default now()
);

-- Explicit Data API grants for usage_events (required from Oct 30, 2026 —
-- Supabase stops auto-granting these for newly created tables; RLS
-- policies elsewhere in this file still govern actual row access, this just lets the
-- Data API reach the table at all).
grant select, insert, update, delete on public.usage_events to anon;
grant select, insert, update, delete on public.usage_events to authenticated;
grant select, insert, update, delete on public.usage_events to service_role;

create index if not exists usage_events_user_tool_idx on usage_events (user_id, tool, created_at);

-- Row Level Security: users can only ever see/touch their own rows
alter table profiles enable row level security;
alter table subscriptions enable row level security;
alter table usage_events enable row level security;

create policy "own profile" on profiles
  for select using (auth.uid() = id);

create policy "own subscription" on subscriptions
  for select using (auth.uid() = user_id);

create policy "own usage" on usage_events
  for select using (auth.uid() = user_id);

-- Auto-create a profile + free trial subscription row when someone signs up
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email) values (new.id, new.email);
  insert into public.subscriptions (user_id, tier, status, trial_ends_at)
    values (new.id, 'free', 'trialing', now() + interval '7 days');
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
