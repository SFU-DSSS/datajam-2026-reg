import { createHash, randomBytes, randomUUID, timingSafeEqual } from 'node:crypto';

export const hashState = state => createHash('sha256').update(state).digest('hex');
export const newState = () => randomBytes(32).toString('hex');
export function configured() {
  return ['SUPABASE_URL', 'SUPABASE_ANON_KEY', 'SUPABASE_SERVICE_ROLE_KEY', 'DISCORD_CLIENT_ID',
    'DISCORD_CLIENT_SECRET', 'DISCORD_BOT_TOKEN', 'DISCORD_GUILD_ID', 'DISCORD_REDIRECT_URI'].every(k => !!process.env[k]);
}
export function validSecret(value, secret) {
  if (!secret || !value) return false;
  const a = Buffer.from(value), b = Buffer.from(`Bearer ${secret}`);
  return a.length === b.length && timingSafeEqual(a, b);
}
export async function rpc(action, payload = {}, authorization) {
  const service = !authorization;
  const key = service ? process.env.SUPABASE_SERVICE_ROLE_KEY : process.env.SUPABASE_ANON_KEY;
  const response = await fetch(`${process.env.SUPABASE_URL}/rest/v1/rpc/discord_${service ? 'service' : 'user'}`, {
    method: 'POST', headers: { apikey: key, Authorization: authorization || `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, payload }), signal: AbortSignal.timeout(4000)
  });
  const data = await response.json();
  if (!response.ok || data.error) throw new Error(data.error || (data.code === 'P0001' ? data.message : 'Discord database request failed.'));
  return data;
}

export class DiscordError extends Error {
  constructor(status, retryAfter = 0) {
    super(`Discord API returned ${status}.`);
    this.status = status;
    this.retryAfter = retryAfter;
  }
}
// Retry via the durable queue, never by sleeping inside a Vercel function.
export async function discord(path, { method = 'GET', body, bearer, missingOK = false, deadline = Infinity } = {}) {
  const remaining = deadline - Date.now();
  if (remaining < 250) throw new Error('Discord work continues on the next retry.');
  const response = await fetch(`https://discord.com/api/v10${path}`, {
    method, headers: { Authorization: bearer ? `Bearer ${bearer}` : `Bot ${process.env.DISCORD_BOT_TOKEN}`, 'Content-Type': 'application/json' },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    signal: AbortSignal.timeout(Math.min(4000, remaining))
  });
  if (response.status === 404 && missingOK) return null;
  if (response.status === 204) return null;
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new DiscordError(response.status, Math.ceil(Number(data.retry_after || response.headers?.get('retry-after') || 0)));
  return data;
}
export async function exchangeCode(code) {
  const response = await fetch('https://discord.com/api/oauth2/token', {
    method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ client_id: process.env.DISCORD_CLIENT_ID, client_secret: process.env.DISCORD_CLIENT_SECRET,
      grant_type: 'authorization_code', code, redirect_uri: process.env.DISCORD_REDIRECT_URI }), signal: AbortSignal.timeout(4000)
  });
  const token = await response.json();
  if (!response.ok || !token.access_token || !['identify','guilds.join'].every(s => token.scope?.split(' ').includes(s))) {
    throw new Error('Discord authorization failed. Please connect again and approve both permissions.');
  }
  return token.access_token;
}

export function channelName(name, id) {
  return `${name.toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-|-$/g, '').slice(0, 55) || 'team'}-${id.slice(0, 8)}`;
}
export function channelPermissions(guild, role, bot) {
  return [
    { id: guild, type: 0, deny: '1024', allow: '0' },
    { id: role, type: 0, allow: '68608', deny: '0' }, // View, send, history
    { id: bot, type: 1, allow: '268504080', deny: '0' } // plus manage channel/permissions
  ];
}

