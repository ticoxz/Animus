-- Memory toolset (Hermes): hechos atómicos + extracción async

create table if not exists memory_facts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  fact text not null,
  category text not null default 'general'
    check (category in ('demographic', 'interests', 'relationships', 'dated_plans', 'instructions', 'general')),
  created_at timestamptz not null default now()
);

create index if not exists idx_memory_facts_user on memory_facts(user_id, created_at desc);

alter table memory_facts enable row level security;
