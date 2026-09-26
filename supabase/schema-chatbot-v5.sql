-- Chatbot roadmap: widget position picker (Top Right / Top Left / Bottom
-- Right / Bottom Left). Run once in Supabase SQL Editor, after
-- schema-chatbot-v4.sql. Safe to re-run.
alter table bots add column if not exists widget_position text not null default 'bottom-right';

alter table bots drop constraint if exists bots_widget_position_check;
alter table bots add constraint bots_widget_position_check
  check (widget_position in ('top-right', 'top-left', 'bottom-right', 'bottom-left'));
