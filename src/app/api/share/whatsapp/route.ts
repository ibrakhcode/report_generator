import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { to, text, phoneNumberId, accessToken } = body as {
    to: string;
    text: string;
    phoneNumberId?: string;
    accessToken?: string;
  };

  if (!to || !text) {
    return NextResponse.json({ ok: false, error: 'Phone number and message are required.' }, { status: 400 });
  }

  const digits = to.replace(/[^0-9]/g, '');

  if (phoneNumberId && accessToken) {
    const res = await fetch(`https://graph.facebook.com/v21.0/${phoneNumberId}/messages`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: digits,
        type: 'text',
        text: { body: text }
      })
    });
    if (!res.ok) {
      const err = await res.text();
      return NextResponse.json({ ok: false, error: err || 'WhatsApp Cloud API rejected the message.' }, { status: 502 });
    }
    return NextResponse.json({ ok: true, channel: 'cloud' });
  }

  return NextResponse.json({ ok: true, channel: 'native', url: `https://wa.me/${digits}?text=${encodeURIComponent(text)}` });
}
