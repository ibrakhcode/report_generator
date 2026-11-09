import { NextRequest, NextResponse } from 'next/server';
import { readRmsSession } from '@/lib/readRmsSession';
import { sendAppEmail } from '@/lib/mailer';
import { signFeedbackToken } from '@/lib/reportFeedback';
import { autoReportEmail, parseRecipientList, reportEmailHtml } from '@/lib/reportFeedbackText';
import { readReportForFeedback, writeReportFeedback } from '@/lib/reportFeedbackDb';

export async function POST(req: NextRequest) {
  const session = await readRmsSession();
  if (!session) {
    return NextResponse.json({ ok: false, error: 'Not signed in.' }, { status: 401 });
  }

  let body: {
    to?: string | string[];
    cc?: string | string[];
    bcc?: string | string[];
    subject?: string;
    text?: string;
    html?: string;
    reportId?: string;
    month?: string;
    composeOnly?: boolean;
    attachments?: { filename: string; content: string; mime?: string }[];
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid request.' }, { status: 400 });
  }

  const listOf = (value?: string | string[]) =>
    parseRecipientList(Array.isArray(value) ? value.join(',') : String(value || ''));
  const recipients = listOf(body.to);
  const cc = listOf(body.cc).filter((item) => !recipients.includes(item));
  const bcc = listOf(body.bcc).filter((item) => !recipients.includes(item) && !cc.includes(item));
  if (!recipients.length || !body.subject) {
    return NextResponse.json({ ok: false, error: 'Recipient and subject are required.' }, { status: 400 });
  }
  const composeOnly = Boolean(body.composeOnly);
  if (!composeOnly && !body.attachments?.length) {
    return NextResponse.json({ ok: false, error: 'The monthly report attachment is required.' }, { status: 400 });
  }

  const origin = req.nextUrl.origin;
  const reportId = String(body.reportId || `REP-${body.month || ''}`);
  const month = String(body.month || '');
  const token = signFeedbackToken({ reportId, month, ownerUserId: session.userId });
  const feedbackUrl = `${origin}/feedback/${encodeURIComponent(token)}`;
  const generated = autoReportEmail(month || 'this month', feedbackUrl);
  const text = (body.text?.trim() || generated.text).replace('[Feedback link will be added when you send]', feedbackUrl);
  const html = reportEmailHtml(text, feedbackUrl, month || 'this month');

  let channel = 'outlook';
  if (!composeOnly) {
    const mailed = await sendAppEmail({
      to: recipients,
      cc,
      bcc,
      subject: body.subject,
      text,
      html,
      attachments: body.attachments,
      session
    });
    if (!mailed.ok) {
      return NextResponse.json({ ok: false, error: mailed.error }, { status: 502 });
    }
    channel = mailed.channel || 'smtp';
  }

  const existing = await readReportForFeedback(reportId, session.userId);
  if (existing) {
    await writeReportFeedback(
      {
        ...existing,
        feedbackToken: token,
        feedbackRecipients: recipients,
        feedbackCc: cc,
        feedbackBcc: bcc,
        feedbackUnseen: existing.feedbackUnseen || 0,
        feedbackComments: existing.feedbackComments || []
      },
      session.userId
    );
  }

  return NextResponse.json({ ok: true, channel, token, feedbackUrl, recipients, cc, bcc, text });
}
