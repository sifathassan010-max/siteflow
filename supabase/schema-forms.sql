-- Forms & Lead Capture tool: run once in Supabase SQL Editor.

create table if not exists forms (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  fields jsonb not null default '[
    {"id":"name","label":"Name","type":"text","required":true},
    {"id":"email","label":"Email","type":"email","required":true},
    {"id":"message","label":"Message","type":"textarea","required":false}
  ]',
  notify_email text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists form_submissions (
  id uuid primary key default gen_random_uuid(),
  form_id uuid not null references forms(id) on delete cascade,
  data jsonb not null,
  created_at timestamptz not null default now()
);

create index if not exists forms_user_id_idx on forms (user_id);
create index if not exists form_submissions_form_id_idx on form_submissions (form_id, created_at);

alter table forms enable row level security;
alter table form_submissions enable row level security;

create policy "select own forms" on forms for select using (auth.uid() = user_id);
create policy "insert own forms" on forms for insert with check (auth.uid() = user_id);
create policy "update own forms" on forms for update using (auth.uid() = user_id);
create policy "delete own forms" on forms for delete using (auth.uid() = user_id);

-- No public insert/select policy on either table on purpose — the public
-- embed widget submits through /api/embed/form/[id]/submit, which uses the
-- service-role admin client (same pattern as the chatbot embed) so it can
-- bypass RLS deliberately, after its own validation + usage-limit check.
create policy "select own submissions" on form_submissions for select using (
  auth.uid() = (select user_id from forms where forms.id = form_id)
);
