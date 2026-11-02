import { getSupabaseServerClient, isSupabaseServerConfigured } from '@/lib/supabase/server';

type MailAttachment = {
  filename: string;
  content: string;
  mime?: string;
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

async function attachToStorage(attachments: MailAttachment[] | undefined) {
  if (!attachments?.length) return '';
  const supabase = getSupabaseServerClient();
  const lines: string[] = [];
  for (const file of attachments) {
    const safeName = file.filename.replace(/[^\w.\- ()]/g, '_');
    const path = `outbound-mail/${Date.now()}-${safeName}`;
    const bytes = Buffer.from(file.content, 'base64');
    const up = await supabase.storage.from('report-library').upload(path, bytes, {
      contentType: file.mime || 'application/octet-stream',
      upsert: true
    });
    if (up.error) {
      throw new Error(up.error.message);
    }
    const signed = await supabase.storage.from('report-library').createSignedUrl(path, 60 * 60 * 24 * 7);
    lines.push(`${file.filename}: ${signed.data?.signedUrl || ''}`);
  }
  return `\n\nDownload files:\n${lines.join('\n')}`;
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
  to: string;
  subject: string;
  text: string;
  html?: string;
  attachments?: MailAttachment[];
}): Promise<{ ok: boolean; error?: string }> {
  if (!isSupabaseServerConfigured()) {
    return { ok: false, error: 'Supabase is not configured.' };
  }
  const to = String(input.to || '').trim().toLowerCase();
  if (!to.includes('@')) {
    return { ok: false, error: 'A valid recipient email is required.' };
  }

  try {
    const files = await attachToStorage(input.attachments);
    const mailText = `${input.subject}\n\n${input.text}${files}`;
    const ensureError = await ensureAuthUser(to, {
      mail_subject: input.subject,
      mail_text: mailText
    });
    if (ensureError) return { ok: false, error: ensureError };

    const supabase = getSupabaseServerClient();
    const link = await supabase.auth.admin.generateLink({
      type: 'magiclink',
      email: to,
      options: {
        data: {
          mail_subject: input.subject,
          mail_text: mailText
        }
      }
    });
    if (link.error) {
      return { ok: false, error: link.error.message || 'Supabase could not send the email.' };
    }
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : 'Could not send email through Supabase.' };
  }
}
