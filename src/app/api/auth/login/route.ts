import { NextResponse } from 'next/server';
import { DEFAULT_ADMIN_EMAIL } from '@/lib/authConstants';
import { ensureDefaultAdmin } from '@/lib/ensureDefaultAdmin';
import { userSessionResponse, verifyPasswordServer } from '@/lib/serverPassword';
import { getSupabaseServerClient, isSupabaseServerConfigured } from '@/lib/supabase/server';
import { rowToUser } from '@/lib/supabase/rmsMap';

export async function POST(request: Request) {
  if (!isSupabaseServerConfigured()) {
    return NextResponse.json({ ok: false, error: 'Supabase is not configured.' }, { status: 503 });
  }
  const body = (await request.json()) as { email?: string; password?: string };
  const email = String(body.email || '').trim().toLowerCase();
  const password = String(body.password || '');
  if (!email || !password) {
    return NextResponse.json({ ok: false, error: 'Email and password are required.' }, { status: 400 });
  }

  const supabase = getSupabaseServerClient();
  if (email === DEFAULT_ADMIN_EMAIL.toLowerCase()) {
    try {
      await ensureDefaultAdmin();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Could not create the admin account.';
      return NextResponse.json({ ok: false, error: message }, { status: 500 });
    }
  }

  const { data, error } = await supabase.from('users').select('*').eq('email', email).maybeSingle();
  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ ok: false, error: 'Account not found. Please register or check your email.' }, { status: 401 });
  }
  if (data.active === false) {
    return NextResponse.json({ ok: false, error: 'This account has been deactivated. Please contact support.' }, { status: 403 });
  }
  const ok = await verifyPasswordServer(password, String(data.salt || ''), String(data.hash || ''));
  if (!ok) {
    return NextResponse.json({ ok: false, error: 'Incorrect email or password.' }, { status: 401 });
  }

  const user = rowToUser(data as Record<string, unknown>);
  await supabase.from('users').update({ last_login: new Date().toISOString() }).eq('id', user.id);
  return userSessionResponse(user);
}
