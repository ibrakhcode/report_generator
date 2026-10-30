import { NextResponse } from 'next/server';
import {
  hashPasswordServer,
  mkRecoveryCodeServer,
  validatePasswordServer,
  verifyPasswordServer
} from '@/lib/serverPassword';
import { getSupabaseServerClient, isSupabaseServerConfigured } from '@/lib/supabase/server';
import { rowToUser } from '@/lib/supabase/rmsMap';

export async function POST(request: Request) {
  if (!isSupabaseServerConfigured()) {
    return NextResponse.json({ ok: false, error: 'Supabase is not configured.' }, { status: 503 });
  }
  const body = (await request.json()) as { email?: string; recoveryCode?: string; newPassword?: string };
  const email = String(body.email || '').trim().toLowerCase();
  const cleanCode = String(body.recoveryCode || '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '');
  const pwErr = validatePasswordServer(String(body.newPassword || ''));
  if (pwErr) {
    return NextResponse.json({ ok: false, error: pwErr }, { status: 400 });
  }
  const supabase = getSupabaseServerClient();
  const { data } = await supabase.from('users').select('*').eq('email', email).maybeSingle();
  if (!data?.rsalt || !data?.rhash) {
    return NextResponse.json(
      { ok: false, error: 'Details did not match. Please verify your email and recovery code.' },
      { status: 401 }
    );
  }
  const ok = await verifyPasswordServer(cleanCode, String(data.rsalt), String(data.rhash));
  if (!ok) {
    return NextResponse.json({ ok: false, error: 'Invalid recovery code.' }, { status: 401 });
  }
  const newCode = mkRecoveryCodeServer();
  const h = await hashPasswordServer(String(body.newPassword));
  const r = await hashPasswordServer(newCode.replace(/-/g, ''));
  const upd = await supabase
    .from('users')
    .update({
      salt: h.salt,
      hash: h.hash,
      rsalt: r.salt,
      rhash: r.hash,
      must_change_password: false
    })
    .eq('id', data.id);
  if (upd.error) {
    return NextResponse.json({ ok: false, error: upd.error.message }, { status: 500 });
  }
  return NextResponse.json({
    ok: true,
    newRecoveryCode: newCode,
    user: rowToUser({ ...data, salt: h.salt, hash: h.hash, rsalt: r.salt, rhash: r.hash })
  });
}
