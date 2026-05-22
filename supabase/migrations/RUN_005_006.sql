-- Ejecutá TODO este archivo en Supabase → SQL Editor → Run
-- Orden: 005 (tabla base) + 006 (curator + nudges)

-- ========== 005 ==========
create table if not exists runtime_skills (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  name text not null,
  description text not null,
  category text not null default 'utility',
  keywords text[] not null default '{}',
  config jsonb not null,
  is_active boolean not null default true,
  created_by text not null default 'agent'
    check (created_by in ('agent', 'user')),
  use_count int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, name)
);

create index if not exists idx_runtime_skills_user on runtime_skills(user_id);
create index if not exists idx_runtime_skills_active on runtime_skills(user_id) where is_active = true;

alter table runtime_skills enable row level security;

-- ========== 006 ==========
alter table runtime_skills
  add column if not exists last_used_at timestamptz,
  add column if not exists archived_at timestamptz,
  add column if not exists skill_md text;

create index if not exists idx_runtime_skills_stale
  on runtime_skills(user_id, updated_at)
  where is_active = true;

create table if not exists skill_nudges (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  user_message text not null,
  assistant_summary text not null,
  tools_used text[] not null default '{}',
  status text not null default 'pending'
    check (status in ('pending', 'accepted', 'dismissed')),
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);

create index if not exists idx_skill_nudges_user_pending
  on skill_nudges(user_id)
  where status = 'pending';

alter table skill_nudges enable row level security;
