import { NextRequest, NextResponse } from 'next/server';
import { readRmsSession } from '@/lib/readRmsSession';
import { rmsSessionCookieOptions } from '@/lib/rmsSession';
import { microsoftAuthorizeUrl, microsoftGraphConfigured } from '@/lib/microsoftGraph';

export async function GET(req: NextRequest) {
  const session = await readRmsSession();
  if (!session) {
    return NextResponse.redirect(new URL('/login', req.nextUrl.origin));
  }
  if (!microsoftGraphConfigured()) {
    return NextResponse.redirect(new URL('/settings?microsoft=missing', req.nextUrl.origin));
  }
  const state = crypto.randomUUID();
  const url = microsoftAuthorizeUrl(req.nextUrl.origin, state);
  const res = NextResponse.redirect(url);
  res.cookies.set('hesu_ms_oauth_state', state, {
    ...rmsSessionCookieOptions(),
    maxAge: 10 * 60
  });
  return res;
}
