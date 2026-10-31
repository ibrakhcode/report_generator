create table if not exists public.password_resets (
  email text primary key,
  salt text not null,
  hash text not null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

alter table public.password_resets enable row level security;
