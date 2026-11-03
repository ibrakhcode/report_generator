import { NextResponse } from 'next/server';
import { getSupabaseServerClient, isSupabaseServerConfigured } from '@/lib/supabase/server';
import { upsertAssignedTickets } from '@/lib/externalTicketIngest';

function ingestSecret() {
  return (process.env.TICKET_INGEST_SECRET || '').trim();
}

function authorized(request: Request) {
  const secret = ingestSecret();
  if (!secret) return false;
  const header = request.headers.get('authorization') || '';
  const bearer = header.toLowerCase().startsWith('bearer ') ? header.slice(7).trim() : '';
  const xSecret = request.headers.get('x-ingest-secret') || '';
  return bearer === secret || xSecret === secret;
}

export async function POST(request: Request) {
  if (!isSupabaseServerConfigured()) {
    return NextResponse.json({ ok: false, error: 'Supabase is not configured.' }, { status: 503 });
  }
  if (!ingestSecret()) {
    return NextResponse.json({ ok: false, error: 'TICKET_INGEST_SECRET is not set.' }, { status: 503 });
  }
  if (!authorized(request)) {
    return NextResponse.json({ ok: false, error: 'Unauthorized.' }, { status: 401 });
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'JSON body is required.' }, { status: 400 });
  }

  try {
    const result = await upsertAssignedTickets(getSupabaseServerClient(), payload);
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to ingest tickets.';
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
