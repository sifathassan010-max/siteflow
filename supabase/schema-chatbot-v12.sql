-- Stage 4 (referral tier + affiliate commission on the amount actually paid).
-- Run ONCE in Supabase SQL Editor BEFORE deploying the new code. Safe to re-run.
--
-- 1) subscriptions: remember what the customer actually pays (cents, USD),
--    where that number came from, and which Patreon tier title they are on.
--    The affiliate export endpoint reads these so the affiliate site can
--    compute 30% of the real price every month.
-- 2) referral_tier_flags: a review list for YOU. A row is added when someone
--    is on the referral tier but no valid affiliate was matched (access is
--    still unlocked — a paying customer is never locked out).

alter table public.subscriptions add column if not exists paid_amount_cents integer
  check (paid_amount_cents is null or (paid_amount_cents >= 0 and paid_amount_cents <= 1000000));
alter table public.subscriptions add column if not exists paid_amount_source text
  check (paid_amount_source is null or paid_amount_source in ('payload', 'config', 'default', 'simulate'));
alter table public.subscriptions add column if not exists tier_title text
  check (tier_title is null or char_length(tier_title) <= 200);

create table if not exists public.referral_tier_flags (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  email text not null,
  tier_title text not null default '',
  reason text not null check (reason in ('no_referrer', 'affiliate_not_matched')),
  paid_amount_cents integer,
  resolved boolean not null default false,
  created_at timestamptz not null default now(),
  unique (user_id, reason)
);

create index if not exists referral_tier_flags_open_idx
  on public.referral_tier_flags (created_at desc) where resolved = false;

-- Service role only (webhook + you via Table Editor). Customers must never
-- be able to read or write this table, so no grants for anon/authenticated
-- and RLS on with no policies.
revoke all on public.referral_tier_flags from anon, authenticated;
grant select, insert, update, delete on public.referral_tier_flags to service_role;
alter table public.referral_tier_flags enable row level security;
