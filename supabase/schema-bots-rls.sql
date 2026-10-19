-- IMPORTANT — gap fix, run this in the Supabase SQL editor.
--
-- The `bots` table is referenced everywhere in the chatbot builder
-- (src/app/api/bots/**, src/app/tools/chatbot/**) and other schema files
-- assume it already exists ("Depends on the existing `bots` table" in
-- schema-chatbot.sql), but no migration file in this repo ever creates it
-- or turns RLS on for it — it was set up by hand directly in the Supabase
-- dashboard at some point before these tracked migrations existed.
--
-- That means the Security page's claim that "every database table
-- SiteFlow uses has Row Level Security (RLS) enabled" could NOT be
-- verified from the codebase for this table specifically. Run this once
-- to make sure it's actually true in production. It's safe to re-run:
-- `enable row level security` is idempotent, and each policy is dropped
-- and recreated so this won't error if some of it is already in place.

alter table bots enable row level security;

drop policy if exists "select own bots" on bots;
drop policy if exists "insert own bots" on bots;
drop policy if exists "update own bots" on bots;
drop policy if exists "delete own bots" on bots;

-- Bot owners can read/write their own bots. Public-facing surfaces
-- (embed widget, chatbot preview) read bot config through the server-side
-- service-role client, which bypasses RLS by design, so no anonymous
-- "select" policy is added here.
create policy "select own bots" on bots
  for select using (auth.uid() = user_id);

create policy "insert own bots" on bots
  for insert with check (auth.uid() = user_id);

create policy "update own bots" on bots
  for update using (auth.uid() = user_id);

create policy "delete own bots" on bots
  for delete using (auth.uid() = user_id);

-- After running this, verify in the Supabase dashboard:
-- Table Editor -> bots -> RLS should show "Enabled" with 4 policies.