async function syncTeam(job, token, deadline) {
  const team_id = job.id;
  const call = (path, options = {}) => discord(path, { ...options, deadline });
  const context = await rpc('context', { token, kind: 'team', team_id });
  const guild = `/guilds/${process.env.DISCORD_GUILD_ID}`;
  const marker = `datajam:${team_id}`;
  let role = context.resource?.role_id;
  let channel = context.resource?.channel_id;
  // Stable markers recover creates whose response/DB persistence was interrupted.
  const roles = await call(`${guild}/roles`);
  role = roles.find(r => r.id === role)?.id || roles.find(r => r.name.endsWith(`[${marker}]`))?.id;
  const channels = await call(`${guild}/channels`);
  channel = channels.find(c => c.id === channel)?.id || channels.find(c => c.topic === marker)?.id;
  if (!context.team) {
    if (channel) await call(`/channels/${channel}`, { method: 'DELETE', missingOK: true });
    if (role) await call(`${guild}/roles/${role}`, { method: 'DELETE', missingOK: true });
    // Retain IDs as tombstones so user retries can still remove old roles.
    return;
  }
  const name = `${context.team.name.slice(0, 48)} [${marker}]`;
  if (!role) role = (await call(`${guild}/roles`, { method: 'POST', body: { name, permissions: '0', mentionable: false, hoist: false } })).id;
  else await call(`${guild}/roles/${role}`, { method: 'PATCH', body: { name, permissions: '0', mentionable: false, hoist: false } });
  await rpc('save_team', { token, team_id, role_id: role, channel_id: channel || null });
  const bot = await call('/users/@me');
  const data = { name: channelName(context.team.name, team_id), topic: marker,
    permission_overwrites: channelPermissions(process.env.DISCORD_GUILD_ID, role, bot.id) };
  if (!channel) channel = (await call(`${guild}/channels`, { method: 'POST', body: { ...data, type: 0 } })).id;
  else await call(`/channels/${channel}`, { method: 'PATCH', body: data });
  await rpc('save_team', { token, team_id, role_id: role, channel_id: channel });
}

async function syncUser(job, token, deadline) {
  const user_id = job.id;
  const context = await rpc('context', { token, kind: 'user', user_id });
  if (!context.link) return;
  const path = `/guilds/${process.env.DISCORD_GUILD_ID}/members/${context.link.discord_id}`;
  const call = (p, options = {}) => discord(p, { ...options, deadline });
  const member = await call(path, { missingOK: true });
  if (!member) {
    await rpc('save_user', { token, user_id, team_id: null, needs_reconnect: true });
    return;
  }
  const desired = context.team_id && context.resource?.channel_id ? context.resource.role_id : null;
  // Revoke before granting; only touch roles owned by this integration.
  for (const role of member.roles.filter(r => context.roles.includes(r) && r !== desired)) {
    await call(`${path}/roles/${role}`, { method: 'DELETE', missingOK: true });
  }
  if (context.team_id && !desired) throw new Error('Team Discord channel is still being prepared.');
  if (desired) {
    // Read current membership immediately before granting. Revisions retain concurrent changes.
    const latest = await rpc('context', { token, kind: 'user', user_id });
    if (latest.team_id !== context.team_id || latest.resource?.role_id !== desired) throw new Error('Team changed; retrying current membership.');
    await call(`${path}/roles/${desired}`, { method: 'PUT' });
  }
  await rpc('save_user', { token, user_id, team_id: context.team_id, needs_reconnect: false });
}

export async function runDiscord({ budgetMs = 18000, maxJobs = 3 } = {}) {
  if (!configured()) return { configured: false, processed: 0 };
  const deadline = Date.now() + budgetMs;
  let processed = 0;
  while (processed < maxJobs && Date.now() < deadline - 1000) {
    const token = randomUUID();
    const job = await rpc('claim', { token });
    if (!job.id) return { processed, busy: !!job.busy };
    let failure;
    try { await (job.kind === 'team' ? syncTeam : syncUser)(job, token, deadline); }
    catch (error) { failure = error; }
    await rpc('finish', { token, kind: job.kind, id: job.id, revision: job.revision,
      ...(failure ? { error: failure instanceof DiscordError ? failure.message : 'Synchronization interrupted; retry queued.', retry_after: failure.retryAfter || 0 } : {}) });
    processed++;
    // Stop the batch on errors, particularly global rate limits.
    if (failure) return { processed, retrying: true };
  }
  return { processed };
}

export async function kickDiscord() {
  try { return await runDiscord({ budgetMs: 9000, maxJobs: 2 }); }
  catch { return { retrying: true }; } // DB trigger already persisted the work.
}
