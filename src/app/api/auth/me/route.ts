import { NextResponse } from 'next/server';
import { getSupabaseServerClient, isSupabaseServerConfigured } from '@/lib/supabase/server';
import { readRmsSession } from '@/lib/readRmsSession';
import { rowToUser } from '@/lib/supabase/rmsMap';
import { userSessionResponse } from '@/lib/serverPassword';

export async function GET() {
  if (!isSupabaseServerConfigured()) {
    return NextResponse.json({ ok: false, error: 'Supabase is not configured.' }, { status: 503 });
  }
  const session = await readRmsSession();
  if (!session) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase.from('users').select('*').eq('id', session.userId).maybeSingle();
  if (error || !data || data.active === false) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  const user = rowToUser(data as Record<string, unknown>);
  return userSessionResponse(user);
}
