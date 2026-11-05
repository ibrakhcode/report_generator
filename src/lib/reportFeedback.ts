import { createHmac, timingSafeEqual } from 'crypto';

export type FeedbackTokenPayload = {
  reportId: string;
  month: string;
  ownerUserId: string;
};

function feedbackSecret() {
  return (
    process.env.SUPABASE_SECRET_KEY ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.RMS_FEEDBACK_SECRET ||
    'hesu-rms-feedback'
  );
}

export function signFeedbackToken(payload: FeedbackTokenPayload) {
  const body = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
  const sig = createHmac('sha256', feedbackSecret()).update(body).digest('base64url');
  return `${body}.${sig}`;
}

export function readFeedbackToken(token: string): FeedbackTokenPayload | null {
  const [body, sig] = String(token || '').split('.');
  if (!body || !sig) return null;
  const expected = createHmac('sha256', feedbackSecret()).update(body).digest('base64url');
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const parsed = JSON.parse(Buffer.from(body, 'base64url').toString('utf8')) as FeedbackTokenPayload;
    if (!parsed.reportId || !parsed.month || !parsed.ownerUserId) return null;
    return parsed;
  } catch {
    return null;
  }
}
