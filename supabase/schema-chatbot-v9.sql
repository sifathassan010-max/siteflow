-- Stage 1 (cost protection). Run ONCE in Supabase SQL Editor. Safe to re-run.
-- 1) Token logging columns on usage_events (nullable).
-- 2) visitor_rate_events + check_visitor_rate() for per-visitor abuse limits
--    on the public embed chat route.

alter table public.usage_events add column if not exists prompt_tokens integer;
alter table public.usage_events add column if not exists completion_tokens integer;
alter table public.usage_events add column if not exists model text;

create table if not exists public.visitor_rate_events (
  id uuid primary key default gen_random_uuid(),
  bot_id uuid not null references public.bots(id) on delete cascade,
  session_hash text not null,
  ip_hash text not null,
  created_at timestamptz not null default now()
);

create index if not exists visitor_rate_session_idx
  on public.visitor_rate_events (bot_id, session_hash, created_at desc);
create index if not exists visitor_rate_ip_idx
  on public.visitor_rate_events (bot_id, ip_hash, created_at desc);
create index if not exists visitor_rate_created_idx
  on public.visitor_rate_events (created_at);

-- RLS on with NO policies: anon/authenticated can never read or write it.
alter table public.visitor_rate_events enable row level security;
revoke all on table public.visitor_rate_events from anon, authenticated;
grant select, insert, delete on public.visitor_rate_events to service_role;

-- Returns {"allowed":true} and records the message, or
-- {"allowed":false,"reason":"minute"|"day","retry_after":<seconds>}.
-- Limits are per (bot, session) AND per (bot, ip_hash); day = rolling 24h.
create or replace function public.check_visitor_rate(
  p_bot uuid,
  p_session text,
  p_ip text,
  p_per_minute integer default 8,
  p_per_day integer default 100
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_now timestamptz := now();
  v_cnt integer;
  v_oldest timestamptz;
begin
  -- serialize concurrent requests from the same bot+ip
  perform pg_advisory_xact_lock(hashtextextended(p_bot::text || ':' || p_ip, 0));

  -- per-minute: session, then ip
  select count(*), min(created_at) into v_cnt, v_oldest
    from public.visitor_rate_events
    where bot_id = p_bot and session_hash = p_session
      and created_at > v_now - interval '1 minute';
  if v_cnt >= p_per_minute then
    return jsonb_build_object('allowed', false, 'reason', 'minute',
      'retry_after', greatest(1, ceil(extract(epoch from (v_oldest + interval '1 minute' - v_now)))));
  end if;

  select count(*), min(created_at) into v_cnt, v_oldest
    from public.visitor_rate_events
    where bot_id = p_bot and ip_hash = p_ip
      and created_at > v_now - interval '1 minute';
  if v_cnt >= p_per_minute then
    return jsonb_build_object('allowed', false, 'reason', 'minute',
      'retry_after', greatest(1, ceil(extract(epoch from (v_oldest + interval '1 minute' - v_now)))));
  end if;

  -- per-day (rolling 24h): session, then ip
  select count(*), min(created_at) into v_cnt, v_oldest
    from public.visitor_rate_events
    where bot_id = p_bot and session_hash = p_session
      and created_at > v_now - interval '24 hours';
  if v_cnt >= p_per_day then
    return jsonb_build_object('allowed', false, 'reason', 'day',
      'retry_after', greatest(1, ceil(extract(epoch from (v_oldest + interval '24 hours' - v_now)))));
  end if;

  select count(*), min(created_at) into v_cnt, v_oldest
    from public.visitor_rate_events
    where bot_id = p_bot and ip_hash = p_ip
      and created_at > v_now - interval '24 hours';
  if v_cnt >= p_per_day then
    return jsonb_build_object('allowed', false, 'reason', 'day',
      'retry_after', greatest(1, ceil(extract(epoch from (v_oldest + interval '24 hours' - v_now)))));
  end if;

  insert into public.visitor_rate_events (bot_id, session_hash, ip_hash)
    values (p_bot, p_session, p_ip);

  -- cheap housekeeping: ~2% of calls purge rows older than 2 days
  if random() < 0.02 then
    delete from public.visitor_rate_events where created_at < v_now - interval '2 days';
  end if;

  return jsonb_build_object('allowed', true);
end;
$$;

revoke all on function public.check_visitor_rate(uuid, text, text, integer, integer) from public, anon, authenticated;
grant execute on function public.check_visitor_rate(uuid, text, text, integer, integer) to service_role;
