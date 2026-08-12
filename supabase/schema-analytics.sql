-- Analytics tool: run once in Supabase SQL Editor.

create table if not exists analytics_sites (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  domain text not null, -- for reference only; tracking isn't restricted to this domain
  created_at timestamptz not null default now()
);

create table if not exists analytics_events (
  id uuid primary key default gen_random_uuid(),
  site_id uuid not null references analytics_sites(id) on delete cascade,
  path text not null,
  referrer text,
  -- One-way daily hash of IP + user agent, used only to estimate unique
  -- visitors. Never stores the raw IP, and rotates every day so it can't be
  -- used to track someone across days.
  visitor_hash text,
  created_at timestamptz not null default now()
);

create index if not exists analytics_sites_user_id_idx on analytics_sites (user_id);
create index if not exists analytics_events_site_id_idx on analytics_events (site_id, created_at);

alter table analytics_sites enable row level security;
alter table analytics_events enable row level security;

create policy "select own analytics sites" on analytics_sites for select using (auth.uid() = user_id);
create policy "insert own analytics sites" on analytics_sites for insert with check (auth.uid() = user_id);
create policy "delete own analytics sites" on analytics_sites for delete using (auth.uid() = user_id);

-- No public policy on analytics_events on purpose — the tracking script
-- posts through /api/embed/analytics/[id]/track using the service-role
-- admin client (same pattern as forms/chatbot embeds).
create policy "select own analytics events" on analytics_events for select using (
  auth.uid() = (select user_id from analytics_sites where analytics_sites.id = site_id)
);
