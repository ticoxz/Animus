-- OAuth tokens por usuario (Google, Spotify, etc.)

create table if not exists user_oauth_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  provider text not null check (provider in ('google', 'spotify')),
  access_token text not null,
  refresh_token text,
  expires_at timestamptz,
  scope text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, provider)
);

create index if not exists idx_oauth_user on user_oauth_tokens(user_id);

alter table user_oauth_tokens enable row level security;

-- Eventos de calendario cacheados (briefing / reuniones)
create table if not exists calendar_events_cache (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  external_id text not null,
  summary text not null,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  location text,
  raw jsonb,
  synced_at timestamptz not null default now(),
  unique (user_id, external_id)
);

create index if not exists idx_calendar_user_start on calendar_events_cache(user_id, starts_at);

alter table calendar_events_cache enable row level security;
