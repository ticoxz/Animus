-- Procedural memory (Hermes agent-created skills)

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
