-- Custom app auth uses public.users (not auth.uid()).
-- API routes use the secret key. Disable RLS so login/seed can read and write users.

alter table public.companies disable row level security;
alter table public.users disable row level security;
alter table public.company_settings disable row level security;
alter table public.asset_definitions disable row level security;
alter table public.asset_records disable row level security;
alter table public.daily_activities disable row level security;
alter table public.tickets disable row level security;
alter table public.system_issues disable row level security;
alter table public.projects disable row level security;
alter table public.kpis disable row level security;
alter table public.evidence disable row level security;
alter table public.training disable row level security;
alter table public.report_templates disable row level security;
alter table public.monthly_reports disable row level security;
alter table public.audit_logs disable row level security;
