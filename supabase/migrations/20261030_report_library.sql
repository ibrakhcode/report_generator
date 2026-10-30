create table if not exists public.report_library_folders (
  id text primary key,
  owner_user_id text not null references public.users (id) on delete cascade,
  company_id text references public.companies (id) on delete set null,
  name text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.report_library_files (
  id text primary key,
  folder_id text not null references public.report_library_folders (id) on delete cascade,
  owner_user_id text not null references public.users (id) on delete cascade,
  company_id text references public.companies (id) on delete set null,
  file_name text not null,
  file_size integer,
  file_type text,
  storage_path text not null,
  description text,
  uploaded_at timestamptz not null default now()
);

create index if not exists report_library_folders_owner_idx on public.report_library_folders (owner_user_id);
create index if not exists report_library_files_folder_idx on public.report_library_files (folder_id);
create index if not exists report_library_files_owner_idx on public.report_library_files (owner_user_id);

insert into storage.buckets (id, name, public)
values ('report-library', 'report-library', false)
on conflict (id) do nothing;

alter table public.report_library_folders disable row level security;
alter table public.report_library_files disable row level security;
