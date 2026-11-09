import { createHmac, timingSafeEqual } from 'crypto';

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

function pickSecret() {
  return (
    process.env.TICKET_INGEST_SECRET ||
    process.env.SUPABASE_SECRET_KEY ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    ''
  ).trim();
}

export function signPickToken(rmsTicketId: string) {
  const secret = pickSecret();
  if (!secret) throw new Error('TICKET_INGEST_SECRET is not set.');
  const body = Buffer.from(JSON.stringify({ id: rmsTicketId, exp: Date.now() + WEEK_MS }), 'utf8').toString('base64url');
  const sig = createHmac('sha256', secret).update(body).digest('base64url');
  return `${body}.${sig}`;
}

export function readPickToken(token: string): { id: string } | null {
  const secret = pickSecret();
  const [body, sig] = String(token || '').split('.');
  if (!secret || !body || !sig) return null;
  const expected = createHmac('sha256', secret).update(body).digest('base64url');
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const parsed = JSON.parse(Buffer.from(body, 'base64url').toString('utf8')) as { id?: string; exp?: number };
    if (!parsed.id || !parsed.exp || Date.now() > parsed.exp) return null;
    return { id: parsed.id };
  } catch {
    return null;
  }
}
