export const RMS_SESSION_COOKIE = 'hesu_rms_session';

export type RmsSession = {
  userId: string;
  email: string;
  companyId: string;
};

export function rmsSessionCookieOptions() {
  return {
    httpOnly: true,
    sameSite: 'lax' as const,
    path: '/',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 8 * 60 * 60
  };
}

export function parseRmsSession(raw: string | undefined): RmsSession | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as RmsSession;
    if (!parsed?.userId || !parsed?.email) return null;
    return {
      userId: String(parsed.userId),
      email: String(parsed.email).toLowerCase(),
      companyId: parsed.companyId ? String(parsed.companyId) : ''
    };
  } catch {
    return null;
  }
}
