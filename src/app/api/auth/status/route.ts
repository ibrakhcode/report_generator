import { NextResponse } from 'next/server';
import { getSupabaseServerClient, isSupabaseServerConfigured } from '@/lib/supabase/server';

export async function GET() {
  if (!isSupabaseServerConfigured()) {
    return NextResponse.json({ ok: false, hasUsers: false }, { status: 503 });
  }
  const supabase = getSupabaseServerClient();
  const { count, error } = await supabase.from('users').select('id', { count: 'exact', head: true });
  if (error) {
    return NextResponse.json({ ok: false, hasUsers: false, error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true, hasUsers: (count || 0) > 0 });
}
