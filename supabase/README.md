# Supabase database

The live app still uses browser `localStorage`. This folder is the **database schema** for ICT RMS.

There is **no Supabase MCP** connected in Cursor for this repo, so the schema was generated from `src/types` (not from an existing cloud project).

## Create the database

1. Open [https://supabase.com](https://supabase.com) and create a project (for example `hesu-ict-rms`).
2. SQL Editor → New query.
3. Paste and run `migrations/20261029_init.sql`.
4. Storage: confirm buckets `evidence`, `training-docs`, and `report-templates`.
5. Upload `public/templates/ICT_Monthly_Report_2026.pptx` into bucket `report-templates` as `ICT_Monthly_Report_2026.pptx`.
6. Project Settings → API: copy URL and publishable key into `.env.local`.
7. Run `migrations/20261029_fix_rls_recursion.sql` (fixes users/companies/templates policy recursion).

```
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your_publishable_key
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

Never put the service role key in client code.

## What the schema stores

| Area | Tables | Isolation |
| --- | --- | --- |
| Company join | `companies`, `users`, `company_settings` | company |
| Master assets | `asset_definitions`, `asset_records` | company / owner |
| Daily work, tickets, projects, KPIs, evidence, training | matching tables | **per user** (`owner_user_id`) |
| Report templates | `report_templates` | **shared per company** |
| Monthly narratives | `monthly_reports` | per user |
| Files | Storage buckets, paths on rows | not in Postgres JSON |

Signed training documents belong in `training-docs`, not in a JSON column. That is what caused the `QuotaExceededError` in `localStorage`.

## Next step (app wiring)

After the SQL has run, send the project URL (and connect Supabase MCP if you have it). Then the app can be switched from `localStorage` to these tables.
