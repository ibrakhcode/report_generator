import { NextResponse } from 'next/server';
import { readRmsSession } from '@/lib/readRmsSession';
import { getSupabaseServerClient, isSupabaseServerConfigured } from '@/lib/supabase/server';

async function companyIdFor(userId: string, cookieCompanyId: string) {
  const supabase = getSupabaseServerClient();
  const { data } = await supabase.from('users').select('company_id').eq('id', userId).maybeSingle();
  return (data?.company_id as string) || cookieCompanyId || null;
}

export async function GET() {
  if (!isSupabaseServerConfigured()) {
    return NextResponse.json({ ok: false, error: 'Supabase is not configured.' }, { status: 503 });
  }
  const session = await readRmsSession();
  if (!session) return NextResponse.json({ ok: false, error: 'Not signed in.' }, { status: 401 });

  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from('report_library_folders')
    .select('*')
    .eq('owner_user_id', session.userId)
    .order('created_at', { ascending: true });
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

  let folders = data || [];
  if (folders.length === 0) {
    const companyId = await companyIdFor(session.userId, session.companyId);
    const row = {
      id: `FLD-${Date.now()}`,
      owner_user_id: session.userId,
      company_id: companyId,
      name: 'Monthly Reports'
    };
    const inserted = await supabase.from('report_library_folders').insert(row).select('*').single();
    if (inserted.error) return NextResponse.json({ ok: false, error: inserted.error.message }, { status: 500 });
    folders = [inserted.data];
  }

  return NextResponse.json({ ok: true, folders });
}

export async function POST(request: Request) {
  if (!isSupabaseServerConfigured()) {
    return NextResponse.json({ ok: false, error: 'Supabase is not configured.' }, { status: 503 });
  }
  const session = await readRmsSession();
  if (!session) return NextResponse.json({ ok: false, error: 'Not signed in.' }, { status: 401 });
  const body = (await request.json()) as { name?: string };
  const name = String(body.name || '').trim();
  if (!name) return NextResponse.json({ ok: false, error: 'Folder name is required.' }, { status: 400 });

  const supabase = getSupabaseServerClient();
  const companyId = await companyIdFor(session.userId, session.companyId);
  const row = {
    id: `FLD-${Date.now()}`,
    owner_user_id: session.userId,
    company_id: companyId,
    name
  };
  const { data, error } = await supabase.from('report_library_folders').insert(row).select('*').single();
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, folder: data });
}

export async function DELETE(request: Request) {
  if (!isSupabaseServerConfigured()) {
    return NextResponse.json({ ok: false, error: 'Supabase is not configured.' }, { status: 503 });
  }
  const session = await readRmsSession();
  if (!session) return NextResponse.json({ ok: false, error: 'Not signed in.' }, { status: 401 });
  const id = new URL(request.url).searchParams.get('id') || '';
  if (!id) return NextResponse.json({ ok: false, error: 'Folder id is required.' }, { status: 400 });

  const supabase = getSupabaseServerClient();
  const files = await supabase
    .from('report_library_files')
    .select('id, storage_path')
    .eq('folder_id', id)
    .eq('owner_user_id', session.userId);
  const paths = (files.data || []).map((row) => String(row.storage_path)).filter(Boolean);
  if (paths.length) await supabase.storage.from('report-library').remove(paths);
  await supabase.from('report_library_files').delete().eq('folder_id', id).eq('owner_user_id', session.userId);
  const { error } = await supabase
    .from('report_library_folders')
    .delete()
    .eq('id', id)
    .eq('owner_user_id', session.userId);
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
