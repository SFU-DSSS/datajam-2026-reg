import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import handler from '../api/discord.js';
import syncHandler from '../api/discord-sync.js';
import { runDiscord, discord, channelPermissions, hashState } from '../lib/discord.js';

const originalFetch = globalThis.fetch;
const originalEnv = { ...process.env };
const teamId = '00000000-0000-4000-8000-000000000001';
const userId = '00000000-0000-4000-8000-000000000002';
const roleId = '111111111111111111', channelId = '222222222222222222';
const discordId = '333333333333333333', guildId = '444444444444444444', botId = '555555555555555555';
const json = (value, status = 200) => new Response(status === 204 ? null : JSON.stringify(value), { status, headers: { 'Content-Type': 'application/json' } });
function response() { return { setHeader() {}, status(code) { this.code = code; return this; }, json(value) { this.body = value; } }; }
beforeEach(() => {
  Object.assign(process.env, { SUPABASE_URL:'https://db.example', SUPABASE_ANON_KEY:'public', SUPABASE_SERVICE_ROLE_KEY:'server-secret',
    DISCORD_CLIENT_ID:botId, DISCORD_CLIENT_SECRET:'oauth-secret', DISCORD_BOT_TOKEN:'bot-secret', DISCORD_GUILD_ID:guildId,
    DISCORD_REDIRECT_URI:'https://portal.example/discord/callback', CRON_SECRET:'scheduler-secret' });
});
afterEach(() => { globalThis.fetch = originalFetch; process.env = { ...originalEnv }; });

test('Discord endpoints reject anonymous requests and invalid scheduler secrets without network calls', async () => {
  globalThis.fetch = () => { throw new Error('Unexpected request'); };
  for (const [fn, req, expected] of [
    [handler,{method:'GET',headers:{}},405], [handler,{method:'POST',headers:{},body:{action:'start'}},401],
    [handler,{method:'POST',headers:{authorization:'Bearer caller'},body:{action:'complete',state:'bad',code:'x'}},400],
    [syncHandler,{method:'GET',headers:{}},401], [syncHandler,{method:'GET',headers:{authorization:'Bearer wrong'}},401]
  ]) { const res = response(); await fn(req,res); assert.equal(res.code,expected); }
});

test('OAuth start binds a hashed random state to caller and uses exact redirect/scopes', async () => {
  let sent;
  globalThis.fetch = async (url, options) => {
    assert.equal(url,'https://db.example/rest/v1/rpc/discord_user');
    assert.equal(options.headers.Authorization,'Bearer caller');
    assert.equal(options.headers.apikey,'public');
    sent = JSON.parse(options.body);
    return json({});
  };
  const res = response(); await handler({method:'POST',headers:{authorization:'Bearer caller'},body:{action:'start',team_id:'attacker-selected'}},res);
  assert.equal(res.code,200);
  const url = new URL(res.body.url);
  assert.equal(url.searchParams.get('scope'),'identify guilds.join');
  assert.equal(url.searchParams.get('redirect_uri'),process.env.DISCORD_REDIRECT_URI);
  assert.equal(sent.payload.state_hash,hashState(res.body.state));
  assert.equal(sent.payload.team_id,undefined);
  assert.equal(url.searchParams.get('state'),res.body.state);
});

test('OAuth callback rejects mismatched identity/state before exchanging a Discord code', async () => {
  let calls = 0;
  globalThis.fetch = async (url, options) => {
    calls++; assert.match(url,/discord_user$/);
    assert.equal(JSON.parse(options.body).action,'consume');
    return json({code:'P0001',message:'Discord authorization expired or was already used.'},400);
  };
  const res = response(); await handler({method:'POST',headers:{authorization:'Bearer other-user'},body:{action:'complete',state:'a'.repeat(64),code:'code'}},res);
  assert.equal(res.code,400); assert.equal(calls,1);
});

test('OAuth uses verified identity, joins with user token, and never persists OAuth credentials', async () => {
  const serviceBodies = [];
  const events = [];
  globalThis.fetch = async (url, options) => {
    if (url.includes('/rpc/')) {
      const body = JSON.parse(options.body); events.push(body.action);
      if (url.endsWith('discord_service')) {
        assert.equal(options.headers.Authorization,'Bearer server-secret'); serviceBodies.push(body);
      } else assert.equal(options.headers.Authorization,'Bearer caller');
      return json(body.action === 'consume' ? {user_id:userId} : body.action === 'status' ? {connected:true,channel_id:null} : {});
    }
    if (url.endsWith('/oauth2/token')) {
      assert.equal(options.body.get('redirect_uri'),process.env.DISCORD_REDIRECT_URI);
      return json({access_token:'oauth-access',refresh_token:'oauth-refresh',scope:'identify guilds.join'});
    }
    if (url.endsWith('/users/@me')) { assert.equal(options.headers.Authorization,'Bearer oauth-access'); return json({id:discordId}); }
    assert.equal(url,`https://discord.com/api/v10/guilds/${guildId}/members/${discordId}`);
    assert.equal(options.headers.Authorization,'Bot bot-secret');
    assert.deepEqual(JSON.parse(options.body),{access_token:'oauth-access'});
    return json(null,204);
  };
  const res = response(); await handler({method:'POST',headers:{authorization:'Bearer caller'},body:{action:'complete',state:'a'.repeat(64),code:'code',user_id:'forged',discord_id:'forged'}},res);
  assert.equal(res.code,200);
  assert.deepEqual(serviceBodies.find(x => x.action === 'link').payload,{user_id:userId,discord_id:discordId});
  assert.ok(events.indexOf('consume') < events.indexOf('link'));
  assert.doesNotMatch(JSON.stringify(serviceBodies),/oauth-access|oauth-refresh|forged/);
});

