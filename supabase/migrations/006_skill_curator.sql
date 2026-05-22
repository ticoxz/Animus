-- Fase 2 Hermes: curator + nudges + SKILL.md metadata

alter table runtime_skills
  add column if not exists last_used_at timestamptz,
  add column if not exists archived_at timestamptz,
  add column if not exists skill_md text;

create index if not exists idx_runtime_skills_stale
  on runtime_skills(user_id, updated_at)
  where is_active = true;

-- Nudge: «¿Guardo esto como skill?» tras tareas complejas
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
