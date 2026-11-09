import nodemailer from 'nodemailer';
import { getSupabaseServerClient, isSupabaseServerConfigured } from '@/lib/supabase/server';
import type { RmsSession } from '@/lib/rmsSession';
import type { AppSettings } from '@/types';
import { refreshMicrosoftToken, saveMicrosoftMailTokens, sendMicrosoftMail } from '@/lib/microsoftGraph';

type MailAttachment = {
  filename: string;
  content: string;
  mime?: string;
};

type MailConfig = {
  provider: string;
  fromEmail: string;
  fromName: string;
  smtpUser: string;
  apiKeyOrPass: string;
  host: string;
  port: number;
  recipientEmail: string;
  microsoftRefreshToken: string;
  microsoftAccessToken: string;
  microsoftExpiresAt: number;
  microsoftAccountEmail: string;
};

function alreadyAuthUser(message: string) {
  const text = message.toLowerCase();
  return text.includes('already') || text.includes('registered') || text.includes('exists');
}

async function ensureAuthUser(email: string, metadata?: Record<string, string>) {
  const supabase = getSupabaseServerClient();
  const created = await supabase.auth.admin.createUser({
    email,
    email_confirm: true,
    password: `${crypto.randomUUID()}Aa1!`,
    user_metadata: metadata || {}
  });
  if (created.error && !alreadyAuthUser(created.error.message)) {
    return created.error.message;
  }
  return null;
}

function envMail(): Partial<MailConfig> {
  return {
    fromEmail: (process.env.MAIL_FROM || process.env.SMTP_FROM || '').trim(),
    fromName: (process.env.MAIL_FROM_NAME || 'ICT Department').trim(),
    smtpUser: (process.env.SMTP_USER || '').trim(),
    apiKeyOrPass: (process.env.SMTP_PASS || '').trim(),
    host: (process.env.SMTP_HOST || '').trim(),
    port: Number(process.env.SMTP_PORT || 465),
    recipientEmail: (process.env.MAIL_TO || '').trim()
  };
}

async function companyMailConfig(session?: RmsSession | null): Promise<Partial<MailConfig>> {
  if (!session?.userId || !isSupabaseServerConfigured()) return {};
  const supabase = getSupabaseServerClient();
  const user = await supabase.from('users').select('company_id').eq('id', session.userId).maybeSingle();
  const companyId = String(user.data?.company_id || session.companyId || '');
  if (!companyId) return {};
  const settings = await supabase.from('company_settings').select('email_service').eq('company_id', companyId).maybeSingle();
  const email = (settings.data?.email_service || {}) as AppSettings['emailService'] & { recipientEmail?: string };
  return {
    provider: String(email.provider || ''),
    fromEmail: String(email.fromEmail || '').trim(),
    fromName: String(email.fromName || '').trim(),
    smtpUser: String(email.smtpUser || email.fromEmail || '').trim(),
    apiKeyOrPass: String(email.apiKeyOrPass || '').trim(),
    host: String(email.host || '').trim(),
    port: Number(email.port || 465),
    recipientEmail: String(email.recipientEmail || '').trim(),
    microsoftRefreshToken: String(email.microsoftRefreshToken || '').trim(),
    microsoftAccessToken: String(email.microsoftAccessToken || '').trim(),
    microsoftExpiresAt: Number(email.microsoftExpiresAt || 0),
    microsoftAccountEmail: String(email.microsoftAccountEmail || '').trim()
  };
}

function resolvedMailConfig(company: Partial<MailConfig>): MailConfig {
  const env = envMail();
  const provider = (company.provider || process.env.MAIL_PROVIDER || 'SMTP').trim();
  return {
    provider,
    fromEmail: company.fromEmail || env.fromEmail || '',
    fromName: company.fromName || env.fromName || 'ICT Department',
    smtpUser: company.smtpUser || env.smtpUser || company.fromEmail || env.fromEmail || '',
    apiKeyOrPass: company.apiKeyOrPass || env.apiKeyOrPass || '',
    host: company.host || env.host || '',
    port: company.port || env.port || 465,
    recipientEmail: company.recipientEmail || env.recipientEmail || '',
    microsoftRefreshToken: company.microsoftRefreshToken || '',
    microsoftAccessToken: company.microsoftAccessToken || '',
    microsoftExpiresAt: company.microsoftExpiresAt || 0,
    microsoftAccountEmail: company.microsoftAccountEmail || ''
  };
}

