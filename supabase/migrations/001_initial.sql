-- Animus: schema inicial (multi-usuario por telegram_user_id)

create extension if not exists "pgcrypto";

create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  telegram_user_id bigint not null unique,
  first_name text,
  username text,
  profile jsonb not null default '{
    "demographic": "",
    "interests": "",
    "relationships": "",
    "dated_plans": "",
    "instructions": ""
  }'::jsonb,
  timezone text not null default 'America/Argentina/Buenos_Aires',
  proactive_paused_until timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists user_skills (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  skill_id text not null,
  status text not null default 'locked'
    check (status in ('locked', 'offered', 'active', 'paused')),
  proactive_enabled boolean not null default false,
  config jsonb not null default '{}'::jsonb,
  offered_at timestamptz,
  activated_at timestamptz,
  created_at timestamptz not null default now(),
  unique (user_id, skill_id)
);

create table if not exists messages_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  created_at timestamptz not null default now()
);

create table if not exists transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  amount_cents bigint not null,
  currency text not null default 'ARS',
  category text,
  description text,
  confirmed boolean not null default false,
  raw_message text,
  created_at timestamptz not null default now()
);

create index if not exists idx_users_telegram on users(telegram_user_id);
create index if not exists idx_user_skills_user on user_skills(user_id);
create index if not exists idx_transactions_user on transactions(user_id);

alter table users enable row level security;
alter table user_skills enable row level security;
alter table messages_log enable row level security;
alter table transactions enable row level security;

-- Backend usa service_role; RLS listo para cliente futuro
