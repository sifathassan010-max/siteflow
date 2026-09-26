-- Chatbot roadmap: custom clickable queries/FAQ entries shown in the
-- widget. Run once in Supabase SQL Editor, after schema.sql,
-- schema-chatbot.sql, and schema-chatbot-v2.sql. Safe to re-run.

-- Each array entry looks like:
--   { "question": "Do you offer refunds?", "color": "#4f46e5", "description": "..." }
-- "question" is the clickable header text shown in the widget.
-- "color" is the text color used for that question.
-- "description" is shown only once a visitor clicks the question — it's
-- never sent through the AI, just displayed as written (unlimited length).
-- Free-trial accounts are limited to one entry (enforced in the API
-- routes, not here); paid accounts can add as many as they want.
alter table bots add column if not exists custom_queries jsonb not null default '[]';