function fromHeader(config: MailConfig) {
  const email = config.fromEmail;
  if (!email.includes('@')) return '';
  return config.fromName ? `${config.fromName} <${email}>` : email;
}

type MailSend = {
  to: string | string[];
  cc?: string[];
  bcc?: string[];
  subject: string;
  text: string;
  html?: string;
  attachments?: MailAttachment[];
};

function toList(to: string | string[]) {
  const list = (Array.isArray(to) ? to : String(to).split(/[,;]+/))
    .map((item) => item.trim().toLowerCase())
    .filter((item) => item.includes('@'));
  return Array.from(new Set(list));
}

async function sendWithResend(config: MailConfig, input: MailSend) {
  const key = (process.env.RESEND_API_KEY || (config.provider.toLowerCase() === 'resend' ? config.apiKeyOrPass : '')).trim();
  if (!key) return null;
  const from = fromHeader(config) || 'ICT Department <onboarding@resend.dev>';
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      from,
      to: toList(input.to),
      cc: input.cc?.length ? input.cc : undefined,
      bcc: input.bcc?.length ? input.bcc : undefined,
      subject: input.subject,
      text: input.text,
      html: input.html,
      attachments: (input.attachments || []).map((file) => ({
        filename: file.filename,
        content: file.content
      }))
    })
  });
  const payload = (await response.json().catch(() => ({}))) as { message?: string; error?: { message?: string } };
  if (!response.ok) {
    return {
      ok: false as const,
      error: payload.error?.message || payload.message || `Resend returned ${response.status}.`
    };
  }
  return { ok: true as const, channel: 'resend' };
}

async function sendWithSendGrid(config: MailConfig, input: MailSend) {
  const key = (process.env.SENDGRID_API_KEY || (config.provider.toLowerCase() === 'sendgrid' ? config.apiKeyOrPass : '')).trim();
  if (!key) return null;
  const from = config.fromEmail;
  if (!from.includes('@')) {
    return { ok: false as const, error: 'Set a sender email in Settings before sending.' };
  }
  const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      personalizations: [
        {
          to: toList(input.to).map((email) => ({ email })),
          ...(input.cc?.length ? { cc: input.cc.map((email) => ({ email })) } : {}),
          ...(input.bcc?.length ? { bcc: input.bcc.map((email) => ({ email })) } : {})
        }
      ],
      from: { email: from, name: config.fromName || undefined },
      subject: input.subject,
      content: [
        { type: 'text/plain', value: input.text },
        ...(input.html ? [{ type: 'text/html', value: input.html }] : [])
      ],
      attachments: (input.attachments || []).map((file) => ({
        content: file.content,
        filename: file.filename,
        type: file.mime || 'application/octet-stream',
        disposition: 'attachment'
      }))
    })
  });
  if (!response.ok) {
    const payload = (await response.json().catch(() => ({}))) as { errors?: { message?: string }[] };
    return {
      ok: false as const,
      error: payload.errors?.[0]?.message || `SendGrid returned ${response.status}.`
    };
  }
  return { ok: true as const, channel: 'sendgrid' };
}

