-- Stage 3 (Shopify product catalog for chatbots).
-- Run ONCE in Supabase SQL Editor BEFORE deploying the new code. Safe to re-run.
--
-- 1) bots: product_count + shop_url (so the chat routes know cheaply whether
--    a bot has a catalog; no extra query for bots without one).
-- 2) bot_products: up to 2,000 products per bot (cap enforced by the app),
--    with a generated tsvector + GIN index for full-text search.
-- 3) bot_stores: one row per bot = where the catalog came from + sync status.
-- 4) finish_bot_products_sync() / clear_bot_products() / search_bot_products():
--    service-role-only functions.
--
-- Storage: ~1-1.5 KB per product incl. index => 2,000 products ~ 2-3 MB per
-- store. 100 stores with full catalogs ~ 250 MB (Supabase Free = 500 MB total).

alter table public.bots add column if not exists product_count integer not null default 0;
alter table public.bots add column if not exists shop_url text;

create table if not exists public.bot_products (
  id uuid primary key default gen_random_uuid(),
  bot_id uuid not null references public.bots(id) on delete cascade,
  external_id text not null check (char_length(external_id) <= 100),
  title text not null check (char_length(title) <= 500),
  handle text not null check (char_length(handle) <= 255),
  url text not null check (char_length(url) <= 1200),
  price numeric(12,2),
  price_max numeric(12,2),
  compare_at_price numeric(12,2),
  currency text check (currency is null or currency ~ '^[A-Z]{3}$'),
  available boolean not null default true,
  vendor text not null default '' check (char_length(vendor) <= 200),
  product_type text not null default '' check (char_length(product_type) <= 200),
  tags text not null default '' check (char_length(tags) <= 600),
  description text not null default '' check (char_length(description) <= 1000),
  image_url text check (image_url is null or char_length(image_url) <= 1200),
  variants jsonb not null default '[]'::jsonb,
  options jsonb not null default '[]'::jsonb,
  sync_id uuid,
  synced_at timestamptz not null default now(),
  tsv tsvector generated always as (
    setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(product_type, '') || ' ' || coalesce(vendor, '') || ' ' || coalesce(tags, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(description, '')), 'C')
  ) stored,
  unique (bot_id, external_id)
);

create index if not exists bot_products_bot_idx on public.bot_products (bot_id);
create index if not exists bot_products_tsv_idx on public.bot_products using gin (tsv);

create table if not exists public.bot_stores (
  bot_id uuid primary key references public.bots(id) on delete cascade,
  store_url text not null,
  currency text check (currency is null or currency ~ '^[A-Z]{3}$'),
  source text not null check (source in ('shopify', 'csv')),
  product_count integer not null default 0,
  total_found integer,
  capped boolean not null default false,
  last_synced_at timestamptz not null default now(),
  last_error text
);

-- RLS: owners may READ their own rows. All writes go through the service role
-- (server routes that check ownership first).
alter table public.bot_products enable row level security;
alter table public.bot_stores enable row level security;

drop policy if exists "Owners read own bot products" on public.bot_products;
create policy "Owners read own bot products" on public.bot_products
  for select to authenticated
  using (exists (
    select 1 from public.bots b
    where b.id = bot_products.bot_id and b.user_id = (select auth.uid())
  ));

drop policy if exists "Owners read own bot stores" on public.bot_stores;
create policy "Owners read own bot stores" on public.bot_stores
  for select to authenticated
  using (exists (
    select 1 from public.bots b
    where b.id = bot_stores.bot_id and b.user_id = (select auth.uid())
  ));

-- Explicit Data API grants (required for new tables, see supabase/schema.sql).
revoke all on table public.bot_products from anon, authenticated;
grant select on public.bot_products to authenticated;
grant select, insert, update, delete on public.bot_products to service_role;

revoke all on table public.bot_stores from anon, authenticated;
grant select on public.bot_stores to authenticated;
grant select, insert, update, delete on public.bot_stores to service_role;

-- Called after the last batch of a sync: removes products of older syncs
-- (= products that no longer exist in the store), updates the counters on the
-- bot and the store row. Returns the number of products now stored.
create or replace function public.finish_bot_products_sync(
  p_bot uuid,
  p_sync uuid,
  p_store_url text,
  p_currency text,
  p_source text,
  p_total_found integer,
  p_capped boolean
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_n integer;
begin
  delete from public.bot_products
  where bot_id = p_bot and sync_id is distinct from p_sync;

  select count(*) into v_n from public.bot_products where bot_id = p_bot;

  update public.bots set product_count = v_n, shop_url = p_store_url where id = p_bot;

  insert into public.bot_stores (bot_id, store_url, currency, source, product_count, total_found, capped, last_synced_at, last_error)
  values (p_bot, p_store_url, p_currency, p_source, v_n, p_total_found, coalesce(p_capped, false), now(), null)
  on conflict (bot_id) do update set
    store_url = excluded.store_url,
    currency = excluded.currency,
    source = excluded.source,
    product_count = excluded.product_count,
    total_found = excluded.total_found,
    capped = excluded.capped,
    last_synced_at = excluded.last_synced_at,
    last_error = null;

  return v_n;
end;
$$;

-- Deletes the whole catalog of one bot.
create or replace function public.clear_bot_products(p_bot uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.bot_products where bot_id = p_bot;
  delete from public.bot_stores where bot_id = p_bot;
  update public.bots set product_count = 0, shop_url = null where id = p_bot;
end;
$$;

-- Ranked full-text search inside ONE bot. p_query goes to
-- websearch_to_tsquery('english', ...) -- the app builds "word or word or ..."
-- from the visitor's message (letters/digits only). In-stock products win ties.
-- Returns at most 12 rows.
create or replace function public.search_bot_products(p_bot uuid, p_query text, p_limit integer default 8)
returns table (
  title text,
  url text,
  price numeric,
  price_max numeric,
  compare_at_price numeric,
  currency text,
  available boolean,
  vendor text,
  product_type text,
  description text,
  options jsonb,
  rank real
)
language sql
stable
security definer
set search_path = public
as $$
  with q as (select websearch_to_tsquery('english', coalesce(p_query, '')) as tsq)
  select p.title, p.url, p.price, p.price_max, p.compare_at_price, p.currency, p.available,
         p.vendor, p.product_type, p.description, p.options,
         ts_rank_cd(p.tsv, q.tsq)::real as rank
  from public.bot_products p, q
  where p.bot_id = p_bot
    and q.tsq <> ''::tsquery
    and p.tsv @@ q.tsq
  order by rank desc, p.available desc, p.title
  limit least(greatest(coalesce(p_limit, 8), 1), 12);
$$;

revoke all on function public.finish_bot_products_sync(uuid, uuid, text, text, text, integer, boolean) from public, anon, authenticated;
grant execute on function public.finish_bot_products_sync(uuid, uuid, text, text, text, integer, boolean) to service_role;
revoke all on function public.clear_bot_products(uuid) from public, anon, authenticated;
grant execute on function public.clear_bot_products(uuid) to service_role;
revoke all on function public.search_bot_products(uuid, text, integer) from public, anon, authenticated;
grant execute on function public.search_bot_products(uuid, text, integer) to service_role;
