-- Fix infinite recursion on users / companies / report_templates policies.
-- Run in the Supabase SQL Editor after 20261029_init.sql.

create or replace function public.current_app_company_id()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select u.company_id from public.users u where u.id = auth.uid()::text limit 1;
$$;

drop policy if exists "read own company" on public.companies;
create policy "read own company" on public.companies
  for select using (id = public.current_app_company_id());

drop policy if exists "read own user" on public.users;
create policy "read own user" on public.users
  for select using (
    id = auth.uid()::text
    or company_id = public.current_app_company_id()
  );

drop policy if exists "company shared templates" on public.report_templates;
create policy "company shared templates" on public.report_templates
  for select using (
    company_id is null
    or company_id = public.current_app_company_id()
  );
