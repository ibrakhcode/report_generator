import { NextRequest, NextResponse } from 'next/server';
import { readRmsSession } from '@/lib/readRmsSession';
import { sendAppEmail } from '@/lib/mailer';
import { readFeedbackToken } from '@/lib/reportFeedback';
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

  if (isReply) {
    const to = report.feedbackRecipients?.length ? report.feedbackRecipients : [comment.email].filter(Boolean);
    if (to.length) {
      await sendAppEmail({
        to,
        subject: `Re: ICT Monthly Report — ${monthLabel(report.month)}`,
        text: `Ibrahim replied on the ${monthLabel(report.month)} report:\n\n${message}`,
        html: `<p>Ibrahim replied on the ${monthLabel(report.month)} report:</p><p>${message.replace(/</g, '&lt;')}</p>`,
        session
      });
    }
  }

  return NextResponse.json({ ok: true, comments: next.feedbackComments || [], unseen: next.feedbackUnseen || 0 });
}
