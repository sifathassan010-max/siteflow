-- Customer feedback → testimonial → admin approval → public review system.
-- Run once in Supabase SQL Editor. Safe to re-run.
--
-- MODEL: one table, two concepts, kept strictly separate by `status`:
--   - PRIVATE FEEDBACK: the user did not agree to publication (or agreed
--     but didn't check the consent box). status = 'private' forever. Never
--     selectable by anyone except the user who wrote it and the service
--     role (admin API routes). No public policy ever matches this status.
--   - PUBLIC TESTIMONIAL PIPELINE: the user explicitly opted in AND
--     checked the consent checkbox. Starts at status = 'pending' and can
--     only move to 'approved' or 'rejected' via an admin-only API route
--     (src/app/api/admin/testimonials/[id]/route.ts), which uses the
--     service-role client and re-checks profiles.is_admin server-side —
--     it will refuse to touch a 'private' row, so a testimonial can never
--     become public by accident.
--
-- Nothing here lets a normal user UPDATE or DELETE a row (no such RLS
-- policy exists) — submissions are write-once from the dashboard. Only the
-- service role (used exclusively by the admin-only API routes, which
-- re-verify is_admin on every request) can approve/reject/delete.
create table if not exists testimonials (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,

  rating smallint not null check (rating between 1 and 5),
  liked text not null,               -- "What do you like about SiteFlow?"
  improve text not null,             -- "What could we improve?"
  additional_comments text,          -- optional "anything else"

  allow_publish boolean not null default false,
  consent_given boolean not null default false,

  -- Only ever populated when allow_publish = true. Left null for private
  -- feedback so no more personal info is stored than the user intended.
  display_name text,
  company_name text,
  website_url text,
  role text,
  photo_url text,

  status text not null default 'private'
    check (status in ('private', 'pending', 'approved', 'rejected')),

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid references auth.users(id)
);

create index if not exists testimonials_user_id_idx on testimonials (user_id);
create index if not exists testimonials_status_idx on testimonials (status, created_at desc);
-- Speeds up the public /reviews + homepage queries specifically.
create index if not exists testimonials_public_idx on testimonials (created_at desc)
  where status = 'approved' and allow_publish = true and consent_given = true;

alter table testimonials enable row level security;

-- A logged-in user can submit feedback, only as themselves.
drop policy if exists "insert own testimonial" on testimonials;
create policy "insert own testimonial" on testimonials
  for insert with check (auth.uid() = user_id);

-- A user can read back their own submissions (private or public-track).
drop policy if exists "select own testimonial" on testimonials;
create policy "select own testimonial" on testimonials
  for select using (auth.uid() = user_id);

-- Anyone (including logged-out visitors) can read testimonials that are
-- fully approved AND explicitly authorized for publication. This is the
-- ONLY way a testimonial is ever publicly visible — 'pending', 'rejected',
-- and 'private' rows never match this policy, so they're invisible to
-- everyone except their author and the service role.
drop policy if exists "public read approved testimonials" on testimonials;
create policy "public read approved testimonials" on testimonials
  for select using (status = 'approved' and allow_publish = true and consent_given = true);

-- Intentionally NO update/delete policy for regular users — submissions
-- are write-once from the dashboard, and approve/reject/delete only ever
-- happens through the service-role admin API routes.

-- ---------------------------------------------------------------------
-- ADMIN FLAG
-- ---------------------------------------------------------------------
-- SiteFlow had no admin/staff concept before this feature. This is the
-- new source of truth for "can approve/reject/delete testimonials" (see
-- src/lib/admin.ts). It defaults to false for everyone, including
-- existing accounts — nobody is an admin until you run the statement
-- below for your own account.
alter table profiles add column if not exists is_admin boolean not null default false;

-- MANUAL STEP (you must run this yourself): grant yourself admin access.
-- Uncomment and fill in your own user id (Authentication → Users in the
-- Supabase dashboard, same place you found it for the paid-tier upgrade).
--
-- update profiles set is_admin = true where id = 'YOUR-USER-UUID-HERE';
