import type { SupabaseClient } from '@supabase/supabase-js';
import { sendAppEmail } from '@/lib/mailer';
import { DEFAULT_TICKET_ASSIGNEE_EMAIL } from '@/lib/externalTicketIngest';
import { escapeHtml } from '@/lib/reportFeedbackText';
import { loadHelpdeskTicket, postHelpdeskMessage } from '@/lib/ticeketClient';
import type { RmsSession } from '@/lib/rmsSession';

type Json = Record<string, unknown>;

export const PICKED_MESSAGE =
  'This ticket is picked up by Ibrahim Assistant Agent. He is now with your ticket. Thank you, we have received your ticket. He will either come or call you soon.';

function alertEmail() {
  return (process.env.TICKET_INGEST_ASSIGNEE_EMAIL || DEFAULT_TICKET_ASSIGNEE_EMAIL).trim();
}

export async function trackedOwnerSession(supabase: SupabaseClient): Promise<RmsSession | null> {
  const found = await supabase.from('users').select('id, email, company_id').ilike('email', alertEmail()).limit(1);
  const row = found.data?.[0];
  if (!row?.id) return null;
  return { userId: String(row.id), email: String(row.email || ''), companyId: String(row.company_id || '') };
}

export async function sendWhatsAppAlert(text: string) {
  const phone = (process.env.WHATSAPP_NOTIFY_PHONE || '').trim();
  const apikey = (process.env.CALLMEBOT_APIKEY || '').trim();
  if (!phone || !apikey) return { ok: false, error: 'WhatsApp alert is not configured.' };
  const url = `https://api.callmebot.com/whatsapp.php?phone=${encodeURIComponent(phone)}&text=${encodeURIComponent(text)}&apikey=${encodeURIComponent(apikey)}`;
  const response = await fetch(url, { cache: 'no-store' });
  return response.ok ? { ok: true } : { ok: false, error: `CallMeBot returned ${response.status}.` };
}

function card(inner: string) {
  return `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden">${inner}</div>`;
}

export async function alertNewTicket(input: { row: Json; customer?: Json; pickUrl: string; session: RmsSession | null }) {
  const number = String(input.row.ticket_number || input.row.id);
  const subject = String(input.row.subject || 'New ticket');
  const who = String(input.customer?.full_name || input.customer?.username || 'Help Desk user');
  const priority = String(input.row.priority || 'normal');
  const description = String(input.row.description || '');
  const html = card(`
    <div style="background:#0f766e;color:#fff;padding:16px 20px;font-size:18px;font-weight:bold">New Help Desk ticket #${escapeHtml(number)}</div>
    <div style="padding:20px;color:#0f172a;line-height:1.6">
      <p style="margin:0 0 8px;font-size:16px;font-weight:bold">${escapeHtml(subject)}</p>
      <p style="margin:0 0 4px"><b>From:</b> ${escapeHtml(who)}</p>
      <p style="margin:0 0 12px"><b>Priority:</b> ${escapeHtml(priority)}</p>
      <p style="margin:0 0 20px;white-space:pre-wrap">${escapeHtml(description)}</p>
      <a href="${escapeHtml(input.pickUrl)}" style="display:inline-block;background:#0f766e;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold">Pick this ticket</a>
    </div>`);
  const [mail, whatsapp] = await Promise.all([
    sendAppEmail({
      to: alertEmail(),
      subject: `New ticket #${number} — ${subject}`,
      text: `New Help Desk ticket #${number}\n${subject}\nFrom: ${who}\nPriority: ${priority}\n\n${description}\n\nPick this ticket: ${input.pickUrl}`,
      html,
      session: input.session
    }),
    sendWhatsAppAlert(`New Help Desk ticket #${number}\n${subject}\nFrom: ${who}\nPriority: ${priority}\n\nPick: ${input.pickUrl}`)
  ]);
  return { mail, whatsapp };
}

export async function notifyRequesterPicked(input: { rmsTicketId: string; session: RmsSession | null }) {
  const { row, customer } = await loadHelpdeskTicket(input.rmsTicketId);
  const chat = await postHelpdeskMessage(input.rmsTicketId, PICKED_MESSAGE).then(
    () => ({ ok: true }),
    (error: unknown) => ({ ok: false, error: error instanceof Error ? error.message : 'Chat message failed.' })
  );
  const email = String(customer?.email || '').trim();
  if (!email) return { chat, mail: { ok: false, error: 'The requester has no email in Help Desk.' } };
  const number = String(row.ticket_number || row.id);
  const name = String(customer?.full_name || customer?.username || '');
  const html = card(`
    <div style="background:linear-gradient(90deg,#0f766e,#0e7490);color:#fff;padding:24px 20px">
      <p style="margin:0;font-size:13px;opacity:.85">Ticket #${escapeHtml(number)}</p>
      <p style="margin:6px 0 0;font-size:22px;font-weight:bold">Your ticket is assigned to Ibrahim</p>
    </div>
    <div style="padding:20px;color:#0f172a;line-height:1.6">
      <p>${name ? `Dear ${escapeHtml(name)},` : 'Hello,'}</p>
      <p>${escapeHtml(PICKED_MESSAGE)}</p>
      <p style="margin:16px 0 0;padding:12px;background:#f1f5f9;border-radius:8px"><b>${escapeHtml(String(row.subject || ''))}</b></p>
      <p style="margin-top:20px">Thank you for your patience.<br/>HESU ICT Help Desk</p>
    </div>`);
  const mail = await sendAppEmail({
    to: email,
    subject: `Your ticket #${number} is assigned to Ibrahim`,
    text: `${name ? `Dear ${name},\n\n` : ''}${PICKED_MESSAGE}\n\nTicket #${number}: ${String(row.subject || '')}\n\nThank you for your patience.\nHESU ICT Help Desk`,
    html,
    session: input.session
  });
  return { chat, mail };
}

export function closedMessage(number: string) {
  return `Ticket number TKT-${number} has been closed by Ibrahim Assistant Agent.`;
}

export async function notifyRequesterClosed(input: { rmsTicketId: string; session: RmsSession | null }) {
  const { row, customer } = await loadHelpdeskTicket(input.rmsTicketId);
  const number = String(row.ticket_number || row.id);
  const message = closedMessage(number);
  const chat = await postHelpdeskMessage(input.rmsTicketId, message).then(
    () => ({ ok: true }),
    (error: unknown) => ({ ok: false, error: error instanceof Error ? error.message : 'Chat message failed.' })
  );
  const requester = String(customer?.email || '').trim();
  const mail = await sendAppEmail({
    to: requester || alertEmail(),
    cc: requester ? [alertEmail()] : undefined,
    subject: `Ticket TKT-${number} has been closed`,
    text: message,
    html: `<p style="font-family:Arial,sans-serif;font-size:15px">${escapeHtml(message)}</p>`,
    session: input.session
  });
  return { chat, mail };
}
