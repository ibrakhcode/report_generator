import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { readRmsSession } from '@/lib/readRmsSession';
import {
  exchangeMicrosoftCode,
  microsoftProfile,
  saveMicrosoftMailTokens
} from '@/lib/microsoftGraph';

export async function GET(req: NextRequest) {
  const session = await readRmsSession();
  const cookieStore = await cookies();
  const expected = cookieStore.get('hesu_ms_oauth_state')?.value || '';
  const origin = req.nextUrl.origin;
  if (!session) {
    return NextResponse.redirect(new URL('/login', origin));
  }

  const code = String(req.nextUrl.searchParams.get('code') || '');
  const state = String(req.nextUrl.searchParams.get('state') || '');
  const oauthError = String(req.nextUrl.searchParams.get('error_description') || req.nextUrl.searchParams.get('error') || '');
  if (oauthError) {
    return NextResponse.redirect(new URL(`/settings?microsoft=error`, origin));
  }
  if (!code || !expected || state !== expected) {
    return NextResponse.redirect(new URL('/settings?microsoft=state', origin));
  }

  try {
    const tokens = await exchangeMicrosoftCode(origin, code);
    const profile = await microsoftProfile(tokens.access_token || '');
    await saveMicrosoftMailTokens(session, {
      provider: 'MicrosoftGraph',
      microsoftRefreshToken: tokens.refresh_token || '',
      microsoftAccessToken: tokens.access_token,
      microsoftExpiresAt: Date.now() + Number(tokens.expires_in || 3600) * 1000,
      microsoftAccountEmail: profile.email
    });
    const res = NextResponse.redirect(new URL('/settings?microsoft=connected', origin));
    res.cookies.set('hesu_ms_oauth_state', '', { path: '/', maxAge: 0 });
    return res;
  } catch {
    return NextResponse.redirect(new URL('/settings?microsoft=error', origin));
  }
}
