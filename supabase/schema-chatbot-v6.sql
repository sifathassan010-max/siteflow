-- Groq deprecated and shut down llama-3.1-8b-instant and
-- llama-3.3-70b-versatile on 2026-08-16 (see console.groq.com/docs/deprecations).
-- The app code now remaps any bot still storing the old model id at
-- request time (see src/lib/groq-models.ts), so this migration is not
-- required for existing bots to keep working — it just keeps the column
-- default correct for bots created from here on.
alter table bots alter column model set default 'openai/gpt-oss-20b';

-- Optional one-time cleanup: bring already-existing bots' stored model
-- column up to date too (purely cosmetic — the app already resolves these
-- correctly either way).
update bots set model = 'openai/gpt-oss-20b' where model = 'llama-3.1-8b-instant';
update bots set model = 'openai/gpt-oss-120b' where model = 'llama-3.3-70b-versatile';
