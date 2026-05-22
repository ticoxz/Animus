-- Animus Memory Bank: entities + relations for graph view

create table if not exists user_entities (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  name text not null,
  name_normalized text not null,
  type text not null default 'other'
    check (type in ('person', 'place', 'project', 'habit', 'emotion', 'other')),
  description text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, name_normalized)
);

create table if not exists entity_relations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  from_entity_id uuid not null references user_entities(id) on delete cascade,
  to_entity_id uuid not null references user_entities(id) on delete cascade,
  relation_type text not null,
  created_at timestamptz not null default now(),
  unique (user_id, from_entity_id, to_entity_id, relation_type)
);

alter table memory_facts
  add column if not exists entity_id uuid references user_entities(id) on delete set null,
  add column if not exists confidence real default 0.8,
  add column if not exists source text not null default 'extract'
    check (source in ('chat', 'extract'));

create index if not exists idx_entities_user on user_entities(user_id);
create index if not exists idx_entities_normalized on user_entities(user_id, name_normalized);
create index if not exists idx_relations_user on entity_relations(user_id);
create index if not exists idx_relations_from on entity_relations(from_entity_id);
create index if not exists idx_relations_to on entity_relations(to_entity_id);
create index if not exists idx_memory_facts_entity on memory_facts(entity_id);

alter table user_entities enable row level security;
alter table entity_relations enable row level security;
