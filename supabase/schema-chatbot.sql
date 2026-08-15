-- Chat history for the chatbot builder tool.
-- Run this once in Supabase SQL Editor. Depends on the existing `bots` table.

-- One row per visitor session talking to a bot's embedded widget.
create table if not exists bot_conversations (
  id uuid primary key default gen_random_uuid(),
  bot_id uuid not null references bots(id) on delete cascade,
  visitor_session text not null,   -- random id generated client-side, no login involved
  started_at timestamptz not null default now(),
  last_message_at timestamptz not null default now()
);

-- One (bot, visitor_session) pair is always the same conversation.
create unique index if not exists bot_conversations_bot_session_idx
  on bot_conversations (bot_id, visitor_session);

create index if not exists bot_conversations_bot_recent_idx
  on bot_conversations (bot_id, last_message_at desc);

create table if not exists bot_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references bot_conversations(id) on delete cascade,
  role text not null,   -- 'user' | 'assistant'
  content text not null,
  created_at timestamptz not null default now()
);

create index if not exists bot_messages_conversation_idx
  on bot_messages (conversation_id, created_at);

alter table bot_conversations enable row level security;
alter table bot_messages enable row level security;

-- Bot owners can read conversations/messages for bots they own.
-- Writes happen server-side via the service-role client in the embed
-- route (visitors are anonymous, no RLS session to write under), so no
-- insert policy is needed here.
create policy "own bot conversations" on bot_conversations
  for select using (
    exists (
      select 1 from bots
      where bots.id = bot_conversations.bot_id
        and bots.user_id = auth.uid()
    )
  );

create policy "own bot messages" on bot_messages
  for select using (
    exists (
      select 1 from bot_conversations bc
      join bots on bots.id = bc.bot_id
      where bc.id = bot_messages.conversation_id
        and bots.user_id = auth.uid()
    )
  );
