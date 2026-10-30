import { cookies } from 'next/headers';
import { parseRmsSession, RMS_SESSION_COOKIE, type RmsSession } from '@/lib/rmsSession';

export async function readRmsSession(): Promise<RmsSession | null> {
  const cookieStore = await cookies();
  const raw = cookieStore.get(RMS_SESSION_COOKIE)?.value;
  return parseRmsSession(raw);
}
