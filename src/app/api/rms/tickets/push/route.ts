import { NextResponse } from 'next/server';
import { readRmsSession } from '@/lib/readRmsSession';
import { pushHelpdeskTicketUpdate } from '@/lib/ticeketClient';

export async function POST(request: Request) {
  const session = await readRmsSession();
  if (!session) {
    return NextResponse.json({ ok: false, error: 'Not signed in.' }, { status: 401 });
  }

  let body: { id?: string; status?: string; assignedTechnician?: string } = {};
  try {
    body = (await request.json()) as { id?: string; status?: string; assignedTechnician?: string };
  } catch {
    return NextResponse.json({ ok: false, error: 'JSON body is required.' }, { status: 400 });
  }

  const id = String(body.id || '').trim();
  const status = String(body.status || '').trim();
  if (!id || !status) {
    return NextResponse.json({ ok: false, error: 'Ticket id and status are required.' }, { status: 400 });
  }

  try {
    const ticket = await pushHelpdeskTicketUpdate({
      rmsTicketId: id,
      status,
      assignedTechnician: body.assignedTechnician
    });
    return NextResponse.json({ ok: true, ticket });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Could not update Help Desk.';
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
