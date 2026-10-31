type MailAttachment = {
  filename: string;
  content: string;
  mime?: string;
};

export async function sendAppEmail(input: {
  to: string;
  subject: string;
  text: string;
  html?: string;
  attachments?: MailAttachment[];
}): Promise<{ ok: boolean; error?: string }> {
  const apiKey = String(process.env.RESEND_API_KEY || process.env.EMAIL_API_KEY || '').trim();
  const from = String(process.env.EMAIL_FROM || '').trim();
  if (!apiKey || !from) {
    return {
      ok: false,
      error: 'Email is not configured. Set RESEND_API_KEY and EMAIL_FROM on the server.'
    };
  }
  const to = String(input.to || '').trim();
  if (!to.includes('@')) {
    return { ok: false, error: 'A valid recipient email is required.' };
  }

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      from,
      to: [to],
      subject: input.subject,
      text: input.text,
      html: input.html,
      attachments: (input.attachments || []).map((file) => ({
        filename: file.filename,
        content: file.content
      }))
    })
  });
  if (!res.ok) {
    const err = await res.text();
    return { ok: false, error: err || 'The email service rejected the message.' };
  }
  return { ok: true };
}
