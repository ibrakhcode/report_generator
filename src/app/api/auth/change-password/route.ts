import { NextResponse } from 'next/server';
import { readRmsSession } from '@/lib/readRmsSession';
import { hashPasswordServer, validatePasswordServer, verifyPasswordServer } from '@/lib/serverPassword';
import { getSupabaseServerClient, isSupabaseServerConfigured } from '@/lib/supabase/server';
import { rowToUser } from '@/lib/supabase/rmsMap';

export async function POST(request: Request) {
  if (!isSupabaseServerConfigured()) {
    return NextResponse.json({ ok: false, error: 'Supabase is not configured.' }, { status: 503 });
  }
  const session = await readRmsSession();
  if (!session) {
    return NextResponse.json({ ok: false, error: 'Sign in first.' }, { status: 401 });
  }
  const body = (await request.json()) as { currentPassword?: string; nextPassword?: string };
  const pwErr = validatePasswordServer(String(body.nextPassword || ''));
  if (pwErr) {
    return NextResponse.json({ ok: false, error: pwErr }, { status: 400 });
  }
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase.from('users').select('*').eq('id', session.userId).maybeSingle();
  if (error || !data) {
    return NextResponse.json({ ok: false, error: 'Sign in first.' }, { status: 401 });
  }
  const ok = await verifyPasswordServer(String(body.currentPassword || ''), String(data.salt || ''), String(data.hash || ''));
  if (!ok) {
    return NextResponse.json({ ok: false, error: 'Current password is incorrect.' }, { status: 401 });
  }
  const h = await hashPasswordServer(String(body.nextPassword));
  const upd = await supabase
    .from('users')
    .update({ salt: h.salt, hash: h.hash, must_change_password: false })
    .eq('id', session.userId);
  if (upd.error) {
    return NextResponse.json({ ok: false, error: upd.error.message }, { status: 500 });
  }
  const user = rowToUser({ ...data, salt: h.salt, hash: h.hash, must_change_password: false });
  return NextResponse.json({ ok: true, user });
}
