import { NextResponse } from 'next/server';
import { readRmsSession } from '@/lib/readRmsSession';
import { getSupabaseServerClient, isSupabaseServerConfigured } from '@/lib/supabase/server';
import { pullRemoteTickets, upsertAssignedTickets } from '@/lib/externalTicketIngest';
import { rowToActivity, rowToTicket } from '@/lib/supabase/rmsMap';

export async function POST() {
  const session = await readRmsSession();
  if (!isSupabaseServerConfigured()) {
    return NextResponse.json({ ok: false, error: 'Supabase is not configured.' }, { status: 503 });
  }
  if (!session) {
    return NextResponse.json({ ok: false, error: 'Not signed in.' }, { status: 401 });
  }

  const supabase = getSupabaseServerClient();
  try {
    const remote = await pullRemoteTickets();
    let imported = 0;
    let skipped = 0;
    let tickets = [] as ReturnType<typeof rowToTicket>[];
    let activities = [] as ReturnType<typeof rowToActivity>[];
    if (remote != null) {
      const pulled = await upsertAssignedTickets(supabase, remote);
      imported = pulled.imported;
      skipped = pulled.skipped;
      tickets = pulled.tickets;
      activities = pulled.activities;
    }

    if (!tickets.length) {
      const [ticketsRes, activitiesRes] = await Promise.all([
        supabase.from('tickets').select('*').like('id', 'TCK-EXT-%'),
        supabase.from('daily_activities').select('*').like('id', 'ACT-EXT-%')
      ]);
      if (ticketsRes.error) throw new Error(ticketsRes.error.message);
      if (activitiesRes.error) throw new Error(activitiesRes.error.message);
      tickets = (ticketsRes.data || []).map((row) => rowToTicket(row as Record<string, unknown>));
      activities = (activitiesRes.data || []).map((row) => rowToActivity(row as Record<string, unknown>));
    }

    return NextResponse.json({
      ok: true,
      imported,
      skipped,
      pulledRemote: remote != null,
      tickets,
      activities
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to sync tickets.';
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
