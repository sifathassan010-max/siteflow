-- Chatbot roadmap items 2-7. Run once in Supabase SQL Editor, after
-- schema.sql and schema-chatbot.sql. Safe to re-run (all guarded).

-- Quick Prompts (starter question buttons shown before the visitor's first message)
alter table bots add column if not exists quick_prompts text[] not null default '{}';

-- Widget appearance customization
alter table bots add column if not exists widget_color text not null default '#4f46e5';
alter table bots add column if not exists logo_url text;

-- "Escalate to a human" — an email address or contact-page URL. If set, the
-- bot is told to point visitors here when it can't answer, and the widget
-- shows a persistent "Talk to a human" link.
alter table bots add column if not exists escalation_contact text;

-- Model choice: fast vs. thorough. Validated in the API route, not here.
alter table bots add column if not exists model text not null default 'llama-3.1-8b-instant';

-- Multi-page training bookkeeping — which pages the bot's current
-- knowledge came from, and when it was last (re)trained.
alter table bots add column if not exists trained_pages jsonb not null default '[]';
alter table bots add column if not exists last_trained_at timestamptz;

-- Lead capture: visitor name/email/message collected mid-conversation
-- through the widget's "Leave your contact info" form.
create table if not exists bot_leads (
  id uuid primary key default gen_random_uuid(),
  bot_id uuid not null references bots(id) on delete cascade,
  conversation_id uuid references bot_conversations(id) on delete set null,
  name text,
  email text,
  message text,
  created_at timestamptz not null default now()
);

create index if not exists bot_leads_bot_idx on bot_leads (bot_id, created_at desc);

alter table bot_leads enable row level security;

create policy "own bot leads" on bot_leads
  for select using (
    exists (
      select 1 from bots
      where bots.id = bot_leads.bot_id
        and bots.user_id = auth.uid()
    )
  );
