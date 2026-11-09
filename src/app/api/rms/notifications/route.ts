import { NextResponse } from 'next/server';
import { readRmsSession } from '@/lib/readRmsSession';
import { getSupabaseServerClient, isSupabaseServerConfigured } from '@/lib/supabase/server';
import { rowToTicket } from '@/lib/supabase/rmsMap';
import { isAssignedToIbrahim, isUnassignedTicket, type NoticeKind } from '@/lib/assignedTickets';

export async function GET() {
  const session = await readRmsSession();
  if (!session) return NextResponse.json({ ok: false, error: 'Not signed in.' }, { status: 401 });
  if (!isSupabaseServerConfigured()) {
    return NextResponse.json({ ok: false, error: 'Supabase is not configured.' }, { status: 503 });
  }
  const supabase = getSupabaseServerClient();
  const [tickets, reads] = await Promise.all([
    supabase
      .from('tickets')
      .select('*')
      .eq('owner_user_id', session.userId)
      .not('status', 'in', '("Closed","Resolved")'),
    supabase.from('rms_notification_reads').select('item_key').eq('user_id', session.userId)
  ]);
  if (tickets.error) return NextResponse.json({ ok: false, error: tickets.error.message }, { status: 500 });
  if (reads.error) return NextResponse.json({ ok: false, error: reads.error.message }, { status: 500 });

  const read = new Set((reads.data || []).map((row) => String(row.item_key)));
  const unseen: Record<NoticeKind, string[]> = { assigned: [], unassigned: [], other: [] };
  for (const row of tickets.data || []) {
    const ticket = rowToTicket(row as Record<string, unknown>);
    const kind: NoticeKind | null = isAssignedToIbrahim(ticket)
      ? 'assigned'
      : isUnassignedTicket(ticket)
        ? ticket.status === 'Open'
          ? 'unassigned'
          : null
        : 'other';
    if (kind && !read.has(`ticket:${ticket.id}:${kind}`)) unseen[kind].push(ticket.id);
  }
  return NextResponse.json({ ok: true, unseen });
}

export async function POST(request: Request) {
  const session = await readRmsSession();
  if (!session) return NextResponse.json({ ok: false, error: 'Not signed in.' }, { status: 401 });
  if (!isSupabaseServerConfigured()) {
    return NextResponse.json({ ok: false, error: 'Supabase is not configured.' }, { status: 503 });
  }
  let body: { keys?: string[] } = {};
  try {
    body = (await request.json()) as { keys?: string[] };
  } catch {
    return NextResponse.json({ ok: false, error: 'JSON body is required.' }, { status: 400 });
  }
  const keys = Array.from(
    new Set((body.keys || []).map(String).filter((key) => key.startsWith('ticket:')))
  ).slice(0, 500);
  if (!keys.length) return NextResponse.json({ ok: true, saved: 0 });
  const readAt = new Date().toISOString();
  const write = await getSupabaseServerClient()
    .from('rms_notification_reads')
    .upsert(
      keys.map((item_key) => ({ user_id: session.userId, item_key, read_at: readAt })),
      { onConflict: 'user_id,item_key' }
    );
  if (write.error) return NextResponse.json({ ok: false, error: write.error.message }, { status: 500 });
  return NextResponse.json({ ok: true, saved: keys.length });
}
