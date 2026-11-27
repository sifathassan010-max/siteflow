-- Fix: a PARTIAL Shopify re-sync (import stopped early: slow store / rate limit)
-- used to delete every product it had not re-fetched, shrinking the catalog.
-- finish_bot_products_sync() now takes p_prune (default true); the app passes
-- false for partial syncs so old products stay until a complete sync.
-- Run ONCE in Supabase SQL Editor (any time after v11). Safe to re-run.
-- Old code keeps working (the new parameter has a default).

drop function if exists public.finish_bot_products_sync(uuid, uuid, text, text, text, integer, boolean);
drop function if exists public.finish_bot_products_sync(uuid, uuid, text, text, text, integer, boolean, boolean);

create or replace function public.finish_bot_products_sync(
  p_bot uuid,
  p_sync uuid,
  p_store_url text,
  p_currency text,
  p_source text,
  p_total_found integer,
  p_capped boolean,
  p_prune boolean default true
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_n integer;
begin
  if coalesce(p_prune, true) then
    delete from public.bot_products
    where bot_id = p_bot and sync_id is distinct from p_sync;
  end if;

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

revoke all on function public.finish_bot_products_sync(uuid, uuid, text, text, text, integer, boolean, boolean) from public, anon, authenticated;
grant execute on function public.finish_bot_products_sync(uuid, uuid, text, text, text, integer, boolean, boolean) to service_role;
