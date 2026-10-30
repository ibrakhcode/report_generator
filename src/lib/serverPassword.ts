import { pbkdf2 as pbkdf2Callback, randomBytes, randomInt } from 'crypto';
import { promisify } from 'util';
import { NextResponse } from 'next/server';
import type { User } from '@/types';
import { RMS_SESSION_COOKIE, rmsSessionCookieOptions } from '@/lib/rmsSession';

const pbkdf2 = promisify(pbkdf2Callback);

export async function hashPasswordServer(password: string, saltB64?: string) {
  const salt = saltB64 ? Buffer.from(saltB64, 'base64') : randomBytes(16);
  const derived = await pbkdf2(password, salt, 100000, 32, 'sha256');
  return { salt: salt.toString('base64'), hash: derived.toString('base64') };
}

export async function verifyPasswordServer(password: string, saltB64: string, hashB64: string) {
  if (!saltB64 || !hashB64) return false;
  const hashed = await hashPasswordServer(password, saltB64);
  return hashed.hash === hashB64;
}

export function mkRecoveryCodeServer(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let raw = '';
  for (let i = 0; i < 16; i += 1) {
    raw += chars[randomInt(0, chars.length)];
  }
  return raw.match(/.{4}/g)!.join('-');
}

export function validatePasswordServer(pw: string): string {
  if (pw.length < 10) return 'Password must be at least 10 characters long.';
  if (!/[a-z]/.test(pw) || !/[A-Z]/.test(pw) || !/\d/.test(pw)) {
    return 'Include at least one uppercase letter, one lowercase letter, and one number.';
  }
  return '';
}

export function userSessionResponse(user: User, extra?: Record<string, unknown>) {
  const response = NextResponse.json({ ok: true, user, ...extra });
  response.cookies.set(
    RMS_SESSION_COOKIE,
    JSON.stringify({ userId: user.id, email: user.email, companyId: user.companyId || '' }),
    rmsSessionCookieOptions()
  );
  return response;
}
