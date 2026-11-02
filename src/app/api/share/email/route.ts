import { NextRequest, NextResponse } from 'next/server';
import { sendAppEmail } from '@/lib/mailer';

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { to, subject, text, attachments } = body as {
    to: string;
    subject: string;
    text: string;
    attachments?: { filename: string; content: string; mime?: string }[];
  };

  if (!to || !subject) {
    return NextResponse.json({ ok: false, error: 'Recipient and subject are required.' }, { status: 400 });
  }
  if (!attachments?.length) {
    return NextResponse.json({ ok: false, error: 'The monthly report attachment is required.' }, { status: 400 });
  }

  const mailed = await sendAppEmail({
    to,
    subject,
    text,
    attachments
  });
  if (!mailed.ok) {
    return NextResponse.json({ ok: false, error: mailed.error }, { status: 502 });
  }
  return NextResponse.json({ ok: true, channel: 'supabase' });
}
