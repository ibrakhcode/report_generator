alter table public.users
  add column if not exists manager_id text references public.users (id) on delete set null,
  add column if not exists pending_manager_name text;

create index if not exists users_manager_id_idx on public.users (manager_id);
create index if not exists users_pending_manager_name_idx
  on public.users (company_id, pending_manager_name);
