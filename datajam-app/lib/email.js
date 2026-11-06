import { marked } from 'marked';
import sanitizeHtml from 'sanitize-html';

// Server/organizer use only. Never import into frontend code.
export function prepareEmail({ to, subject, text, markdown = false }, env = process.env) {
  const validEmail = value => typeof value === 'string' && /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(value);
  if (!validEmail(to)) throw new Error('Provide one valid recipient email address.');
  if (!validEmail(env.BREVO_SENDER_EMAIL)) throw new Error('Set BREVO_SENDER_EMAIL to your verified Brevo sender.');
  if (env.BREVO_REPLY_TO && !validEmail(env.BREVO_REPLY_TO)) throw new Error('Invalid BREVO_REPLY_TO.');
  if (typeof subject !== 'string' || !subject.trim() || /[\r\n]/.test(subject)) throw new Error('Provide a nonempty, single-line subject.');
  if (typeof text !== 'string' || !text.trim()) throw new Error('Provide a nonempty text message.');
  const html = markdown ? sanitizeHtml(marked.parse(text, { breaks: true }), {
    allowedTags: ['p', 'br', 'strong', 'em', 'a', 'ol', 'ul', 'li', 'blockquote', 'h1', 'h2', 'h3', 'code', 'pre', 'hr'],
    allowedAttributes: { a: ['href', 'title'] },
    allowedSchemes: ['https', 'http', 'mailto'],
    allowProtocolRelative: false
  }) : null;
  const fallback = markdown ? text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '$1 ($2)').replace(/\*\*/g, '').replace(/\\([.!])/g, '$1') : text;
  return {
    sender: { email: env.BREVO_SENDER_EMAIL, name: env.BREVO_SENDER_NAME || 'DataJam 2026' },
    to: [{ email: to }], subject, textContent: fallback,
    ...(html ? { htmlContent: `<html><body><div style="font-family:Arial,sans-serif;font-size:16px;line-height:1.6;color:#222;max-width:640px;margin:auto">${html}</div></body></html>` } : {}),
    ...(env.BREVO_REPLY_TO ? { replyTo: { email: env.BREVO_REPLY_TO } } : {})
  };
}

export async function sendEmail(message, { env = process.env, fetchImpl = fetch } = {}) {
  const body = prepareEmail(message, env);
  if (!env.BREVO_API_KEY) throw new Error('Set BREVO_API_KEY (API key, not SMTP key).');
  let response;
  try {
    response = await fetchImpl('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: { 'api-key': env.BREVO_API_KEY, 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(body), signal: AbortSignal.timeout(15000)
    });
  } catch {
    throw new Error('Delivery status unknown after a network error. Check Brevo transactional logs before retrying.');
  }
  if (!response.ok) throw new Error(`Brevo returned HTTP ${response.status}. Check sender verification, credentials, quota, and transactional logs before retrying.`);
  try {
    const result = await response.json();
    if (!result.messageId) throw new Error();
    return result.messageId;
  } catch {
    throw new Error('Brevo accepted the request but returned no readable message ID. Check transactional logs before retrying.');
  }
}
