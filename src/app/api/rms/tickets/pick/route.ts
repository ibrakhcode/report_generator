import { NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { upsertAssignedTickets } from '@/lib/externalTicketIngest';
import { claimHelpdeskTicket, loadHelpdeskTicket } from '@/lib/ticeketClient';
import { readPickToken } from '@/lib/ticketPickLink';
import { notifyRequesterPicked, trackedOwnerSession } from '@/lib/ticketAlerts';
import { escapeHtml } from '@/lib/reportFeedbackText';

function page(title: string, body: string, status = 200) {
  const html = `<!doctype html><html><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><title>${escapeHtml(title)}</title></head>
  <body style="margin:0;background:#0f172a;font-family:Arial,sans-serif;display:flex;min-height:100vh;align-items:center;justify-content:center;padding:16px">
  <div style="max-width:480px;width:100%;background:#1e293b;border:1px solid #334155;border-radius:16px;padding:24px;color:#e2e8f0;line-height:1.6">
  <p style="margin:0;color:#2dd4bf;font-size:12px;font-weight:bold;text-transform:uppercase">HESU ICT Help Desk</p>
  <h1 style="margin:6px 0 16px;font-size:20px;color:#fff">${escapeHtml(title)}</h1>${body}</div></body></html>`;
  return new NextResponse(html, { status, headers: { 'Content-Type': 'text/html; charset=utf-8' } });
}

const EXPIRED = '<p>This pick link is not valid or has expired. Open RMS to pick the ticket.</p>';

export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get('token') || '';
  const pick = readPickToken(token);
  if (!pick) return page('Link expired', EXPIRED, 400);
  try {
    const { row, customer, agent, ibrahim } = await loadHelpdeskTicket(pick.id);
    const details = `<p style="margin:0 0 4px;font-weight:bold;color:#fff">#${escapeHtml(String(row.ticket_number || ''))} — ${escapeHtml(String(row.subject || ''))}</p>
      <p style="margin:0 0 4px">From: ${escapeHtml(String(customer?.full_name || customer?.username || 'Help Desk user'))}</p>
      <p style="margin:0 0 12px">Priority: ${escapeHtml(String(row.priority || ''))}</p>
      <p style="margin:0 0 20px;white-space:pre-wrap;color:#cbd5e1">${escapeHtml(String(row.description || ''))}</p>`;
    if (ibrahim) return page('Already yours', `${details}<p style="color:#2dd4bf">This ticket is already assigned to you.</p>`);
    if (row.agent_id) {
      const name = String(agent?.full_name || agent?.username || 'another agent');
      return page('Already picked', `${details}<p style="color:#fbbf24">Already picked by ${escapeHtml(name)}.</p>`);
    }
    return page(
      'Pick this ticket?',
      `${details}
      <form method="post"><input type="hidden" name="token" value="${escapeHtml(token)}"/>
      <button type="submit" style="width:100%;padding:14px;border:0;border-radius:10px;background:#0d9488;color:#fff;font-size:16px;font-weight:bold;cursor:pointer">Pick this ticket</button></form>`
    );
  } catch (error) {
    return page('Could not open ticket', `<p>${escapeHtml(error instanceof Error ? error.message : 'Try again from RMS.')}</p>`, 500);
  }
}

export async function POST(request: Request) {
  const form = await request.formData().catch(() => null);
  const token = String(form?.get('token') || '');
  const pick = readPickToken(token);
  if (!pick) return page('Link expired', EXPIRED, 400);
  try {
    const supabase = getSupabaseServerClient();
    const claimed = await claimHelpdeskTicket(pick.id);
    await upsertAssignedTickets(supabase, { tickets: [claimed] });
    const session = await trackedOwnerSession(supabase);
    const notified = await notifyRequesterPicked({ rmsTicketId: pick.id, session }).catch(() => null);
    const who = String(claimed.requesterName || 'The user');
    const sent = notified?.mail.ok ? `${escapeHtml(who)} has been notified by email` : 'The email to the user could not be sent';
    const chat = notified?.chat.ok ? ' and on the Help Desk chat.' : '.';
    return page(
      `Ticket #${String(claimed.ticket_number || '')} is yours`,
      `<p>${sent}${chat}</p><p style="color:#94a3b8">It is now in RMS under Assigned to you.</p>`
    );
  } catch (error) {
    return page('Could not pick ticket', `<p>${escapeHtml(error instanceof Error ? error.message : 'Try again from RMS.')}</p>`, 409);
  }
}