function workerFixture(context, discordFetch, onService = () => {}) {
  let claimed = false;
  const actions = [];
  globalThis.fetch = async (url, options) => {
    if (url.includes('/rpc/')) {
      const body = JSON.parse(options.body); actions.push(body); onService(body);
      if (body.action === 'claim') { if (claimed) return json({}); claimed = true; return json({kind:context.kind,id:context.kind === 'team' ? teamId : userId,revision:1}); }
      if (body.action === 'context') return json(context);
      return json({});
    }
    return discordFetch(url.replace('https://discord.com/api/v10',''),options);
  };
  return actions;
}

test('Worker recovers interrupted creates by marker and enforces private channel overwrites', async () => {
  const changes = [];
  const actions = workerFixture({kind:'team',team:{id:teamId,name:'New name'},resource:null}, async (path, options) => {
    if (path.endsWith('/roles') && options.method === 'GET') return json([{id:roleId,name:`Old name [datajam:${teamId}]`}]);
    if (path.endsWith('/channels') && options.method === 'GET') return json([{id:channelId,topic:`datajam:${teamId}`}]);
    if (path === '/users/@me') return json({id:botId});
    assert.equal(options.method,'PATCH'); changes.push({path,body:JSON.parse(options.body)}); return json({});
  });
  await runDiscord();
  assert.equal(changes.length,2);
  const overwrites = changes.find(c => c.path === `/channels/${channelId}`).body.permission_overwrites;
  assert.deepEqual(overwrites,channelPermissions(guildId,roleId,botId));
  assert.equal(overwrites[0].deny,'1024');
  assert.equal(actions.at(-1).action,'claim');
  assert.equal(actions.find(a => a.action === 'finish').payload.error,undefined);
  assert.equal(actions.filter(a => a.action === 'save_team').at(-1).payload.channel_id,channelId);
});

test('Worker removes only managed old roles before assigning the current team role', async () => {
  const operations = [];
  const actions = workerFixture({kind:'user',link:{discord_id:discordId},team_id:teamId,resource:{role_id:roleId,channel_id:channelId},roles:['old-role',roleId]}, async (path, options) => {
    if (options.method === 'GET') return json({roles:['old-role','unrelated-role']});
    operations.push(`${options.method} ${path}`); return json(null,204);
  });
  await runDiscord();
  assert.deepEqual(operations,[`DELETE /guilds/${guildId}/members/${discordId}/roles/old-role`,`PUT /guilds/${guildId}/members/${discordId}/roles/${roleId}`]);
  assert.equal(actions.find(a => a.action === 'save_user').payload.team_id,teamId);
});

test('Worker never grants access after a concurrent membership change', async () => {
  const context = {kind:'user',link:{discord_id:discordId},team_id:teamId,resource:{role_id:roleId,channel_id:channelId},roles:[roleId]};
  let reads = 0;
  const actions = workerFixture(context, async (_, options) => {
    assert.equal(options.method,'GET'); return json({roles:[]});
  }, body => { if (body.action === 'context' && ++reads === 2) context.team_id = null; });
  const result = await runDiscord();
  assert.equal(result.retrying,true);
  assert.ok(actions.find(a => a.action === 'finish').payload.error);
  assert.equal(actions.some(a => a.action === 'save_user'),false);
});

test('Removal retries remain durable on rate limit and expose no provider response text', async () => {
  const actions = workerFixture({kind:'user',link:{discord_id:discordId},team_id:null,roles:[roleId]}, async (_, options) => {
    if (options.method === 'GET') return json({roles:[roleId]});
    return json({retry_after:65,message:'sensitive provider detail'},429);
  });
  assert.equal((await runDiscord()).retrying,true);
  const finish = actions.find(a => a.action === 'finish').payload;
  assert.equal(finish.retry_after,65);
  assert.equal(finish.error,'Discord API returned 429.');
  assert.equal(actions.some(a => a.action === 'save_user'),false);
});

test('Disband deletes channel before role; missing member requires reconnect', async () => {
  const deletes = [];
  workerFixture({kind:'team',team:null,resource:{role_id:roleId,channel_id:channelId}},async (path, options) => {
    if (options.method === 'DELETE') { deletes.push(path); return json(null,204); }
    return json(path.endsWith('/roles') ? [{id:roleId}] : [{id:channelId}]);
  });
  await runDiscord();
  assert.deepEqual(deletes,[`/channels/${channelId}`,`/guilds/${guildId}/roles/${roleId}`]);
  const actions = workerFixture({kind:'user',link:{discord_id:discordId},team_id:teamId,roles:[]},async () => json({},404));
  await runDiscord();
  assert.equal(actions.find(a => a.action === 'save_user').payload.needs_reconnect,true);
});

test('Discord 5xx/network errors are failures, not missing resources', async () => {
  globalThis.fetch = async () => json({message:'secret'},500);
  await assert.rejects(discord('/users/@me',{missingOK:true}), /returned 500/);
  globalThis.fetch = async () => { throw new Error('network disconnected'); };
  await assert.rejects(discord('/users/@me',{missingOK:true}), /network disconnected/);
});
