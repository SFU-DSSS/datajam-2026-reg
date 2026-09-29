import { kickDiscord } from '../lib/discord.js';
const actions = new Set(['me', 'profile', 'create', 'join', 'rename', 'rotate', 'remove', 'transfer', 'leave']);
export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  const origin = req.headers.origin;
  const allowed = (process.env.ALLOWED_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean);
  if (origin && allowed.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
    res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  }
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  if (!/^Bearer [A-Za-z0-9._-]+$/.test(req.headers.authorization || ''))
    return res.status(401).json({ error: 'Please sign in.' });
  let body;
  try { body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body; }
  catch { return res.status(400).json({ error: 'Invalid JSON' }); }
  if (!body || !actions.has(body.action) || (body.data !== undefined && (!body.data || typeof body.data !== 'object' || Array.isArray(body.data))))
    return res.status(400).json({ error: 'Invalid action or data' });
  if (JSON.stringify(body).length > 8192) return res.status(413).json({ error: 'Request too large' });
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) return res.status(503).json({ error: 'Backend is not configured.' });
  try {
    const response = await fetch(`${process.env.SUPABASE_URL}/rest/v1/rpc/registration_action`, {
      method: 'POST',
      headers: { apikey: process.env.SUPABASE_ANON_KEY, Authorization: req.headers.authorization, 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: body.action, payload: body.data || {} }),
      signal: AbortSignal.timeout(10000)
    });
    const result = await response.json();
    if (!response.ok) return res.status(response.status === 401 ? 401 : 400).json({ error: result.code === 'P0001' ? result.message : 'Request failed. Check your session and backend setup.' });
    if (!result.error && !['me','profile'].includes(body.action)) await kickDiscord();
    return res.status(result.error ? (result.error === 'Too many attempts. Try again in 15 minutes.' ? 429 : 400) : 200).json(result);
  } catch { return res.status(503).json({ error: 'Backend unavailable. Please try again.' }); }
}
