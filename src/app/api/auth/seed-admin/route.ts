import { NextResponse } from 'next/server';
import { ensureDefaultAdmin } from '@/lib/ensureDefaultAdmin';
import { isSupabaseServerConfigured } from '@/lib/supabase/server';

export async function POST() {
  if (!isSupabaseServerConfigured()) {
    return NextResponse.json({ ok: false, error: 'Supabase is not configured.' }, { status: 503 });
  }
  try {
    const id = await ensureDefaultAdmin();
    return NextResponse.json({ ok: true, id });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Could not seed admin.';
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
