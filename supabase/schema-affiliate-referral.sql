-- Affiliate attribution: which affiliate (by slug, from the private
-- siteflow-affiliates site) gets credit for referring this user, captured
-- at signup time from the sf_ref cookie set by middleware.ts. Run this once
-- in the SiteFlow Supabase project's SQL editor.

alter table public.profiles
  add column if not exists referred_by_slug text;

grant select, insert, update, delete on public.profiles to anon;
grant select, insert, update, delete on public.profiles to authenticated;
grant select, insert, update, delete on public.profiles to service_role;

-- Re-define the signup trigger to also copy referred_by_slug across from
-- auth.users.raw_user_meta_data (set via supabase.auth.signUp({ options:
-- { data: { referred_by_slug } } }) in src/app/register/page.tsx).
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, username, full_name, referred_by_slug)
    values (
      new.id,
      new.email,
      new.raw_user_meta_data->>'username',
      new.raw_user_meta_data->>'full_name',
      new.raw_user_meta_data->>'referred_by_slug'
    );
  insert into public.subscriptions (user_id, tier, status, trial_ends_at)
    values (new.id, 'free', 'trialing', now() + interval '7 days');
  return new;
end;
$$ language plpgsql security definer;
