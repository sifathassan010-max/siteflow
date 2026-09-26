-- Profile tool: run once in Supabase SQL Editor.
-- Safe to re-run: every statement is guarded (if not exists / drop-then-create).

-- username + full_name likely already exist from an earlier ad hoc migration
-- (the signup flow relies on them) — these are here so this file is a
-- complete, self-contained record of the current schema either way.
alter table profiles add column if not exists username text unique;
alter table profiles add column if not exists full_name text;

alter table profiles add column if not exists company_name text;
alter table profiles add column if not exists website_url text;
alter table profiles add column if not exists country text;

create index if not exists profiles_username_idx on profiles (username);

-- IMPORTANT: profiles previously had a SELECT policy but no UPDATE policy,
-- meaning no user could ever save profile changes — this adds it.
drop policy if exists "update own profile" on profiles;
create policy "update own profile" on profiles
  for update using (auth.uid() = id)
  with check (auth.uid() = id);
