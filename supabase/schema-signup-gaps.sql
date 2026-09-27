-- Two production changes that were run directly in the SQL Editor at some
-- point but never saved as a tracked file anywhere in this repo. Without
-- this file, a fresh environment (or anyone reading the codebase to
-- understand the schema) would be missing both of these — and the app
-- actually depends on both already being true in production.

-- ------------------------------------------------------------------
-- 1. subscriptions.unlocked_tools
--
-- src/lib/usage.ts selects "status, unlocked_tools" from subscriptions on
-- every trial-limit check, and schema-api-access.sql's own comment already
-- refers to this column as "the existing dashboard unlocked_tools column"
-- — but no file ever created it. It was added by hand.
alter table subscriptions add column if not exists unlocked_tools text[] not null default '{}';

-- ------------------------------------------------------------------
-- 2. profiles.username / profiles.full_name + the signup trigger storing them
--
-- src/app/register/page.tsx sends { username, full_name } as signup
-- metadata (supabase.auth.signUp({ options: { data: { username,
-- full_name } } })), and depends on handle_new_user() copying that
-- metadata into the new profiles row. schema-profile-fields.sql adds the
-- username/full_name COLUMNS, but the trigger function itself was updated
-- by hand, separately, to actually populate them — schema.sql's original
-- handle_new_user() only ever inserted (id, email). This re-defines the
-- function to match what's actually running in production. Safe to
-- re-run: create or replace, and the trigger itself doesn't need
-- recreating since only the function body changed.
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, username, full_name)
    values (
      new.id,
      new.email,
      new.raw_user_meta_data->>'username',
      new.raw_user_meta_data->>'full_name'
    );
  insert into public.subscriptions (user_id, tier, status, trial_ends_at)
    values (new.id, 'free', 'trialing', now() + interval '7 days');
  return new;
end;
$$ language plpgsql security definer;
