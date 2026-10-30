import { NextResponse } from 'next/server';
import { readRmsSession } from '@/lib/readRmsSession';
import { getSupabaseServerClient, isSupabaseServerConfigured } from '@/lib/supabase/server';
import { readWorkspace, writeCollection } from '@/lib/supabase/workspace';
import type { RmsCollection } from '@/lib/supabase/rmsMap';

const COLLECTIONS: RmsCollection[] = [
  'activities',
  'tickets',
  'sapIssues',
  'projects',
  'kpis',
  'evidence',
  'training',
  'reports',
  'templates',
  'settings',
  'users',
  'audit',
  'assetDefinitions',
  'assetRecords'
];

export async function GET() {
  if (!isSupabaseServerConfigured()) {
    return NextResponse.json({ ok: false, error: 'Supabase is not configured.' }, { status: 503 });
  }
  const session = await readRmsSession();
  if (!session) {
    return NextResponse.json({ ok: false, error: 'Not signed in.' }, { status: 401 });
  }
  try {
    const data = await readWorkspace(getSupabaseServerClient(), session);
    return NextResponse.json({ ok: true, data });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to read workspace.';
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  if (!isSupabaseServerConfigured()) {
    return NextResponse.json({ ok: false, error: 'Supabase is not configured.' }, { status: 503 });
  }
  const session = await readRmsSession();
  if (!session) {
    return NextResponse.json({ ok: false, error: 'Not signed in.' }, { status: 401 });
  }
  const body = (await request.json()) as { collection?: RmsCollection; items?: unknown };
  if (!body.collection || !COLLECTIONS.includes(body.collection)) {
    return NextResponse.json({ ok: false, error: 'Unknown collection.' }, { status: 400 });
  }
  try {
    await writeCollection(getSupabaseServerClient(), session, body.collection, body.items);
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to save workspace.';
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
