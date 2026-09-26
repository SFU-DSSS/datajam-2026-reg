// Server/organizer use only. Never import into frontend code.
export function prepareEmail({ to, subject, text }, env = process.env) {
  const validEmail = value => typeof value === 'string' && /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(value);
  if (!validEmail(to)) throw new Error('Provide one valid recipient email address.');
  if (!validEmail(env.BREVO_SENDER_EMAIL)) throw new Error('Set BREVO_SENDER_EMAIL to your verified Brevo sender.');
  if (env.BREVO_REPLY_TO && !validEmail(env.BREVO_REPLY_TO)) throw new Error('Invalid BREVO_REPLY_TO.');
  if (typeof subject !== 'string' || !subject.trim() || /[\r\n]/.test(subject)) throw new Error('Provide a nonempty, single-line subject.');
  if (typeof text !== 'string' || !text.trim()) throw new Error('Provide a nonempty text message.');
  return {
    sender: { email: env.BREVO_SENDER_EMAIL, name: env.BREVO_SENDER_NAME || 'DataJam 2026' },
    to: [{ email: to }], subject, textContent: text,
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
