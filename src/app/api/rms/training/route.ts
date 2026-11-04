import { NextResponse } from 'next/server';
import { readRmsSession } from '@/lib/readRmsSession';
import { getSupabaseServerClient, isSupabaseServerConfigured } from '@/lib/supabase/server';
import { listCompanyTraining } from '@/lib/supabase/workspace';
import { isYearMonth } from '@/lib/selectedMonth';

export async function GET(request: Request) {
  const session = await readRmsSession();
  if (!isSupabaseServerConfigured()) {
    return NextResponse.json({ ok: false, error: 'Supabase is not configured.' }, { status: 503 });
  }
  if (!session) {
    return NextResponse.json({ ok: false, error: 'Not signed in.' }, { status: 401 });
  }
  const month = new URL(request.url).searchParams.get('month') || '';
  try {
    const training = await listCompanyTraining(
      getSupabaseServerClient(),
      session,
      isYearMonth(month) ? month : undefined
    );
    return NextResponse.json({ ok: true, training });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to read training.';
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
