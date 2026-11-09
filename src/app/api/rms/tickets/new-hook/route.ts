import { NextResponse } from 'next/server';
import { getSupabaseServerClient, isSupabaseServerConfigured } from '@/lib/supabase/server';
import { mapExternalTicket, upsertAssignedTickets } from '@/lib/externalTicketIngest';
import { loadHelpdeskTicket } from '@/lib/ticeketClient';
import { signPickToken } from '@/lib/ticketPickLink';
import { alertNewTicket, trackedOwnerSession } from '@/lib/ticketAlerts';

function authorized(request: Request) {
  const secret = (process.env.TICKET_INGEST_SECRET || '').trim();
  if (!secret) return false;
  const header = request.headers.get('authorization') || '';
  const bearer = header.toLowerCase().startsWith('bearer ') ? header.slice(7).trim() : '';
  return bearer === secret || (request.headers.get('x-ingest-secret') || '') === secret;
}

export async function POST(request: Request) {
  if (!isSupabaseServerConfigured()) {
    return NextResponse.json({ ok: false, error: 'Supabase is not configured.' }, { status: 503 });
  }
  if (!authorized(request)) return NextResponse.json({ ok: false, error: 'Unauthorized.' }, { status: 401 });

  let payload: { type?: string; record?: Record<string, unknown> } = {};
  try {
    payload = (await request.json()) as { type?: string; record?: Record<string, unknown> };
  } catch {
    return NextResponse.json({ ok: false, error: 'JSON body is required.' }, { status: 400 });
  }
  if (payload.type !== 'INSERT' || !payload.record?.id) {
    return NextResponse.json({ ok: true, skipped: true });
  }

  try {
    const supabase = getSupabaseServerClient();
    const { row, customer, mapped } = await loadHelpdeskTicket(String(payload.record.id));
    await upsertAssignedTickets(supabase, { tickets: [mapped] });
    const rmsTicketId = mapExternalTicket(mapped)?.id || `TCK-EXT-${String(row.ticket_number || row.id)}`;
    const origin = new URL(request.url).origin;
    const pickUrl = `${origin}/api/rms/tickets/pick?token=${encodeURIComponent(signPickToken(rmsTicketId))}`;
    const session = await trackedOwnerSession(supabase);
    const result = await alertNewTicket({ row, customer, pickUrl, session });
    return NextResponse.json({ ok: true, ticket: rmsTicketId, ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'New ticket alert failed.';
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
