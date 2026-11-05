function foldBase64(value: string) {
  return value.replace(/.{1,76}/g, (line) => `${line}\r\n`).trim();
}

function oneLine(value: string) {
  return value.replace(/[\r\n]+/g, ' ').trim();
}

function encodeSubject(subject: string) {
  const clean = oneLine(subject);
  if (/^[\x20-\x7e]*$/.test(clean)) return clean;
  const bytes = new TextEncoder().encode(clean);
  let binary = '';
  bytes.forEach((b) => {
    binary += String.fromCharCode(b);
  });
  return `=?UTF-8?B?${btoa(binary)}?=`;
}

export function buildUnsentOutlookEml(input: {
  to: string[];
  subject: string;
  text: string;
  attachments: { filename: string; content: string; mime: string }[];
}) {
  const boundary = `rms-${crypto.randomUUID()}`;
  const lines: string[] = [
    'X-Unsent: 1',
    `To: ${input.to.map(oneLine).join(', ')}`,
    `Subject: ${encodeSubject(input.subject)}`,
    'X-Mailer: HESU ICT RMS',
    'MIME-Version: 1.0',
    `Content-Type: multipart/mixed; boundary="${boundary}"`,
    '',
    `--${boundary}`,
    'Content-Type: text/plain; charset="UTF-8"',
    'Content-Transfer-Encoding: 8bit',
    '',
    input.text.replace(/\r?\n/g, '\r\n'),
    ''
  ];
  input.attachments.forEach((file) => {
    const name = oneLine(file.filename).replace(/"/g, '');
    lines.push(
      `--${boundary}`,
      `Content-Type: ${file.mime || 'application/octet-stream'}; name="${name}"`,
      'Content-Transfer-Encoding: base64',
      `Content-Disposition: attachment; filename="${name}"`,
      '',
      foldBase64(file.content),
      ''
    );
  });
  lines.push(`--${boundary}--`, '');
  return lines.join('\r\n');
}
