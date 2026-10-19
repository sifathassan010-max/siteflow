-- Chatbot roadmap: independent horizontal/vertical distance from the
-- corner for the floating widget (previously a single fixed 24px margin
-- on both axes). Run once in Supabase SQL Editor, after
-- schema-chatbot-v4.sql. Safe to re-run.
alter table bots add column if not exists widget_offset_x integer not null default 24;
alter table bots add column if not exists widget_offset_y integer not null default 24;

alter table bots drop constraint if exists bots_widget_offset_x_check;
alter table bots add constraint bots_widget_offset_x_check
  check (widget_offset_x >= 0 and widget_offset_x <= 200);

alter table bots drop constraint if exists bots_widget_offset_y_check;
alter table bots add constraint bots_widget_offset_y_check
  check (widget_offset_y >= 0 and widget_offset_y <= 200);
