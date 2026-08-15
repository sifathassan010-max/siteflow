-- Discussions tool: run once in Supabase SQL Editor.
-- Reddit-style threads: public read (no login), login required to post.
-- author_name is denormalized onto each row at insert time (copied from
-- the poster's own profile, which they can always read under existing RLS)
-- so the front page and thread pages can show a name without needing a
-- public-read policy on `profiles` — profiles stays locked to
-- auth.uid() = id, same as every other tool in this codebase.

create table if not exists discussion_threads (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  author_name text not null,
  title text not null,
  body text not null,
  word_count int not null,
  tags text[] not null,
  reply_count int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint title_length check (char_length(title) between 5 and 200),
  constraint tag_count check (array_length(tags, 1) between 5 and 10)
);

create table if not exists discussion_replies (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references discussion_threads(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  author_name text not null,
  body text not null,
  created_at timestamptz not null default now()
);

create index if not exists discussion_threads_created_at_idx on discussion_threads (created_at desc);
create index if not exists discussion_threads_tags_idx on discussion_threads using gin (tags);
create index if not exists discussion_threads_title_idx on discussion_threads using gin (to_tsvector('english', title));
create index if not exists discussion_replies_thread_id_idx on discussion_replies (thread_id, created_at);

alter table discussion_threads enable row level security;
alter table discussion_replies enable row level security;

-- Anyone can read — threads and replies are public, no login required.
create policy "public read threads" on discussion_threads for select using (true);
create policy "public read replies" on discussion_replies for select using (true);

-- Only a logged-in user can create, and only as themselves.
create policy "logged-in users create threads" on discussion_threads
  for insert with check (auth.uid() = user_id);
create policy "logged-in users create replies" on discussion_replies
  for insert with check (auth.uid() = user_id);

-- Keep each thread's reply_count and updated_at in sync automatically.
create or replace function public.handle_new_discussion_reply()
returns trigger as $$
begin
  update discussion_threads
  set reply_count = reply_count + 1,
      updated_at = now()
  where id = new.thread_id;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_discussion_reply_created on discussion_replies;
create trigger on_discussion_reply_created
  after insert on discussion_replies
  for each row execute procedure public.handle_new_discussion_reply();
