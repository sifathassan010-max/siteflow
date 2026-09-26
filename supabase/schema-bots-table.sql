-- The `bots` table — reconstructed, not original.
--
-- This table has no tracked migration anywhere in this project; every other
-- table has a schema-*.sql file, but `bots` was apparently created directly
-- in the Supabase Table Editor at some point, so there's no record of its
-- exact original definition. This file exists for two reasons:
--
-- 1. GRANTS (the important, guaranteed part). Right now, on your live
--    project, `bots` already exists and already has the Data API access it
--    got when it was created — Supabase's old auto-grant behavior. That
--    part isn't at risk. What IS at risk: from Oct 30, 2026 there is no
--    tracked file that would ever safely recreate this table's access if
--    something ever required rebuilding it (a new environment, a restore,
--    a migration tool). This file's `grant` statements run independently
--    of the `create table` above them — the `create table if not exists`
--    is a silent no-op against your existing table, but the grants still
--    execute and apply to the table as it already is. Run this once and
--    the live table has the same explicit, future-proof access as every
--    other table already got in this pass.
--
-- 2. CREATE TABLE (best-effort, not verified). The column list below was
--    reconstructed by reading every place the app code selects from,
--    inserts into, or updates this table (src/app/api/bots/route.ts,
--    src/app/api/bots/[id]/route.ts, src/app/embed/[id]/*, src/app/tools/
--    chatbot/**). It is very likely accurate for every column the app
--    actually uses, but it was never diffed against the real table in
--    your dashboard, so treat it as a safety net for a future rebuild,
--    not a guaranteed exact copy of what's live today. If you ever do
--    need to run this to recreate the table from scratch, double-check
--    column types/constraints against Supabase's Table Editor first.
--
-- Deliberately NOT included: `alter table bots enable row level security`.
-- The rest of this codebase never queries `bots` as the logged-in user's
-- own client relying on RLS to filter rows — every route does its own
-- `.eq("user_id", user.id)` filtering in application code, and the public
-- widget route (src/app/embed/[id]/widget.js/route.ts) reads this table
-- with the service-role admin client, which bypasses RLS entirely. Turning
-- on RLS here with no policies defined would default-deny everything,
-- including the app's own authenticated queries — so this file leaves
-- that setting exactly as it already is on your project.

create table if not exists bots (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  persona text not null default 'You are a helpful, friendly assistant for this business.',
  website_url text,
  site_content text,
  trained_pages jsonb not null default '[]'::jsonb,
  last_trained_at timestamptz,
  quick_prompts jsonb not null default '[]'::jsonb,
  widget_color text not null default '#4f46e5',
  logo_url text,
  escalation_contact text,
  model text,
  custom_queries jsonb not null default '[]'::jsonb,
  avatar_config jsonb not null default '{"mode":"single","avatars":[],"frequencySeconds":15}'::jsonb,
  widget_position text not null default 'bottom-right',
  widget_offset_x int not null default 24,
  widget_offset_y int not null default 24,
  created_at timestamptz not null default now()
);

-- Explicit Data API grants for bots (required from Oct 30, 2026 — see the
-- note at the top of this file for why this part matters regardless of
-- whether the create table above actually did anything).
grant select, insert, update, delete on public.bots to anon;
grant select, insert, update, delete on public.bots to authenticated;
grant select, insert, update, delete on public.bots to service_role;
