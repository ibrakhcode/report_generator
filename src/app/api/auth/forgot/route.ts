import { NextResponse } from 'next/server';
import { randomInt } from 'crypto';
import { hashPasswordServer } from '@/lib/serverPassword';
import { sendAppEmail } from '@/lib/mailer';
import { getSupabaseServerClient, isSupabaseServerConfigured } from '@/lib/supabase/server';

export async function POST(request: Request) {
  if (!isSupabaseServerConfigured()) {
    return NextResponse.json({ ok: false, error: 'Supabase is not configured.' }, { status: 503 });
  }
  const body = (await request.json()) as { email?: string };
  const email = String(body.email || '').trim().toLowerCase();
  if (!email.includes('@')) {
    return NextResponse.json({ ok: false, error: 'Enter a valid email address.' }, { status: 400 });
  }

  const supabase = getSupabaseServerClient();
  const { data } = await supabase.from('users').select('id, full_name, email').eq('email', email).maybeSingle();
  if (!data) {
    return NextResponse.json({ ok: true });
  }

  const code = String(randomInt(100000, 999999));
  const hashed = await hashPasswordServer(code);
  const expires = new Date(Date.now() + 30 * 60 * 1000).toISOString();
  const upsert = await supabase.from('password_resets').upsert({
    email,
    salt: hashed.salt,
    hash: hashed.hash,
    expires_at: expires
  });
  if (upsert.error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          upsert.error.message.includes('password_resets')
            ? 'Run the password_resets SQL in Supabase, then try again.'
            : upsert.error.message
      },
      { status: 500 }
    );
  }

  const mailed = await sendAppEmail({
    to: email,
    subject: 'HESU ICT RMS password reset code',
    text: `Hello ${String(data.full_name || '')},\n\nYour password reset code is: ${code}\nIt expires in 30 minutes.\n\nIf you did not ask for this, ignore this email.`
  });
  if (!mailed.ok) {
    return NextResponse.json({ ok: false, error: mailed.error }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
