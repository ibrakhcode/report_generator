-- HESU ICT Reporting Management System
-- Run this in the Supabase SQL Editor (or via supabase db push).
-- There was no connected Supabase MCP in this workspace, so this file
-- is the source of truth generated from the application types.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Companies (join / register)
-- ---------------------------------------------------------------------------
create table if not exists public.companies (
  id text primary key,
  name text not null,
  short_code text,
  headquarters text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Users (app accounts; password hashes stay app-side until Auth is wired)
-- ---------------------------------------------------------------------------
create table if not exists public.users (
  id text primary key,
  email text not null unique,
  full_name text not null,
  role text not null default 'editor',
  title text,
  department text,
  phone text,
  salt text,
  hash text,
  rsalt text,
  rhash text,
  recovery_code text,
  must_change_password boolean not null default false,
  active boolean not null default true,
  avatar_url text,
  last_login timestamptz,
  allowed_modules jsonb not null default '[]'::jsonb,
  company_id text references public.companies (id) on delete set null,
  workspace_owner boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists users_company_id_idx on public.users (company_id);

-- ---------------------------------------------------------------------------
-- Company settings (one row per company)
-- ---------------------------------------------------------------------------
create table if not exists public.company_settings (
  company_id text primary key references public.companies (id) on delete cascade,
  company_name text,
  brand_short_name text,
  department text,
  company_logo text,
  headquarters text,
  business_timezone text default 'Africa/Dar_es_Salaam',
  default_reporting_period text,
  ticket_default_sla_hours integer default 8,
  ui_theme text default 'light',
  ui_font text default 'jakarta',
  auto_save boolean default true,
  idle_timeout_minutes integer default 15,
  email_service jsonb not null default '{}'::jsonb,
  whatsapp_service jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Master assets
-- ---------------------------------------------------------------------------
create table if not exists public.asset_definitions (
  id text primary key,
  name text not null,
  description text,
  fields jsonb not null default '[]'::jsonb,
  system_key text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.asset_records (
  id text primary key,
  definition_id text not null references public.asset_definitions (id) on delete cascade,
  name text not null,
  values jsonb not null default '{}'::jsonb,
  company_id text references public.companies (id) on delete cascade,
  owner_user_id text references public.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists asset_records_company_idx on public.asset_records (company_id);
create index if not exists asset_records_owner_idx on public.asset_records (owner_user_id);

-- ---------------------------------------------------------------------------
-- Operational records (private per login: owner_user_id)
-- ---------------------------------------------------------------------------
create table if not exists public.daily_activities (
  id text primary key,
  owner_user_id text not null references public.users (id) on delete cascade,
  company_id text references public.companies (id) on delete set null,
  date date not null,
  title text not null,
  description text,
  category text,
  department text,
  system_or_device text,
  priority text,
  start_time text,
  end_time text,
  hours_spent numeric default 0,
  status text,
  action_taken text,
  result_outcome text,
  business_impact text,
  related_kpi_id text,
  related_project_id text,
  related_ticket_id text,
  evidence_links jsonb not null default '[]'::jsonb,
  evidence_files jsonb not null default '[]'::jsonb,
  next_action text,
  due_date date,
  lessons_learned text,
  created_by text,
  archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.tickets (
  id text primary key,
  owner_user_id text not null references public.users (id) on delete cascade,
  company_id text references public.companies (id) on delete set null,
  reported_at timestamptz not null default now(),
  requester_name text,
  requester_email text,
  department text,
  title text not null,
  description text,
  category text,
  application_or_device text,
  priority text,
  assigned_technician text,
  status text,
  actions_taken text,
  root_cause text,
  resolution text,
  resolved_at timestamptz,
  resolution_hours numeric,
  sla_target_hours numeric default 8,
  sla_breached boolean not null default false,
  related_activity_id text,
  evidence_files jsonb not null default '[]'::jsonb,
  user_feedback text,
  escalation_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.system_issues (
  id text primary key,
  owner_user_id text not null references public.users (id) on delete cascade,
  company_id text references public.companies (id) on delete set null,
  system_name text,
  module text,
  error_code text,
  date_identified date,
  affected_business_unit text,
  business_impact text,
  investigation text,
  corrective_action text,
  vendor_involved text,
  escalation_ref text,
  temporary_workaround text,
  workaround_approved_by text,
  final_resolution text,
  verification_results text,
  outstanding_actions text,
  status text,
  evidence_files jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.projects (
  id text primary key,
  owner_user_id text not null references public.users (id) on delete cascade,
  company_id text references public.companies (id) on delete set null,
  name text not null,
  objective text,
  business_justification text,
  start_date date,
  target_completion_date date,
  owner text,
  assigned_user_id text,
  assigned_user_name text,
  my_responsibilities text,
  status text,
  milestones jsonb not null default '[]'::jsonb,
  progress_percent numeric default 0,
  risks_and_dependencies text,
  estimated_cost text,
  benefits_and_outcomes text,
  approval_status text,
  evidence_files jsonb not null default '[]'::jsonb,
  lessons_learned text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.kpis (
  id text primary key,
  owner_user_id text not null references public.users (id) on delete cascade,
  company_id text references public.companies (id) on delete set null,
  name text not null,
  description text,
  objective text,
  measurement_method text,
  unit text,
  target_value numeric,
  actual_value numeric,
  calculation_type text,
  reporting_frequency text,
  weight_percent numeric,
  data_source text,
  responsible_employee text,
  achievement_percent numeric,
  self_assessment text,
  manager_assessment text,
  comments text,
  evidence_links jsonb not null default '[]'::jsonb,
  status text,
  updated_at timestamptz not null default now()
);

create table if not exists public.evidence (
  id text primary key,
  owner_user_id text not null references public.users (id) on delete cascade,
  company_id text references public.companies (id) on delete set null,
  file_name text not null,
  file_size integer,
  file_type text,
  storage_path text,
  upload_date timestamptz not null default now(),
  uploaded_by text,
  reporting_period text,
  category text,
  description text,
  related_entity_id text,
  related_entity_type text
);

create table if not exists public.training (
  id text primary key,
  owner_user_id text not null references public.users (id) on delete cascade,
  company_id text references public.companies (id) on delete set null,
  title text not null,
  date date,
  topic text,
  target_audience text,
  participant_count integer default 0,
  materials_url text,
  learning_objectives text,
  feedback_score numeric,
  follow_up_actions text,
  evidence_files jsonb not null default '[]'::jsonb,
  signed_document_name text,
  signed_document_path text,
  signed_document_type text,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Shared per company: report templates
-- ---------------------------------------------------------------------------
create table if not exists public.report_templates (
  id text primary key,
  company_id text references public.companies (id) on delete cascade,
  name text not null,
  description text,
  is_default boolean not null default false,
  slide_format text default '16:9',
  primary_color text,
  accent_color text,
  text_color text,
  font_family text,
  company_logo_url text,
  header_text text,
  footer_text text,
  sections_order jsonb not null default '[]'::jsonb,
  uploaded_template_name text,
  storage_path text,
  has_uploaded_file boolean not null default false,
  detected_placeholders jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

create unique index if not exists report_templates_one_default_per_company
  on public.report_templates (company_id)
  where is_default = true;

create table if not exists public.monthly_reports (
  id text primary key,
  owner_user_id text not null references public.users (id) on delete cascade,
  company_id text references public.companies (id) on delete set null,
  month text not null,
  title text,
  employee_name text,
  employee_title text,
  employee_email text,
  department text,
  company_name text,
  executive_summary text,
  reporting_period text,
  included_sections jsonb not null default '[]'::jsonb,
  major_achievements text,
  outstanding_issues text,
  challenges_and_risks text,
  recommendations text,
  next_month_priorities text,
  status text default 'Draft',
  version integer default 1,
  selected_template_id text references public.report_templates (id) on delete set null,
  finalized_at timestamptz,
  finalized_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint monthly_reports_owner_month unique (owner_user_id, month)
);

create table if not exists public.audit_logs (
  id text primary key,
  company_id text references public.companies (id) on delete set null,
  timestamp timestamptz not null default now(),
  user_email text,
  user_name text,
  action text not null,
  module text,
  record_id text,
  details text
);

create index if not exists daily_activities_owner_idx on public.daily_activities (owner_user_id);
create index if not exists tickets_owner_idx on public.tickets (owner_user_id);
create index if not exists training_owner_idx on public.training (owner_user_id);
create index if not exists report_templates_company_idx on public.report_templates (company_id);

-- ---------------------------------------------------------------------------
-- Seed master asset types
-- ---------------------------------------------------------------------------
insert into public.asset_definitions (id, name, description, system_key, fields)
values
  (
    'AST-TYPE-COMPANY',
    'Company',
    'Organizations. Selecting a company loads that company workspace.',
    'company',
    '[{"id":"fld-company-code","label":"Short code","type":"text","required":false},{"id":"fld-company-hq","label":"Headquarters","type":"text","required":false}]'::jsonb
  ),
  (
    'AST-TYPE-DEPARTMENT',
    'Department',
    'Business units for the selected company.',
    'department',
    '[{"id":"fld-dept-code","label":"Code","type":"text","required":false}]'::jsonb
  ),
  (
    'AST-TYPE-DEVICE',
    'Device',
    'Hardware and systems for the selected company.',
    'device',
    '[{"id":"fld-device-serial","label":"Serial number","type":"text","required":false},{"id":"fld-device-location","label":"Location","type":"text","required":false}]'::jsonb
  )
on conflict (id) do nothing;

-- Default shared PPTX template metadata (file goes in Storage bucket report-templates)
insert into public.report_templates (
  id, company_id, name, description, is_default, slide_format,
  primary_color, accent_color, text_color, font_family, header_text, footer_text,
  uploaded_template_name, storage_path, has_uploaded_file
) values (
  'TMPL-ICT-2026',
  null,
  'ICT Monthly Report 2026',
  'Shared default PowerPoint look from ICT_Monthly_Report_2026.pptx.',
  true,
  '16:9',
  '#071B33',
  '#C9A227',
  '#1E293B',
  'Georgia',
  'Monthly Performance Report',
  'Confidential — For Internal Management Use Only',
  'ICT_Monthly_Report_2026.pptx',
  'report-templates/ICT_Monthly_Report_2026.pptx',
  true
) on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- Storage buckets (files, not JSON in Postgres)
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values
  ('evidence', 'evidence', false),
  ('training-docs', 'training-docs', false),
  ('report-templates', 'report-templates', true)
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- Row Level Security
-- Enable now. Policies assume future Supabase Auth where auth.uid()::text = users.id.
-- Until Auth is wired, use the service role on the server only (never in the browser).
-- ---------------------------------------------------------------------------
alter table public.companies enable row level security;
alter table public.users enable row level security;
alter table public.company_settings enable row level security;
alter table public.asset_definitions enable row level security;
alter table public.asset_records enable row level security;
alter table public.daily_activities enable row level security;
alter table public.tickets enable row level security;
alter table public.system_issues enable row level security;
alter table public.projects enable row level security;
alter table public.kpis enable row level security;
alter table public.evidence enable row level security;
alter table public.training enable row level security;
alter table public.report_templates enable row level security;
alter table public.monthly_reports enable row level security;
alter table public.audit_logs enable row level security;

create policy "read own company" on public.companies
  for select using (
    id in (select company_id from public.users where id = auth.uid()::text)
  );

create policy "read own user" on public.users
  for select using (id = auth.uid()::text or company_id in (
    select company_id from public.users where id = auth.uid()::text
  ));

create policy "owner crud activities" on public.daily_activities
  for all using (owner_user_id = auth.uid()::text)
  with check (owner_user_id = auth.uid()::text);

create policy "owner crud tickets" on public.tickets
  for all using (owner_user_id = auth.uid()::text)
  with check (owner_user_id = auth.uid()::text);

create policy "owner crud system_issues" on public.system_issues
  for all using (owner_user_id = auth.uid()::text)
  with check (owner_user_id = auth.uid()::text);

create policy "owner crud projects" on public.projects
  for all using (owner_user_id = auth.uid()::text)
  with check (owner_user_id = auth.uid()::text);

create policy "owner crud kpis" on public.kpis
  for all using (owner_user_id = auth.uid()::text)
  with check (owner_user_id = auth.uid()::text);

create policy "owner crud evidence" on public.evidence
  for all using (owner_user_id = auth.uid()::text)
  with check (owner_user_id = auth.uid()::text);

create policy "owner crud training" on public.training
  for all using (owner_user_id = auth.uid()::text)
  with check (owner_user_id = auth.uid()::text);

create policy "owner crud reports" on public.monthly_reports
  for all using (owner_user_id = auth.uid()::text)
  with check (owner_user_id = auth.uid()::text);

create policy "company shared templates" on public.report_templates
  for select using (
    company_id is null
    or company_id in (select company_id from public.users where id = auth.uid()::text)
  );

create policy "read asset types" on public.asset_definitions
  for select using (true);
