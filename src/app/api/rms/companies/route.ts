import { NextResponse } from 'next/server';
import { type DirectoryCompany, normalizeCompanyName } from '@/lib/companyName';
import { readRmsSession } from '@/lib/readRmsSession';
import { getSupabaseServerClient, isSupabaseServerConfigured } from '@/lib/supabase/server';

function rowToDirectory(
  company: Record<string, unknown>,
  settings: Record<string, unknown> | undefined
): DirectoryCompany {
  const emailService = (settings?.email_service || {}) as { fromEmail?: string };
  return {
    id: String(company.id || ''),
    name: String(company.name || ''),
    shortCode: String(company.short_code || ''),
    headquarters: String(company.headquarters || ''),
    department: String(settings?.department || ''),
    businessTimezone: String(settings?.business_timezone || 'Africa/Dar_es_Salaam'),
    ticketDefaultSlaHours: Number(settings?.ticket_default_sla_hours || 8),
    supportEmail: String(emailService.fromEmail || '')
  };
}

export async function GET(request: Request) {
  if (!isSupabaseServerConfigured()) {
    return NextResponse.json({ ok: false, error: 'Supabase is not configured.' }, { status: 503 });
  }
  const session = await readRmsSession();
  if (!session) {
    return NextResponse.json({ ok: false, error: 'Not signed in.' }, { status: 401 });
  }

  const query = new URL(request.url).searchParams.get('q') || '';
  const supabase = getSupabaseServerClient();
  const [companiesRes, settingsRes] = await Promise.all([
    supabase.from('companies').select('*').order('name'),
    supabase.from('company_settings').select('*')
  ]);
  if (companiesRes.error) {
    return NextResponse.json({ ok: false, error: companiesRes.error.message }, { status: 500 });
  }

  const settingsById = new Map(
    (settingsRes.data || []).map((row) => [String(row.company_id), row as Record<string, unknown>])
  );
  const companies = (companiesRes.data || []).map((row) =>
    rowToDirectory(row as Record<string, unknown>, settingsById.get(String(row.id)))
  );
  const needle = normalizeCompanyName(query);
  const suggestions = needle
    ? companies.filter((item) => {
        const hay = normalizeCompanyName(`${item.name} ${item.shortCode}`);
        return hay === needle || hay.includes(needle) || needle.includes(hay);
      })
    : [];

  return NextResponse.json({ ok: true, companies, suggestions });
}
