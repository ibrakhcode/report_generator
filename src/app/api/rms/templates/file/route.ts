import { NextResponse } from 'next/server';
import { readRmsSession } from '@/lib/readRmsSession';
import { getSupabaseServerClient, isSupabaseServerConfigured } from '@/lib/supabase/server';

const BUCKET = 'report-library';
const PPTX_TYPE = 'application/vnd.openxmlformats-officedocument.presentationml.presentation';

async function companyIdFor(userId: string, cookieCompanyId: string) {
  const supabase = getSupabaseServerClient();
  const { data } = await supabase.from('users').select('company_id').eq('id', userId).maybeSingle();
  return (data?.company_id as string) || cookieCompanyId || null;
}

function templateObjectPath(companyId: string | null, userId: string, templateId: string) {
  return `templates/${companyId || userId}/${templateId}.pptx`;
}

export async function GET(request: Request) {
  const session = await readRmsSession();
  if (!isSupabaseServerConfigured()) {
    return NextResponse.json({ ok: false, error: 'Supabase is not configured.' }, { status: 503 });
  }
  if (!session) return NextResponse.json({ ok: false, error: 'Not signed in.' }, { status: 401 });

  const templateId = new URL(request.url).searchParams.get('id') || '';
  if (!templateId) return NextResponse.json({ ok: false, error: 'Template id is required.' }, { status: 400 });

  const supabase = getSupabaseServerClient();
  const companyId = await companyIdFor(session.userId, session.companyId);
  const { data: tmpl } = await supabase
    .from('report_templates')
    .select('id, company_id, storage_path')
    .eq('id', templateId)
    .maybeSingle();

  if (tmpl?.company_id && companyId && tmpl.company_id !== companyId) {
    return NextResponse.json({ ok: false, error: 'Template not found.' }, { status: 404 });
  }

  const path = String(tmpl?.storage_path || templateObjectPath(companyId, session.userId, templateId));
  const down = await supabase.storage.from(BUCKET).download(path);
  if (down.error || !down.data) {
    return NextResponse.json({ ok: false, error: 'Template file not found.' }, { status: 404 });
  }
  const buf = Buffer.from(await down.data.arrayBuffer());
  return new NextResponse(buf, {
    headers: {
      'Content-Type': PPTX_TYPE,
      'Content-Disposition': `attachment; filename="${templateId}.pptx"`
    }
  });
}

export async function POST(request: Request) {
  const session = await readRmsSession();
  if (!isSupabaseServerConfigured()) {
    return NextResponse.json({ ok: false, error: 'Supabase is not configured.' }, { status: 503 });
  }
  if (!session) return NextResponse.json({ ok: false, error: 'Not signed in.' }, { status: 401 });

  const form = await request.formData();
  const templateId = String(form.get('templateId') || '');
  const file = form.get('file');
  if (!templateId || !(file instanceof File)) {
    return NextResponse.json({ ok: false, error: 'Template id and PPTX file are required.' }, { status: 400 });
  }
  if (!file.name.toLowerCase().endsWith('.pptx')) {
    return NextResponse.json({ ok: false, error: 'Upload a PowerPoint (.pptx) file.' }, { status: 400 });
  }
  if (file.size > 15 * 1024 * 1024) {
    return NextResponse.json({ ok: false, error: 'Template is larger than 15MB.' }, { status: 400 });
  }

  const supabase = getSupabaseServerClient();
  const companyId = await companyIdFor(session.userId, session.companyId);
  const path = templateObjectPath(companyId, session.userId, templateId);
  const bytes = Buffer.from(await file.arrayBuffer());
  const up = await supabase.storage.from(BUCKET).upload(path, bytes, {
    contentType: file.type || PPTX_TYPE,
    upsert: true
  });
  if (up.error) return NextResponse.json({ ok: false, error: up.error.message }, { status: 500 });

  await supabase
    .from('report_templates')
    .update({
      storage_path: path,
      has_uploaded_file: true,
      uploaded_template_name: file.name
    })
    .eq('id', templateId);

  return NextResponse.json({ ok: true, storagePath: path });
}

export async function DELETE(request: Request) {
  const session = await readRmsSession();
  if (!isSupabaseServerConfigured()) {
    return NextResponse.json({ ok: false, error: 'Supabase is not configured.' }, { status: 503 });
  }
  if (!session) return NextResponse.json({ ok: false, error: 'Not signed in.' }, { status: 401 });

  const templateId = new URL(request.url).searchParams.get('id') || '';
  if (!templateId) return NextResponse.json({ ok: false, error: 'Template id is required.' }, { status: 400 });

  const supabase = getSupabaseServerClient();
  const companyId = await companyIdFor(session.userId, session.companyId);
  const { data: tmpl } = await supabase
    .from('report_templates')
    .select('storage_path, company_id')
    .eq('id', templateId)
    .maybeSingle();

  if (tmpl?.company_id && companyId && tmpl.company_id !== companyId) {
    return NextResponse.json({ ok: false, error: 'Template not found.' }, { status: 404 });
  }

  const path = String(tmpl?.storage_path || templateObjectPath(companyId, session.userId, templateId));
  await supabase.storage.from(BUCKET).remove([path]);
  await supabase.from('report_templates').update({ storage_path: '', has_uploaded_file: false }).eq('id', templateId);
  return NextResponse.json({ ok: true });
}
