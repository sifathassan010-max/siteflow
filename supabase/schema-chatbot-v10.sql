-- Stage 2 (training up to 16 pages + chunked retrieval).
-- Run ONCE in Supabase SQL Editor BEFORE deploying the new code. Safe to re-run.
--
-- 1) bots: content_mode ('full' = send whole site_content like before,
--    'chunked' = send core info + best-matching chunks), core_content, content_chars.
-- 2) bot_chunks: crawled text split into ~700-char chunks, with a generated
--    tsvector + GIN index for Postgres full-text search.
-- 3) replace_bot_chunks() / search_bot_chunks(): service-role-only functions.
--
-- Storage: ~48,000 chars of text per bot => roughly 100-150 KB per bot incl.
-- index. 1,000 bots ~ 100-150 MB (Supabase Free = 500 MB total).

alter table public.bots add column if not exists content_mode text not null default 'full';
alter table public.bots add column if not exists core_content text;
alter table public.bots add column if not exists content_chars integer not null default 0;

alter table public.bots drop constraint if exists bots_content_mode_check;
alter table public.bots add constraint bots_content_mode_check
  check (content_mode in ('full', 'chunked'));

-- Guard rails: even a direct API write by a bot owner cannot stuff a huge
-- prompt (existing app code caps site_content at 12,000 chars).
alter table public.bots drop constraint if exists bots_site_content_len_check;
alter table public.bots add constraint bots_site_content_len_check
  check (site_content is null or char_length(site_content) <= 20000);
alter table public.bots drop constraint if exists bots_core_content_len_check;
alter table public.bots add constraint bots_core_content_len_check
  check (core_content is null or char_length(core_content) <= 3000);

create table if not exists public.bot_chunks (
  id uuid primary key default gen_random_uuid(),
  bot_id uuid not null references public.bots(id) on delete cascade,
  page_url text not null,
  chunk_index integer not null,
  content text not null check (char_length(content) <= 2000),
  tsv tsvector generated always as (to_tsvector('english', content)) stored,
  created_at timestamptz not null default now()
);

create index if not exists bot_chunks_bot_idx on public.bot_chunks (bot_id, chunk_index);
create index if not exists bot_chunks_tsv_idx on public.bot_chunks using gin (tsv);

-- RLS: owners may READ their own chunks (not needed by the app today, harmless);
-- all writes go through the service role (server routes) only.
alter table public.bot_chunks enable row level security;

drop policy if exists "Owners read own bot chunks" on public.bot_chunks;
create policy "Owners read own bot chunks" on public.bot_chunks
  for select to authenticated
  using (exists (
    select 1 from public.bots b
    where b.id = bot_chunks.bot_id and b.user_id = (select auth.uid())
  ));

-- Explicit Data API grants (required for new tables, see supabase/schema.sql).
revoke all on table public.bot_chunks from anon, authenticated;
grant select on public.bot_chunks to authenticated;
grant select, insert, update, delete on public.bot_chunks to service_role;

-- Atomically replaces all chunks of one bot. p_chunks = jsonb array of
-- {"page_url": "...", "chunk_index": 0, "content": "..."}. Max 400 rows.
-- Returns the number of rows stored. Pass '[]' to just delete.
create or replace function public.replace_bot_chunks(p_bot uuid, p_chunks jsonb)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_n integer;
begin
  delete from public.bot_chunks where bot_id = p_bot;

  insert into public.bot_chunks (bot_id, page_url, chunk_index, content)
  select p_bot, left(c.page_url, 2000), c.chunk_index, left(c.content, 2000)
  from jsonb_to_recordset(coalesce(p_chunks, '[]'::jsonb))
       as c(page_url text, chunk_index integer, content text)
  where c.content is not null and length(btrim(c.content)) > 0
    and c.page_url is not null and c.chunk_index is not null
  order by c.chunk_index
  limit 400;

  get diagnostics v_n = row_count;
  return v_n;
end;
$$;

-- Ranked full-text search inside ONE bot. p_query is passed to
-- websearch_to_tsquery('english', ...) -- the app builds "word or word or ..."
-- from the visitor's message (letters/digits only). Returns at most 12 rows.
create or replace function public.search_bot_chunks(p_bot uuid, p_query text, p_limit integer default 6)
returns table (page_url text, chunk_index integer, content text, rank real)
language sql
stable
security definer
set search_path = public
as $$
  with q as (select websearch_to_tsquery('english', coalesce(p_query, '')) as tsq)
  select c.page_url, c.chunk_index, c.content, ts_rank_cd(c.tsv, q.tsq)::real as rank
  from public.bot_chunks c, q
  where c.bot_id = p_bot
    and q.tsq <> ''::tsquery
    and c.tsv @@ q.tsq
  order by rank desc, c.chunk_index
  limit least(greatest(coalesce(p_limit, 6), 1), 12);
$$;

revoke all on function public.replace_bot_chunks(uuid, jsonb) from public, anon, authenticated;
grant execute on function public.replace_bot_chunks(uuid, jsonb) to service_role;
revoke all on function public.search_bot_chunks(uuid, text, integer) from public, anon, authenticated;
grant execute on function public.search_bot_chunks(uuid, text, integer) to service_role;
