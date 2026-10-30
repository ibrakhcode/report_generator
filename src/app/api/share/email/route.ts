import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { to, subject, text, fromEmail, fromName, provider, apiKey, attachments } = body as {
    to: string;
    subject: string;
    text: string;
    fromEmail: string;
    fromName: string;
    provider: string;
    apiKey?: string;
    attachments?: { filename: string; content: string; mime?: string }[];
  };

  if (!to || !subject) {
    return NextResponse.json({ ok: false, error: 'Recipient and subject are required.' }, { status: 400 });
  }

  if (provider === 'Resend' && apiKey) {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: `${fromName || 'ICT RMS'} <${fromEmail}>`,
        to: [to],
        subject,
        text,
        attachments: (attachments || []).map((file) => ({
          filename: file.filename,
          content: file.content
        }))
      })
    });
    if (!res.ok) {
      const err = await res.text();
      return NextResponse.json({ ok: false, error: err || 'Resend rejected the email.' }, { status: 502 });
    }
    return NextResponse.json({ ok: true, channel: 'resend' });
  }

  if (provider === 'SendGrid' && apiKey) {
    const res = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        personalizations: [{ to: [{ email: to }] }],
        from: { email: fromEmail, name: fromName },
        subject,
        content: [{ type: 'text/plain', value: text }],
        attachments: (attachments || []).map((file) => ({
          filename: file.filename,
          content: file.content,
          type: file.mime || 'application/octet-stream',
          disposition: 'attachment'
        }))
      })
    });
    if (!res.ok) {
      const err = await res.text();
      return NextResponse.json({ ok: false, error: err || 'SendGrid rejected the email.' }, { status: 502 });
    }
    return NextResponse.json({ ok: true, channel: 'sendgrid' });
  }

  return NextResponse.json({ ok: true, channel: 'mailto' });
}
