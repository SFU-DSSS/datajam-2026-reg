import { configured, validSecret, runDiscord } from '../lib/discord.js';

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (!['GET','POST'].includes(req.method)) return res.status(405).json({ error: 'Method not allowed' });
  if (!validSecret(req.headers.authorization, process.env.CRON_SECRET)) return res.status(401).json({ error: 'Unauthorized' });
  if (!configured()) return res.status(503).json({ error: 'Discord integration is not configured.' });
  try { return res.status(200).json(await runDiscord({ budgetMs: 40000, maxJobs: 15 })); }
  catch { return res.status(503).json({ error: 'Discord synchronization interrupted. Durable work will retry.' }); }
}
