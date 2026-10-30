import { NextResponse } from 'next/server';
import { readRmsSession } from '@/lib/readRmsSession';
import { getSupabaseServerClient, isSupabaseServerConfigured } from '@/lib/supabase/server';

async function companyIdFor(userId: string, cookieCompanyId: string) {
  const supabase = getSupabaseServerClient();
  const { data } = await supabase.from('users').select('company_id').eq('id', userId).maybeSingle();
  return (data?.company_id as string) || cookieCompanyId || null;
}

export async function GET(request: Request) {
  if (!isSupabaseServerConfigured()) {
    return NextResponse.json({ ok: false, error: 'Supabase is not configured.' }, { status: 503 });
  }
  const session = await readRmsSession();
  if (!session) return NextResponse.json({ ok: false, error: 'Not signed in.' }, { status: 401 });

  const url = new URL(request.url);
  const folderId = url.searchParams.get('folderId') || '';
  const q = (url.searchParams.get('q') || '').trim();
  const fileId = url.searchParams.get('id') || '';
  const supabase = getSupabaseServerClient();

  if (fileId) {
    const { data, error } = await supabase
      .from('report_library_files')
      .select('*')
      .eq('id', fileId)
      .eq('owner_user_id', session.userId)
      .maybeSingle();
    if (error || !data) return NextResponse.json({ ok: false, error: 'File not found.' }, { status: 404 });
    const signed = await supabase.storage.from('report-library').createSignedUrl(String(data.storage_path), 3600);
    return NextResponse.json({ ok: true, file: data, url: signed.data?.signedUrl || '' });
  }

  if (!folderId) return NextResponse.json({ ok: false, error: 'folderId is required.' }, { status: 400 });

  let query = supabase
    .from('report_library_files')
    .select('*')
    .eq('owner_user_id', session.userId)
    .eq('folder_id', folderId)
    .order('uploaded_at', { ascending: false });
  if (q) query = query.ilike('file_name', `%${q}%`);
  const { data, error } = await query;
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, files: data || [] });
}

export async function POST(request: Request) {
  if (!isSupabaseServerConfigured()) {
    return NextResponse.json({ ok: false, error: 'Supabase is not configured.' }, { status: 503 });
  }
  const session = await readRmsSession();
  if (!session) return NextResponse.json({ ok: false, error: 'Not signed in.' }, { status: 401 });

  const form = await request.formData();
  const folderId = String(form.get('folderId') || '');
  const description = String(form.get('description') || '');
  const file = form.get('file');
  if (!folderId || !(file instanceof File)) {
    return NextResponse.json({ ok: false, error: 'Folder and file are required.' }, { status: 400 });
  }
  if (file.size > 25 * 1024 * 1024) {
    return NextResponse.json({ ok: false, error: 'File is larger than 25 MB.' }, { status: 400 });
  }

  const supabase = getSupabaseServerClient();
  const folder = await supabase
    .from('report_library_folders')
    .select('id')
    .eq('id', folderId)
    .eq('owner_user_id', session.userId)
    .maybeSingle();
  if (!folder.data) return NextResponse.json({ ok: false, error: 'Folder not found.' }, { status: 404 });

  const id = `RPTF-${Date.now()}`;
  const safeName = file.name.replace(/[^\w.\- ()]/g, '_');
  const path = `${session.userId}/${folderId}/${id}-${safeName}`;
  const bytes = Buffer.from(await file.arrayBuffer());
  const up = await supabase.storage.from('report-library').upload(path, bytes, {
    contentType: file.type || 'application/octet-stream',
    upsert: false
  });
  if (up.error) return NextResponse.json({ ok: false, error: up.error.message }, { status: 500 });

  const companyId = await companyIdFor(session.userId, session.companyId);
  const row = {
    id,
    folder_id: folderId,
    owner_user_id: session.userId,
    company_id: companyId,
    file_name: file.name,
    file_size: file.size,
    file_type: file.type || 'application/octet-stream',
    storage_path: path,
    description
  };
  const { data, error } = await supabase.from('report_library_files').insert(row).select('*').single();
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, file: data });
}

export async function DELETE(request: Request) {
  if (!isSupabaseServerConfigured()) {
    return NextResponse.json({ ok: false, error: 'Supabase is not configured.' }, { status: 503 });
  }
  const session = await readRmsSession();
  if (!session) return NextResponse.json({ ok: false, error: 'Not signed in.' }, { status: 401 });
  const id = new URL(request.url).searchParams.get('id') || '';
  if (!id) return NextResponse.json({ ok: false, error: 'File id is required.' }, { status: 400 });

  const supabase = getSupabaseServerClient();
  const { data } = await supabase
    .from('report_library_files')
    .select('storage_path')
    .eq('id', id)
    .eq('owner_user_id', session.userId)
    .maybeSingle();
  if (data?.storage_path) {
    await supabase.storage.from('report-library').remove([String(data.storage_path)]);
  }
  const { error } = await supabase
    .from('report_library_files')
    .delete()
    .eq('id', id)
    .eq('owner_user_id', session.userId);
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
