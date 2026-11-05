import { getSupabaseServerClient, isSupabaseServerConfigured } from '@/lib/supabase/server';
import type { RmsSession } from '@/lib/rmsSession';
import type { AppSettings } from '@/types';

const SCOPES = 'openid offline_access User.Read Mail.Send';

function tenant() {
  return (process.env.MICROSOFT_TENANT_ID || 'organizations').trim();
}

function clientId() {
  return (process.env.MICROSOFT_CLIENT_ID || '').trim();
}

function clientSecret() {
  return (process.env.MICROSOFT_CLIENT_SECRET || '').trim();
}

export function microsoftGraphConfigured() {
  return Boolean(clientId() && clientSecret());
}

export function microsoftRedirectUri(origin: string) {
  const base = (process.env.APP_URL || origin).replace(/\/$/, '');
  return `${base}/api/auth/microsoft/callback`;
}

export function microsoftAuthorizeUrl(origin: string, state: string) {
  const params = new URLSearchParams({
    client_id: clientId(),
    response_type: 'code',
    redirect_uri: microsoftRedirectUri(origin),
    response_mode: 'query',
    scope: SCOPES,
    state,
    prompt: 'select_account'
  });
  return `https://login.microsoftonline.com/${tenant()}/oauth2/v2.0/authorize?${params.toString()}`;
}

async function tokenRequest(body: Record<string, string>) {
  const res = await fetch(`https://login.microsoftonline.com/${tenant()}/oauth2/v2.0/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(body)
  });
  const data = (await res.json()) as {
    access_token?: string;
    refresh_token?: string;
    expires_in?: number;
    error_description?: string;
    error?: string;
  };
  if (!res.ok || !data.access_token) {
    throw new Error(data.error_description || data.error || 'Microsoft sign-in failed.');
  }
  return data;
}

export async function exchangeMicrosoftCode(origin: string, code: string) {
  return tokenRequest({
    client_id: clientId(),
    client_secret: clientSecret(),
    grant_type: 'authorization_code',
    code,
    redirect_uri: microsoftRedirectUri(origin),
    scope: SCOPES
  });
}

export async function refreshMicrosoftToken(refreshToken: string) {
  return tokenRequest({
    client_id: clientId(),
    client_secret: clientSecret(),
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
    scope: SCOPES
  });
}

export async function microsoftProfile(accessToken: string) {
  const res = await fetch('https://graph.microsoft.com/v1.0/me?$select=mail,userPrincipalName,displayName', {
    headers: { Authorization: `Bearer ${accessToken}` }
  });
  const data = (await res.json()) as { mail?: string; userPrincipalName?: string; displayName?: string; error?: { message?: string } };
  if (!res.ok) throw new Error(data.error?.message || 'Could not read the Microsoft account.');
  return {
    email: String(data.mail || data.userPrincipalName || '').toLowerCase(),
    name: String(data.displayName || '')
  };
}

export async function sendMicrosoftMail(input: {
  accessToken: string;
  to: string[];
  subject: string;
  text: string;
  html?: string;
  attachments?: { filename: string; content: string; mime?: string }[];
}) {
  const attachments = (input.attachments || []).map((file) => ({
    '@odata.type': '#microsoft.graph.fileAttachment',
    name: file.filename,
    contentType: file.mime || 'application/octet-stream',
    contentBytes: file.content
  }));
  const res = await fetch('https://graph.microsoft.com/v1.0/me/sendMail', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${input.accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      message: {
        subject: input.subject,
        body: {
          contentType: input.html ? 'HTML' : 'Text',
          content: input.html || input.text
        },
        toRecipients: input.to.map((address) => ({ emailAddress: { address } })),
        attachments
      },
      saveToSentItems: true
    })
  });
  if (!res.ok) {
    const payload = (await res.json().catch(() => ({}))) as { error?: { message?: string } };
    throw new Error(payload.error?.message || `Microsoft Graph returned ${res.status}.`);
  }
}

export async function saveMicrosoftMailTokens(
  session: RmsSession,
  patch: {
    microsoftRefreshToken?: string;
    microsoftAccessToken?: string;
    microsoftExpiresAt?: number;
    microsoftAccountEmail?: string;
    provider?: AppSettings['emailService']['provider'];
  }
) {
  if (!isSupabaseServerConfigured()) throw new Error('Supabase is not configured.');
  const supabase = getSupabaseServerClient();
  const user = await supabase.from('users').select('company_id').eq('id', session.userId).maybeSingle();
  const companyId = String(user.data?.company_id || session.companyId || '');
  if (!companyId) throw new Error('No company is linked to this account.');
  const current = await supabase.from('company_settings').select('email_service').eq('company_id', companyId).maybeSingle();
  const emailService = {
    ...((current.data?.email_service || {}) as Record<string, unknown>),
    ...patch,
    provider: patch.provider || 'MicrosoftGraph',
    enabled: true,
    configured: true
  };
  const { error } = await supabase
    .from('company_settings')
    .update({ email_service: emailService, updated_at: new Date().toISOString() })
    .eq('company_id', companyId);
  if (error) throw new Error(error.message);
}
