// Real Next frontend + registration API handlers + SQL. Auth, Discord HTTP and email delivery are fixtures.
// Run with Node 22 after installing both folders. Uses installed Google Chrome.
import assert from 'node:assert/strict';
import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { chromium } from 'playwright';
import { PGlite } from '@electric-sql/pglite';
import actionHandler from '../api/action.js';
import adminHandler from '../api/admin.js';

const db = new PGlite();
const ids = [1,2,3,4].map(n => `00000000-0000-4000-8000-${String(n).padStart(12,'0')}`);
const origin = 'http://127.0.0.1:3119';
let browser, next, provider;
let log = '', recoveryRequests = 0, passwordUpdates = 0;
const errors = [];
const emailFor = i => `person${i}@example.com`;
function session(i) {
  const user = { id: ids[i], aud: 'authenticated', role: 'authenticated', email: emailFor(i), email_confirmed_at: new Date().toISOString(), app_metadata: {}, user_metadata: {}, created_at: new Date().toISOString() };
  return { access_token: `eyJhbGciOiJIUzI1NiJ9.${Buffer.from(JSON.stringify({ sub: user.id, exp: Math.floor(Date.now()/1000)+3600, role: 'authenticated' })).toString('base64url')}.fixture`, refresh_token: `fixture-${i}`, token_type: 'bearer', expires_in: 3600, user };
}
async function rpc(i, name, payload) {
  return db.transaction(async tx => {
    await tx.query("select set_config('request.jwt.claim.sub',$1,true)", [ids[i]]);
    await tx.exec('set local role authenticated');
    return (await tx.query(`select public.${name}($1,$2::jsonb) as result`, [payload.action, JSON.stringify(payload.payload || {})])).rows[0].result;
  });
}
async function profile(i) {
  await rpc(i, 'registration_action', { action: 'profile', payload: { name: `Student ${i}`, institution: 'SFU', student_number: `${i}`, student_email: `student${i}@school.example`, discord_username: `student${i}`, photo_consent: false } });
}
async function login(page, i) {
  await page.goto(`${origin}/auth/login`);
  await page.getByLabel('Email', { exact: true }).fill(emailFor(i));
  await page.getByLabel('Password', { exact: true }).fill('fixture-password');
  await page.getByRole('button', { name: 'Sign In', exact: true }).click();
  try { await page.waitForURL('**/dashboard') } catch { throw new Error(`Login failed: ${await page.locator('body').innerText()}`) }
  await page.getByRole('heading', { name: 'Your Registration_' }).waitFor();
}
async function confirm(page) { await page.getByRole('button', { name: 'CONFIRM', exact: true }).click(); }
async function settled(page) { await page.getByRole('button', { name: 'REFRESH', exact: true }).waitFor(); await page.waitForFunction(() => [...document.querySelectorAll('button')].some(b => b.textContent === 'REFRESH' && !b.disabled)); }
try {
  await db.exec(`create role anon; create role authenticated; create schema auth;
    create table auth.users(id uuid primary key,email_confirmed_at timestamptz,email text);
    create function auth.uid() returns uuid language sql as 'select nullif(current_setting(''request.jwt.claim.sub'',true),'''')::uuid';
    grant usage on schema public,auth to authenticated,anon;`);
  for (const file of ['001_registration.sql','002_photo_consent.sql','003_admin.sql','004_organizer_tools.sql']) await db.exec(await readFile(new URL(`../supabase/${file}`, import.meta.url),'utf8'));
  for (let i=0;i<ids.length;i++) await db.query('insert into auth.users values($1,now(),$2)', [ids[i],emailFor(i)]);
  await db.query('insert into registration_private.admins values($1)', [ids[0]]);
  for (let i=1;i<ids.length;i++) await profile(i);
  await rpc(0,'admin_action',{ action: 'decision', payload: { user_id: ids[3], status: 'rejected' } });
  const initialTeam = await rpc(0,'admin_action',{ action: 'team_create', payload: { user_id: ids[1], name: 'Original team' } });
  await rpc(0,'admin_action',{ action: 'team_assign', payload: { user_id: ids[2], team_id: initialTeam.team_id } });
  provider = http.createServer(async (req,res) => {
    res.status = code => { res.statusCode = code; return res; };
    res.json = data => { res.setHeader('Content-Type','application/json'); res.end(JSON.stringify(data)); };
    res.setHeader('Access-Control-Allow-Origin',origin);
    res.setHeader('Access-Control-Allow-Headers','authorization,apikey,content-type,x-client-info,x-supabase-api-version');
    res.setHeader('Access-Control-Allow-Methods','GET,POST,PUT,OPTIONS');
    if (req.method === 'OPTIONS') return res.status(204).end();
    try {
      let raw = ''; for await (const chunk of req) raw += chunk;
      const body = raw ? JSON.parse(raw) : {};
      const path = new URL(req.url,'http://localhost').pathname;
      if (path === '/api/action' || path === '/api/admin') { req.body = body; return await (path === '/api/admin' ? adminHandler : actionHandler)(req,res); }
      const token = req.headers.authorization?.split(' ')[1];
      let i = token?.split('.').length === 3 ? ids.indexOf(JSON.parse(Buffer.from(token.split('.')[1],'base64url')).sub) : -1;
      if (path.endsWith('/token')) { i = body.email ? ids.findIndex((_, n) => emailFor(n) === body.email) : Number(body.refresh_token?.split('-').at(-1)); return res.json(session(i)); }
      if (path.endsWith('/recover')) { recoveryRequests++; assert.match(body.redirect_to || req.url, /callback|recover/); return res.json({}); }
      if (path.endsWith('/logout')) return res.json({});
      if (path.endsWith('/user')) { if (req.method === 'PUT') passwordUpdates++; return res.json(session(i).user); }
      if (path.startsWith('/rest/v1/rpc/')) {
        const name = path.split('/').at(-1);
        if (!['registration_action','admin_action'].includes(name)) return res.status(404).json({});
        return res.json(await rpc(i,name,body));
      }
      return res.status(404).json({ error: 'Fixture route not found' });
    } catch (error) { return res.status(400).json({ code: 'P0001', message: error.message }); }
  }).listen(0,'127.0.0.1');
  await once(provider,'listening');
  const providerOrigin = `http://127.0.0.1:${provider.address().port}`;
  Object.assign(process.env, { SUPABASE_URL: providerOrigin, SUPABASE_ANON_KEY: 'fixture-public' });
  delete process.env.BREVO_API_KEY; delete process.env.BREVO_SENDER_EMAIL;
  next = spawn(process.execPath, ['node_modules/next/dist/bin/next','dev','--webpack','--port','3119','--hostname','127.0.0.1'], { cwd: new URL('../../v0_hackml-portal-main/',import.meta.url), env: { ...process.env, NEXT_PUBLIC_SUPABASE_URL: providerOrigin, NEXT_PUBLIC_SUPABASE_ANON_KEY: 'fixture-public', DATAJAM_API_URL: providerOrigin, NEXT_PUBLIC_TURNSTILE_SITE_KEY: '', NEXT_TELEMETRY_DISABLED: '1' }, stdio:['ignore','pipe','pipe'] });
  next.stdout.on('data', chunk => log += chunk); next.stderr.on('data', chunk => log += chunk);
  for (let attempt=0;attempt<90;attempt++) { if (/Ready in/.test(log)) break; if (next.exitCode !== null) throw new Error(log); await new Promise(resolve => setTimeout(resolve,1000)); }
  if (!/Ready in/.test(log)) throw new Error(log);
  // Compile callback before OAuth navigation so dev Fast Refresh cannot interrupt the one-time exchange.
  await fetch(`${origin}/discord/callback`);
  browser = await chromium.launch(process.env.CHROME_PATH ? { executablePath:process.env.CHROME_PATH, headless:true } : { channel:'chrome', headless:true });
  const page = await browser.newPage(); page.setDefaultTimeout(30000); page.on('pageerror',e => errors.push(e.message));
  await login(page,0);
  await page.getByRole('link',{ name:'ORGANIZER DASHBOARD',exact:true }).click();
  await page.getByRole('heading',{ name:'Manage DataJam_' }).waitFor();
  assert.equal(await page.locator('article').count(),3);
  await page.getByRole('button',{ name:'ACCEPT ALL PENDING (2)',exact:true }).click(); await confirm(page); await settled(page);
  assert.equal((await rpc(1,'registration_action',{ action:'me' })).admission_status,'accepted');
  assert.equal((await rpc(3,'registration_action',{ action:'me' })).admission_status,'rejected');
  await page.getByLabel('Filter applications by status').selectOption('accepted');
  assert.equal(await page.locator('article').count(),2);
  await page.getByRole('button',{ name:'SELECT SHOWN',exact:true }).click();
  await page.getByRole('button',{ name:'EMAIL SELECTED',exact:true }).click();
  await page.getByLabel('Subject',{ exact:true }).fill('Bring a laptop');
  await page.getByLabel('Message',{ exact:true }).fill('Doors open at 9. Please bring your laptop.');
  await page.getByRole('button',{ name:'PREVIEW EMAIL',exact:true }).click();
  await page.getByRole('heading',{ name:'Review your message' }).waitFor();
  await page.getByRole('button',{ name:'SEND MESSAGE',exact:true }).click(); await confirm(page); await settled(page);
  assert.equal((await rpc(0,'admin_action',{ action:'list' })).emails.filter(e => e.kind === 'manual').length,2);
  await page.getByRole('button',{ name:'TEAMS',exact:true }).click();
  await page.getByLabel('Rename Original team').fill('Renamed by organizer');
  await page.getByRole('button',{ name:'RENAME',exact:true }).click(); await confirm(page); await settled(page);
  await page.getByRole('heading',{ name:'Renamed by organizer',exact:true }).waitFor();
  await page.getByRole('button',{ name:'MAKE CAPTAIN',exact:true }).click(); await confirm(page); await settled(page);
  assert.equal((await rpc(2,'registration_action',{ action:'me' })).permissions.manage_team,true);
  await page.getByLabel('Add or move a participant to Renamed by organizer').selectOption(ids[3]);
  await page.getByRole('button',{ name:'ADD / MOVE MEMBER',exact:true }).click(); await confirm(page); await settled(page);
  assert.equal((await rpc(3,'registration_action',{ action:'me' })).team.members.length,3);
  await page.setViewportSize({ width:390,height:844 });
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),true);
  await page.screenshot({ path:'/tmp/datajam-organizer-mobile.png',fullPage:true });
  await page.setViewportSize({ width:1440,height:1000 });
  await page.getByRole('button',{ name:'APPLICATIONS',exact:true }).click();
  await page.screenshot({ path:'/tmp/datajam-organizer-desktop.png',fullPage:true });

  const participant = await browser.newPage(); participant.setDefaultTimeout(30000); participant.on('pageerror',e => errors.push(e.message));
  let discordConnected = false, discordCompletes = 0;
  const discordRequests = [];
  participant.on('request', r => { if (r.url().includes('discord')) discordRequests.push({ url:r.url(),method:r.method(),data:r.postData() }); });
  const discordState = 'a'.repeat(64);
  await participant.route('**/api/discord', async route => {
    const request = route.request();
    assert.match(request.headers().authorization,/^Bearer /);
    const body = request.postDataJSON();
    discordRequests.push(body);
    if (body.action === 'start') return route.fulfill({json:{state:discordState,url:`https://discord.com/oauth2/authorize?state=${discordState}`}});
    if (body.action === 'complete') {
      assert.equal(body.state,discordState); assert.equal(body.code,'fixture-code');
      discordCompletes++; discordConnected = true;
    }
    return route.fulfill({json:{connected:discordConnected,has_team:true,needs_reconnect:false,chat_url:discordConnected ? 'https://discord.com/channels/444444444444444444/222222222222222222' : null}});
  });
  await participant.route('https://discord.com/oauth2/authorize?*', route => route.fulfill({status:302,headers:{location:`${origin}/discord/callback?state=${discordState}&code=fixture-code`}}));
  await login(participant,1);
  await participant.getByRole('button',{name:'Join team Discord',exact:true}).click();
  try { await participant.getByRole('link',{name:'Open team chat',exact:true}).waitFor(); }
  catch { throw new Error(`Discord callback UI failed (url=${participant.url()}, completions=${discordCompletes}, requests=${JSON.stringify(discordRequests)}, errors=${JSON.stringify(errors)}): ${await participant.locator('body').innerText()}`); }
  assert.equal(discordCompletes,1);
  assert.equal(await participant.evaluate(() => sessionStorage.getItem('datajam-discord-state')),null);
  await participant.goto(`${origin}/discord/callback?state=${discordState}&code=forwarded-code`);
  await participant.getByText(/Authorization did not match this browser/).waitFor();
  assert.equal(discordCompletes,1);
  assert.equal(new URL(participant.url()).search,'');
  await participant.goto(`${origin}/dashboard`);
  assert.equal(await participant.getByRole('link',{ name:'ORGANIZER DASHBOARD',exact:true }).count(),0);
  await participant.goto(`${origin}/dashboard/organizer`);
  await participant.getByRole('alert').filter({ hasText: 'Organizer access required.' }).waitFor();
  assert.equal(await participant.locator('article').count(),0);
  await participant.goto(`${origin}/dashboard`);
  await participant.getByRole('button',{ name:'EDIT PROFILE',exact:true }).click();
  assert.equal(await participant.getByRole('radio',{ name:'No, I do not consent to being photographed.' }).isChecked(),true);
  await participant.getByRole('radio',{ name:'Yes, I consent to event photography and these uses.' }).check();
  await participant.getByRole('button',{ name:'SAVE PROFILE',exact:true }).click();
  await participant.getByText('Yes — event photography permitted',{ exact:true }).waitFor();
  assert.equal((await rpc(1,'registration_action',{ action:'me' })).profile.photo_consent,true);

  await page.goto(`${origin}/dashboard`);
  assert.equal(await page.locator('input[name=photo_consent]:checked').count(),0);
  for (const [id,value] of Object.entries({ name:'Organizer',institution:'SFU',student_number:'1234',student_email:'organizer@school.example',discord_username:'organizer' })) await page.locator(`#${id}`).fill(value);
  await page.getByRole('radio',{ name:'No, I do not consent to being photographed.' }).check();
  await page.getByRole('button',{ name:'SUBMIT REGISTRATION',exact:true }).click();
  await page.getByText('No — do not photograph',{ exact:true }).waitFor();
  assert.equal((await rpc(0,'registration_action',{ action:'me' })).profile.photo_consent,false);
  await participant.goto(`${origin}/auth/reset-password`);
  await participant.getByLabel('New password',{ exact:true }).fill('updated-fixture-password');
  await participant.getByLabel('Confirm password',{ exact:true }).fill('updated-fixture-password');
  await participant.getByRole('button',{ name:'SAVE PASSWORD',exact:true }).click();
  await participant.getByRole('status').filter({ hasText: 'Password updated. You can return to your dashboard.' }).waitFor();
  assert.equal(passwordUpdates,1);
  await participant.goto(`${origin}/auth/forgot-password`);
  await participant.getByLabel('Login email',{ exact:true }).fill(emailFor(1));
  await participant.getByRole('button',{ name:'SEND RESET LINK',exact:true }).click();
  await participant.getByText(/If an account matches that email/).waitFor();
  assert.equal(recoveryRequests,1);
  assert.deepEqual(errors,[]);
  console.log('Portal Chrome test passed: Discord connect/callback/chat link and forwarded-callback rejection; organizer access, filters, accept all, email preview/queue, team rename/captain/assignment, photo consent, password forms, and mobile layout. Auth, Discord HTTP and delivery were fixtures; registration API handlers and SQL were real.');
} catch (error) { console.error(log.slice(-6000)); throw error; }
finally { await browser?.close(); next?.kill(); provider?.close(); await db.close(); }
