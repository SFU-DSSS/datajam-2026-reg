import { sendEmail } from '../lib/email.js';
const actions = new Set(['access', 'list', 'decision', 'compose', 'send']);
export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  if (!/^Bearer [A-Za-z0-9._-]+$/.test(req.headers.authorization || '')) return res.status(401).json({ error: 'Please sign in.' });
  let body;
  try { body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body; }
  catch { return res.status(400).json({ error: 'Invalid JSON' }); }
  if (!body || !actions.has(body.action) || (body.data !== undefined && (!body.data || typeof body.data !== 'object' || Array.isArray(body.data)))) return res.status(400).json({ error: 'Invalid action or data' });
  if (JSON.stringify(body).length > 8192) return res.status(413).json({ error: 'Request too large' });
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) return res.status(503).json({ error: 'Backend is not configured.' });
  async function rpc(action, payload = {}) {
    const response = await fetch(`${process.env.SUPABASE_URL}/rest/v1/rpc/admin_action`, {
      method: 'POST', headers: { apikey: process.env.SUPABASE_ANON_KEY, Authorization: req.headers.authorization, 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, payload }), signal: AbortSignal.timeout(10000)
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.code === 'P0001' ? result.message : 'Admin request failed. Check your session and database setup.');
    return result;
  }
  try {
    // Every operation, including claiming email, is authorized by the database using the caller's token.
    const result = body.action === 'send' ? { email_id: body.data?.id } : await rpc(body.action, body.data);
    if (result.email_id) {
      // Check access even when email is unconfigured; never report success to a non-admin.
      const access = await rpc('access');
      if (!access.is_admin) return res.status(403).json({ error: 'Organizer access required.' });
      if (!process.env.BREVO_API_KEY || !process.env.BREVO_SENDER_EMAIL) {
        result.email_notice = 'Email remains queued. Configure Brevo, then send it from email history.';
      } else {
        const { email } = await rpc('claim', { id: result.email_id });
        if (email) {
          let outcome;
          try {
            const messageId = await sendEmail({ to: email.recipient, subject: email.subject, text: email.body });
            outcome = { state: 'submitted', message_id: messageId };
            result.email_notice = 'Email submitted to Brevo.';
          } catch (error) {
            outcome = { state: 'unknown', detail: error.message };
            result.email_notice = error.message;
          }
          try { await rpc('finish', { id: email.id, ...outcome }); }
          catch { result.email_notice = 'Email status could not be saved. Check Brevo logs before sending another message.'; }
        } else result.email_notice = 'Email already processed or sending. Check email history.';
      }
    }
    return res.status(200).json(result);
  } catch (error) {
    return res.status(error.message === 'Organizer access required.' ? 403 : 400).json({ error: error.message });
  }
}