async function sendWithSmtp(config: MailConfig, input: MailSend) {
  const user = (config.smtpUser || config.fromEmail || '').trim();
  const pass = (config.apiKeyOrPass || '').trim();
  const host = config.host;
  if (!host || !user || !pass) return null;
  const from = fromHeader(config) || user;
  const port = Number(config.port || 465);
  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    requireTLS: port === 587,
    tls: {
      rejectUnauthorized: false,
      servername: host
    },
    auth: { user, pass }
  });
  try {
    await transporter.sendMail({
      from,
      to: toList(input.to).join(', '),
      cc: (input.cc || []).join(', ') || undefined,
      bcc: (input.bcc || []).join(', ') || undefined,
      subject: input.subject,
      text: input.text,
      html: input.html,
      attachments: (input.attachments || []).map((file) => ({
        filename: file.filename,
        content: Buffer.from(file.content, 'base64'),
        contentType: file.mime
      }))
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Could not send email.';
    if (/535|incorrect authentication|invalid login|auth/i.test(message)) {
      throw new Error(
        `SMTP login failed for ${user} on ${host}:${port}. ${message} Use the full cPanel address as SMTP username and that mailbox password in Settings.`
      );
    }
    throw new Error(message);
  }
  return { ok: true as const, channel: 'smtp' };
}

export async function sendPasswordResetEmail(email: string): Promise<{ ok: boolean; error?: string }> {
  if (!isSupabaseServerConfigured()) {
    return { ok: false, error: 'Supabase is not configured.' };
  }
  const to = String(email || '').trim().toLowerCase();
  if (!to.includes('@')) {
    return { ok: false, error: 'A valid recipient email is required.' };
  }
  const ensureError = await ensureAuthUser(to);
  if (ensureError) return { ok: false, error: ensureError };
  const supabase = getSupabaseServerClient();
  const otp = await supabase.auth.signInWithOtp({
    email: to,
    options: { shouldCreateUser: false }
  });
  if (otp.error) {
    return {
      ok: false,
      error: otp.error.message || 'Supabase could not send the reset email. Enable Auth email in the Supabase project.'
    };
  }
  return { ok: true };
}

export async function sendAppEmail(input: {
  to: string | string[];
  cc?: string | string[];
  bcc?: string | string[];
  subject: string;
  text: string;
  html?: string;
  attachments?: MailAttachment[];
  session?: RmsSession | null;
}): Promise<{ ok: boolean; error?: string; channel?: string }> {
  const to = toList(input.to);
  if (!to.length) {
    return { ok: false, error: 'A valid recipient email is required.' };
  }
  const cc = toList(input.cc || []).filter((item) => !to.includes(item));
  const bcc = toList(input.bcc || []).filter((item) => !to.includes(item) && !cc.includes(item));

  const config = resolvedMailConfig(await companyMailConfig(input.session));
  const provider = config.provider.toLowerCase();
  const useGraph = provider === 'microsoftgraph';
  const useSmtp =
    Boolean(config.host) && !useGraph && provider !== 'resend' && provider !== 'sendgrid';
  try {
    if (useGraph) {
      if (!config.microsoftRefreshToken) {
        return {
          ok: false,
          error: 'Connect Microsoft in Settings, then send the report again.'
        };
      }
      let access = config.microsoftAccessToken;
      if (!access || Date.now() > Number(config.microsoftExpiresAt || 0) - 60_000) {
        const refreshed = await refreshMicrosoftToken(config.microsoftRefreshToken);
        access = refreshed.access_token || '';
        if (input.session) {
          await saveMicrosoftMailTokens(input.session, {
            provider: 'MicrosoftGraph',
            microsoftRefreshToken: refreshed.refresh_token || config.microsoftRefreshToken,
            microsoftAccessToken: access,
            microsoftExpiresAt: Date.now() + Number(refreshed.expires_in || 3600) * 1000
          });
        }
      }
      await sendMicrosoftMail({
        accessToken: access,
        to,
        cc,
        bcc,
        subject: input.subject,
        text: input.text,
        html: input.html,
        attachments: input.attachments
      });
      return { ok: true, channel: 'microsoft-graph' };
    }
    if (useSmtp) {
      const smtp = await sendWithSmtp(config, { ...input, to, cc, bcc });
      if (smtp) return smtp;
      return {
        ok: false,
        error:
          'SMTP is not complete. In Settings set host mail.hesu.co.tz, port 465, username, password, and From email — the same values as Help Desk.'
      };
    }
    if (config.provider.toLowerCase() === 'sendgrid') {
      const sendgrid = await sendWithSendGrid(config, { ...input, to, cc, bcc });
      if (sendgrid) return sendgrid;
    } else {
      const resend = await sendWithResend(config, { ...input, to, cc, bcc });
      if (resend) return resend;
    }
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : 'Could not send email.' };
  }

  return {
    ok: false,
    error: 'Email is not configured. In Settings choose SMTP and enter the Help Desk mail.hesu.co.tz details.'
  };
}

export async function defaultDeliveryRecipient(session?: RmsSession | null) {
  const config = resolvedMailConfig(await companyMailConfig(session));
  return config.recipientEmail;
}

export async function companySenderEmail(session?: RmsSession | null) {
  const config = resolvedMailConfig(await companyMailConfig(session));
  return config.fromEmail;
}
