-- Chatbot roadmap: "Add Bot Avatar". Run once in Supabase SQL Editor,
-- after schema.sql, schema-chatbot.sql, schema-chatbot-v2.sql, and
-- schema-chatbot-v3.sql. Safe to re-run.
--
-- avatar_config shape:
--   {
--     "mode": "single" | "multiple",
--     "avatars": [ { "kind": "image" | "gif", "url": "...", "size": 64 } ],
--     "frequencySeconds": 15
--   }
-- "mode" single = one avatar shown in the widget. "multiple" (paid only)
-- rotates between 2-4 avatars every "frequencySeconds". Free-trial
-- accounts are limited to one "image" avatar (enforced in the API routes
-- and upload route, not here); paid accounts can also use "gif" avatars
-- and the "multiple" mode.
alter table bots add column if not exists avatar_config jsonb not null default
  '{"mode":"single","avatars":[],"frequencySeconds":15}';

-- Storage bucket that avatar uploads (from the "Add Bot Avatar" uploader)
-- land in. Public read so the embed widget — a public, unauthenticated
-- page — can display avatars without a signed URL. Uploads are scoped by
-- folder: every object path starts with the uploader's auth.uid(), and the
-- policies below only let an owner write inside their own folder.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'bot-avatars',
  'bot-avatars',
  true,
  2097152, -- 2MB ceiling at the bucket level; the upload route enforces
           -- the tighter 500KB (image) / 2MB (gif) limits per file kind.
  array['image/png', 'image/jpeg', 'image/gif']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "bot avatars public read" on storage.objects;
create policy "bot avatars public read" on storage.objects
  for select using (bucket_id = 'bot-avatars');

drop policy if exists "bot avatars owner insert" on storage.objects;
create policy "bot avatars owner insert" on storage.objects
  for insert with check (
    bucket_id = 'bot-avatars'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

drop policy if exists "bot avatars owner update" on storage.objects;
create policy "bot avatars owner update" on storage.objects
  for update using (
    bucket_id = 'bot-avatars'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

drop policy if exists "bot avatars owner delete" on storage.objects;
create policy "bot avatars owner delete" on storage.objects
  for delete using (
    bucket_id = 'bot-avatars'
    and auth.uid()::text = (storage.foldername(name))[1]
  );
