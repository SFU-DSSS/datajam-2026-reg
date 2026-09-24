export default function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY)
    return res.status(503).json({ error: 'Configure Supabase environment variables first.' });
  return res.status(200).json({ url: process.env.SUPABASE_URL, key: process.env.SUPABASE_ANON_KEY, captchaSiteKey: process.env.TURNSTILE_SITE_KEY || '' });
}
