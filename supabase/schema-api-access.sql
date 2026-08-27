-- API access for AI agents / developers: run once in Supabase SQL Editor.
--
-- This is deliberately separate from the existing dashboard "unlocked_tools"
-- column. A customer can have dashboard access, API access, both, or
-- neither — they're sold and billed as different Patreon tiers (see
-- src/lib/patreon-config.ts), so they're tracked independently.

-- Which API tools a user's Patreon pledge unlocks, synced by the same
-- webhook that already updates `unlocked_tools`. Values: 'chatbot' | 'seo'
-- | 'forms' | 'analytics'. Buying "All Access API" just means all four
-- end up in this array, same pattern as the existing dashboard bundle.
alter table subscriptions add column if not exists api_unlocked_tools text[] not null default '{}';

-- One row per issued API key. The raw key is only ever shown once, at
-- creation time — only its SHA-256 hash is stored, so a database leak
-- doesn't leak usable keys.
create table if not exists api_keys (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  key_hash text not null unique,   -- sha256 hex digest of the raw key
  key_prefix text not null,        -- first ~12 chars of the raw key, safe to display, e.g. "sk_live_a1b2"
  name text not null default 'Default key',
  last_used_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists api_keys_user_id_idx on api_keys (user_id);
create index if not exists api_keys_key_hash_idx on api_keys (key_hash);

alter table api_keys enable row level security;

-- Users can see (but not read the raw secret of) their own keys, to show
-- "Default key — created Aug 24, last used 2 hours ago" in the dashboard.
-- Keys are created/verified server-side via the admin client, since a brand
-- new anonymous API request has no Supabase auth session.
create policy "select own api keys" on api_keys
  for select using (auth.uid() = user_id);

create policy "delete own api keys" on api_keys
  for delete using (auth.uid() = user_id);

-- Per-tool monthly API call counts reuse the existing usage_events table
-- (tool values 'api_chatbot' | 'api_seo' | 'api_forms' | 'api_analytics',
-- event_type 'api_call') rather than a new table, so the same index already
-- created in schema.sql (usage_events_user_tool_idx) covers this too.
-- Unlike the dashboard's lifetime trial cap, API quotas reset monthly —
-- see src/lib/api-usage.ts, which filters usage_events by calendar month.
