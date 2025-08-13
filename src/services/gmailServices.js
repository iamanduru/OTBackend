import { google } from 'googleapis';

const {
  GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET, GMAIL_REDIRECT_URI,
  GMAIL_REFRESH_TOKEN, GMAIL_SENDER
} = process.env;

const oAuth2Client = new google.auth.OAuth2(
    GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET, GMAIL_REDIRECT_URI
);
oAuth2Client.setCredentials({ refresh_token: GMAIL_REFRESH_TOKEN });

function toBase64Url(buffer) {
    return buffer.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function buildMime({ to, subject, html, attachments = [] }) {
  const boundary = 'mixed_' + Math.random().toString(16).slice(2);
  let str = '';
  str += `Content-Type: multipart/mixed; boundary="${boundary}"\r\n`;
  str += `MIME-Version: 1.0\r\n`;
  str += `to: ${to}\r\n`;
  str += `from: ${GMAIL_SENDER}\r\n`;
  str += `subject: ${subject}\r\n\r\n`;

  // HTML part
  str += `--${boundary}\r\n`;
  str += `Content-Type: text/html; charset="UTF-8"\r\n\r\n`;
  str += `${html}\r\n`;

  // attachments
  for (const a of attachments) {
    str += `--${boundary}\r\n`;
    str += `Content-Type: ${a.mimeType}; name="${a.filename}"\r\n`;
    str += `Content-Transfer-Encoding: base64\r\n`;
    str += `Content-Disposition: attachment; filename="${a.filename}"\r\n\r\n`;
    str += `${a.content.toString('base64')}\r\n`;
  }

  str += `--${boundary}--`;
  return toBase64Url(Buffer.from(str));
}

export async function sendEmailWithAttachments({ to, subject, html, attachments }) {
  const gmail = google.gmail({ version: 'v1', auth: oAuth2Client });
  const raw = buildMime({ to, subject, html, attachments });
  await gmail.users.messages.send({
    userId: 'me',
    requestBody: { raw }
  });
}