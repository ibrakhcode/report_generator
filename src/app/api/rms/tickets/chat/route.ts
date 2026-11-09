import { NextResponse } from 'next/server';
import { readRmsSession } from '@/lib/readRmsSession';
import { listHelpdeskMessages, loadHelpdeskTicket, postHelpdeskMessage } from '@/lib/ticeketClient';
import { sendAppEmail } from '@/lib/mailer';
import { escapeHtml } from '@/lib/reportFeedbackText';

export async function GET(request: Request) {
  const session = await readRmsSession();
  if (!session) return NextResponse.json({ ok: false, error: 'Not signed in.' }, { status: 401 });
  const id = String(new URL(request.url).searchParams.get('id') || '');
  if (!id.startsWith('TCK-EXT-')) {
    return NextResponse.json({ ok: false, error: 'This is not a Help Desk ticket.' }, { status: 400 });
  }
  try {
    return NextResponse.json({ ok: true, messages: await listHelpdeskMessages(id) });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : 'Could not load chat.' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  const session = await readRmsSession();
  if (!session) return NextResponse.json({ ok: false, error: 'Not signed in.' }, { status: 401 });
  let body: { id?: string; message?: string } = {};
  try {
    body = (await request.json()) as { id?: string; message?: string };
  } catch {
    return NextResponse.json({ ok: false, error: 'JSON body is required.' }, { status: 400 });
  }
  const id = String(body.id || '');
  const message = String(body.message || '').trim();
  if (!id.startsWith('TCK-EXT-') || !message) {
    return NextResponse.json({ ok: false, error: 'Write a message first.' }, { status: 400 });
  }
  try {
    await postHelpdeskMessage(id, message);
    const { row, customer } = await loadHelpdeskTicket(id);
    const email = String(customer?.email || '').trim();
    let emailed = false;
    if (email) {
      const number = String(row.ticket_number || row.id);
      const helpdesk = (process.env.TICEKET_BASE_URL || 'https://ticeket.netlify.app').replace(/\/$/, '');
      const mailed = await sendAppEmail({
        to: email,
        subject: `Re: your ticket #${number} — ${String(row.subject || '')}`,
        text: `Ibrahim replied on your ticket #${number}:\n\n${message}\n\nReply on Help Desk: ${helpdesk}`,
        html: `<p>Ibrahim replied on your ticket <b>#${escapeHtml(number)}</b>:</p><p>${escapeHtml(message).replace(/\n/g, '<br/>')}</p><p><a href="${escapeHtml(helpdesk)}">Reply on Help Desk</a></p>`,
        session
      });
      emailed = mailed.ok;
    }
    return NextResponse.json({ ok: true, emailed, messages: await listHelpdeskMessages(id) });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : 'Could not send message.' },
      { status: 500 }
    );
  }
}
