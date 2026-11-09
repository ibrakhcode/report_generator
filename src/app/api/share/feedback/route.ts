import { NextRequest, NextResponse } from 'next/server';
import { readRmsSession } from '@/lib/readRmsSession';
import { companySenderEmail, sendAppEmail } from '@/lib/mailer';
import { readFeedbackToken } from '@/lib/reportFeedback';
import { escapeHtml } from '@/lib/reportFeedbackText';
import { addComment, readReportForFeedback, writeReportFeedback } from '@/lib/reportFeedbackDb';
import { monthLabel } from '@/lib/reportPosts';

export async function GET(req: NextRequest) {
  const token = String(req.nextUrl.searchParams.get('token') || '');
  const payload = readFeedbackToken(token);
  if (!payload) {
    return NextResponse.json({ ok: false, error: 'This feedback link is not valid.' }, { status: 400 });
  }
  const report = await readReportForFeedback(payload.reportId, payload.ownerUserId);
  if (!report) {
    return NextResponse.json({ ok: false, error: 'This report is not available for feedback yet.' }, { status: 404 });
  }
  return NextResponse.json({
    ok: true,
    month: report.month,
    period: monthLabel(report.month),
    companyName: report.companyName,
    comments: report.feedbackComments || [],
    unseen: report.feedbackUnseen || 0,
    recipients: report.feedbackRecipients || []
  });
}

export async function POST(req: NextRequest) {
  const session = await readRmsSession();
  let body: { token?: string; body?: string; author?: string; email?: string; reply?: boolean };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid request.' }, { status: 400 });
  }
  const payload = readFeedbackToken(String(body.token || ''));
  if (!payload) {
    return NextResponse.json({ ok: false, error: 'This feedback link is not valid.' }, { status: 400 });
  }
  const message = String(body.body || '').trim();
  if (!message) {
    return NextResponse.json({ ok: false, error: 'Write a comment first.' }, { status: 400 });
  }

  const isReply = Boolean(body.reply);
  if (isReply && !session) {
    return NextResponse.json({ ok: false, error: 'Not signed in.' }, { status: 401 });
  }

  const report = await readReportForFeedback(payload.reportId, payload.ownerUserId);
  if (!report) {
    return NextResponse.json({ ok: false, error: 'This report is not available for feedback yet.' }, { status: 404 });
  }

  const comment = {
    id: `FB-${Date.now()}`,
    role: (isReply ? 'ibrahim' : 'boss') as 'ibrahim' | 'boss',
    author: isReply ? 'Ibrahim' : String(body.author || 'Reviewer').trim() || 'Reviewer',
    email: String(body.email || '').trim(),
    body: message,
    createdAt: new Date().toISOString()
  };
  const next = addComment(report, comment, !isReply);
  if (isReply) next.feedbackUnseen = 0;
  await writeReportFeedback(next, payload.ownerUserId);

  let emailed = false;
  let emailError = '';
  if (isReply) {
    const to = report.feedbackRecipients?.length ? report.feedbackRecipients : [comment.email].filter(Boolean);
    if (to.length) {
      const mailed = await sendAppEmail({
        to,
        cc: report.feedbackCc || [],
        subject: `Re: ICT Monthly Report — ${monthLabel(report.month)}`,
        text: `Ibrahim replied on the ${monthLabel(report.month)} report:\n\n${message}`,
        html: `<p>Ibrahim replied on the ${monthLabel(report.month)} report:</p><p>${escapeHtml(message).replace(/\n/g, '<br/>')}</p>`,
        session
      });
      emailed = mailed.ok;
      if (!mailed.ok) emailError = mailed.error || 'Could not send email.';
    } else {
      emailError = 'No recipient email saved on this report.';
    }
  } else {
    const owner = { userId: payload.ownerUserId, email: '', companyId: '' };
    const notifyTo = await companySenderEmail(owner);
    if (notifyTo) {
      const who = comment.email ? `${comment.author} (${comment.email})` : comment.author;
      await sendAppEmail({
        to: notifyTo,
        subject: `New feedback — ICT Monthly Report ${monthLabel(report.month)}`,
        text: `${who} commented on the ${monthLabel(report.month)} report:\n\n${message}\n\nOpen RMS > Report Delivery > Feedback to reply.`,
        html: `<p>${escapeHtml(who)} commented on the ${monthLabel(report.month)} report:</p><p>${escapeHtml(message).replace(/\n/g, '<br/>')}</p><p>Open RMS &gt; Report Delivery &gt; Feedback to reply.</p>`,
        session: owner
      });
    }
  }

  return NextResponse.json({
    ok: true,
    comments: next.feedbackComments || [],
    unseen: next.feedbackUnseen || 0,
    emailed,
    emailError
  });
}
