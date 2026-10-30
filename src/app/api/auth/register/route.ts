import { NextResponse } from 'next/server';
import {
  ALL_MODULE_IDS,
  DEFAULT_ADMIN_EMAIL
} from '@/lib/authConstants';
import {
  hashPasswordServer,
  mkRecoveryCodeServer,
  userSessionResponse,
  validatePasswordServer
} from '@/lib/serverPassword';
import { getSupabaseServerClient, isSupabaseServerConfigured } from '@/lib/supabase/server';
import { userToRow } from '@/lib/supabase/rmsMap';
import type { User } from '@/types';

export async function POST(request: Request) {
  if (!isSupabaseServerConfigured()) {
    return NextResponse.json({ ok: false, error: 'Supabase is not configured.' }, { status: 503 });
  }
  const body = (await request.json()) as { fullName?: string; email?: string; password?: string };
  const fullName = String(body.fullName || '').trim();
  const email = String(body.email || '').trim().toLowerCase();
  const password = String(body.password || '');
  if (!fullName) {
    return NextResponse.json({ ok: false, error: 'Please enter your full name.' }, { status: 400 });
  }
  if (!email.includes('@')) {
    return NextResponse.json({ ok: false, error: 'Please enter a valid email address.' }, { status: 400 });
  }
  const pwErr = validatePasswordServer(password);
  if (pwErr) {
    return NextResponse.json({ ok: false, error: pwErr }, { status: 400 });
  }

  const supabase = getSupabaseServerClient();
  const existing = await supabase.from('users').select('id').eq('email', email).maybeSingle();
  if (existing.data) {
    return NextResponse.json(
      { ok: false, error: 'An account with this email address already exists. Please sign in.' },
      { status: 409 }
    );
  }
  const countRes = await supabase.from('users').select('id', { count: 'exact', head: true });
  const isFirst = (countRes.count || 0) === 0;
  const shouldBeAdmin = isFirst || email === DEFAULT_ADMIN_EMAIL.toLowerCase();
  const code = mkRecoveryCodeServer();
  const h = await hashPasswordServer(password);
  const r = await hashPasswordServer(code.replace(/-/g, ''));
  const user: User = {
    id: `USR-${Date.now()}`,
    email,
    fullName,
    role: shouldBeAdmin ? 'admin' : 'editor',
    title: shouldBeAdmin ? 'IT Administrator' : 'IT Specialist',
    department: 'Information Technology',
    salt: h.salt,
    hash: h.hash,
    rsalt: r.salt,
    rhash: r.hash,
    active: true,
    allowedModules: shouldBeAdmin ? ALL_MODULE_IDS : ['dashboard', 'activities', 'tickets'],
    mustChangePassword: false,
    createdAt: new Date().toISOString()
  };
  const { error } = await supabase.from('users').insert(userToRow(user));
  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
  return userSessionResponse(user, { recoveryCode: code });
}
