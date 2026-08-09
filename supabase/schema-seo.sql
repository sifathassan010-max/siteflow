-- SEO tool: run once in Supabase SQL Editor.

create table if not exists seo_projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  root_url text not null,
  created_at timestamptz not null default now()
);

create table if not exists seo_scans (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references seo_projects(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  overall_score int,
  pages jsonb not null default '[]', -- array of per-page audit results
  created_at timestamptz not null default now()
);

create index if not exists seo_projects_user_id_idx on seo_projects (user_id);
create index if not exists seo_scans_project_id_idx on seo_scans (project_id, created_at);

alter table seo_projects enable row level security;
alter table seo_scans enable row level security;

create policy "select own seo projects" on seo_projects for select using (auth.uid() = user_id);
create policy "insert own seo projects" on seo_projects for insert with check (auth.uid() = user_id);
create policy "delete own seo projects" on seo_projects for delete using (auth.uid() = user_id);

create policy "select own seo scans" on seo_scans for select using (auth.uid() = user_id);
create policy "insert own seo scans" on seo_scans for insert with check (auth.uid() = user_id);
