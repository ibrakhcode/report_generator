import { NextResponse } from 'next/server';
import { readRmsSession } from '@/lib/readRmsSession';
import { getSupabaseServerClient, isSupabaseServerConfigured } from '@/lib/supabase/server';
import {
  DEFAULT_TICKET_ASSIGNEE_NAME,
  activityForExternalTicket,
  upsertAssignedTickets
} from '@/lib/externalTicketIngest';
import { claimHelpdeskTicket } from '@/lib/ticeketClient';
import { notifyRequesterPicked } from '@/lib/ticketAlerts';
import { activityToRow, rowToTicket, ticketToRow } from '@/lib/supabase/rmsMap';

export async function POST(request: Request) {
  const session = await readRmsSession();
  if (!isSupabaseServerConfigured()) {
    return NextResponse.json({ ok: false, error: 'Supabase is not configured.' }, { status: 503 });
  }
  if (!session) {
    return NextResponse.json({ ok: false, error: 'Not signed in.' }, { status: 401 });
  }

  let body: { id?: string } = {};
  try {
    body = (await request.json()) as { id?: string };
  } catch {
    return NextResponse.json({ ok: false, error: 'JSON body is required.' }, { status: 400 });
  }

  const id = String(body.id || '').trim();
  if (!id) {
    return NextResponse.json({ ok: false, error: 'Ticket id is required.' }, { status: 400 });
  }

  try {
    const supabase = getSupabaseServerClient();
    if (id.startsWith('TCK-EXT-')) {
      const claimed = await claimHelpdeskTicket(id);
      const pulled = await upsertAssignedTickets(supabase, { tickets: [claimed] });
      const notified = await notifyRequesterPicked({ rmsTicketId: id, session }).catch(() => null);
      return NextResponse.json({ ok: true, ...pulled, notified });
    }

    const existing = await supabase
      .from('tickets')
      .select('*')
      .eq('id', id)
      .eq('owner_user_id', session.userId)
      .limit(1);
    if (existing.error) throw new Error(existing.error.message);
    const row = existing.data?.[0];
    if (!row) throw new Error('Ticket was not found.');
    const ticket = rowToTicket(row as Record<string, unknown>);
    ticket.assignedTechnician = DEFAULT_TICKET_ASSIGNEE_NAME;
    ticket.updatedAt = new Date().toISOString();
    ticket.actionsTaken = ticket.actionsTaken || 'Picked from the unassigned queue.';
    const companyId = (row.company_id as string) || null;
    const write = await supabase
      .from('tickets')
      .upsert(ticketToRow(ticket, session.userId, companyId), { onConflict: 'id' });
    if (write.error) throw new Error(write.error.message);
    const activity = activityForExternalTicket(ticket);
    const activityWrite = await supabase
      .from('daily_activities')
      .upsert(activityToRow(activity, session.userId, companyId), { onConflict: 'id' });
    if (activityWrite.error) throw new Error(activityWrite.error.message);
    return NextResponse.json({ ok: true, imported: 1, skipped: 0, tickets: [ticket], activities: [activity] });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Could not pick this ticket.';
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
