import { NextResponse } from 'next/server';
import { readRmsSession } from '@/lib/readRmsSession';
import { verifyPasswordServer } from '@/lib/serverPassword';
import { getSupabaseServerClient, isSupabaseServerConfigured } from '@/lib/supabase/server';

export async function POST(request: Request) {
  if (!isSupabaseServerConfigured()) {
    return NextResponse.json({ ok: false, error: 'Supabase is not configured.' }, { status: 503 });
  }
  const session = await readRmsSession();
  if (!session) {
    return NextResponse.json({ ok: false, error: 'No session to unlock.' }, { status: 401 });
  }
  const body = (await request.json()) as { password?: string };
  const supabase = getSupabaseServerClient();
  const { data } = await supabase.from('users').select('salt, hash').eq('id', session.userId).maybeSingle();
  const ok = await verifyPasswordServer(String(body.password || ''), String(data?.salt || ''), String(data?.hash || ''));
  if (!ok) {
    return NextResponse.json({ ok: false, error: 'Incorrect password.' }, { status: 401 });
  }
  return NextResponse.json({ ok: true });
}
