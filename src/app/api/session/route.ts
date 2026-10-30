import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { parseRmsSession, RMS_SESSION_COOKIE, rmsSessionCookieOptions } from '@/lib/rmsSession';

export async function POST(request: Request) {
  const body = (await request.json()) as { userId?: string; email?: string; companyId?: string };
  if (!body.userId || !body.email) {
    return NextResponse.json({ ok: false, error: 'userId and email are required.' }, { status: 400 });
  }
  const payload = JSON.stringify({
    userId: body.userId,
    email: String(body.email).toLowerCase(),
    companyId: body.companyId || ''
  });
  const response = NextResponse.json({ ok: true });
  response.cookies.set(RMS_SESSION_COOKIE, payload, rmsSessionCookieOptions());
  return response;
}

export async function GET() {
  const cookieStore = await cookies();
  const raw = cookieStore.get(RMS_SESSION_COOKIE)?.value;
  const session = parseRmsSession(raw);
  if (!session) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  return NextResponse.json({ ok: true, session });
}

export async function DELETE() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set(RMS_SESSION_COOKIE, '', { ...rmsSessionCookieOptions(), maxAge: 0 });
  return response;
}
