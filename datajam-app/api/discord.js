import { configured, newState, hashState, rpc, exchangeCode, discord, kickDiscord, DiscordError } from '../lib/discord.js';

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const authorization = req.headers.authorization;
  if (!/^Bearer [A-Za-z0-9._-]+$/.test(authorization || '')) return res.status(401).json({ error: 'Please sign in.' });
  if (!configured()) return res.status(503).json({ error: 'Discord integration is not configured yet.' });
  let body;
  try { body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body; }
  catch { return res.status(400).json({ error: 'Invalid JSON' }); }
  if (!body || !['start','complete','status'].includes(body.action)) return res.status(400).json({ error: 'Invalid Discord action' });
  if (JSON.stringify(body).length > 4096) return res.status(413).json({ error: 'Request too large' });
  try {
    if (body.action === 'start') {
      const state = newState();
      await rpc('start', { state_hash: hashState(state) }, authorization);
      const params = new URLSearchParams({ client_id: process.env.DISCORD_CLIENT_ID, response_type: 'code',
        redirect_uri: process.env.DISCORD_REDIRECT_URI, scope: 'identify guilds.join', state });
      return res.status(200).json({ state, url: `https://discord.com/oauth2/authorize?${params}` });
    }
    if (body.action === 'complete') {
      if (!/^[a-f0-9]{64}$/.test(body.state || '') || typeof body.code !== 'string' || !body.code || body.code.length > 512) {
        return res.status(400).json({ error: 'Invalid Discord authorization response.' });
      }
      // Atomically consume state under the *current caller's* Supabase identity.
      const { user_id } = await rpc('consume', { state_hash: hashState(body.state) }, authorization);
      const access = await exchangeCode(body.code);
      const identity = await discord('/users/@me', { bearer: access });
      await rpc('link', { user_id, discord_id: identity.id });
      await discord(`/guilds/${process.env.DISCORD_GUILD_ID}/members/${identity.id}`, { method: 'PUT', body: { access_token: access } });
      await rpc('joined', { user_id });
      // OAuth tokens stay in memory only. Subsequent role changes use the bot.
    }
    // Authorize status before triggering any worker activity.
    await rpc('status', {}, authorization);
    await kickDiscord();
    const result = await rpc('status', {}, authorization);
    return res.status(200).json({ ...result, chat_url: result.channel_id ? `https://discord.com/channels/${process.env.DISCORD_GUILD_ID}/${result.channel_id}` : null });
  } catch (error) {
    return res.status(error instanceof DiscordError ? 503 : 400).json({ error: error instanceof DiscordError
      ? 'Discord is temporarily unavailable or the bot needs permissions. Try connecting again shortly.'
      : error.message === 'fetch failed' || error.name === 'TimeoutError' ? 'Discord connection interrupted. Please try again.' : error.message });
  }
}
