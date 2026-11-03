create table if not exists public.report_posts (
  id text primary key,
  owner_user_id text not null references public.users (id) on delete cascade,
  company_id text references public.companies (id) on delete set null,
  month text not null,
  source text not null,
  record_id text not null,
  posted_at timestamptz not null default now()
);

create unique index if not exists report_posts_owner_month_source_record_idx
  on public.report_posts (owner_user_id, month, source, record_id);
create index if not exists report_posts_owner_idx on public.report_posts (owner_user_id);

alter table public.report_posts disable row level security;
