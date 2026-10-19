-- The `bots` table — corrected against the real original.
--
-- This table has no tracked migration anywhere in this project; every other
-- table has a schema-*.sql file, but `bots` was apparently created directly
-- in the Supabase Table Editor at some point, so there was no record of its
-- exact original definition in this repo. The base table below has now
-- been checked directly against Supabase's own SQL Editor history and
-- matches it exactly — this is no longer a guess. Everything added after
-- the original create (quick_prompts, widget_color, avatar_config,
-- widget_position, widget_offset_x/y, etc.) is already tracked in its own
-- schema-chatbot-v2.sql through v8.sql files and isn't repeated here.
--
-- GRANTS (the part that matters even though the create table below is a
-- no-op against your existing table): required from Oct 30, 2026, and
-- these run independently of whether the create table did anything.
--
-- RLS: enabling it and its 4 policies is handled by schema-bots-rls.sql,
-- not here — run that file too (it's idempotent, safe to run alongside
-- or after this one in either order).

create table if not exists bots (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  persona text not null default 'You are a helpful, friendly assistant.',
  website_url text,
  site_content text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists bots_user_id_idx on bots (user_id);

-- Explicit Data API grants for bots (required from Oct 30, 2026 — see the
-- note at the top of this file for why this part matters regardless of
-- whether the create table above actually did anything).
grant select, insert, update, delete on public.bots to anon;
grant select, insert, update, delete on public.bots to authenticated;
grant select, insert, update, delete on public.bots to service_role;
