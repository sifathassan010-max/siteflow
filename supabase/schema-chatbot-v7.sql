-- Chatbot roadmap: raise the GIF avatar size ceiling from 2MB to 5MB.
-- Run once in Supabase SQL Editor, after schema-chatbot-v4.sql. Safe to
-- re-run.
--
-- The app-side limit (MAX_GIF_BYTES, in src/lib/chatbot-bot-avatars.ts) is
-- what actually rejects an oversized file with a friendly error message.
-- But storage.buckets also has its own hard ceiling (set in
-- schema-chatbot-v4.sql), enforced by Supabase Storage itself before the
-- app ever gets to check anything. Raising only the app-side constant
-- without this would mean any file between 2MB and 5MB gets a generic
-- storage error instead of uploading. This brings the bucket ceiling back
-- in sync with the app.
update storage.buckets
set file_size_limit = 5242880 -- 5MB
where id = 'bot-avatars';
