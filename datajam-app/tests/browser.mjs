// Runs against INSTALLED Google Chrome. No browser download is needed.
// Auth responses are fixtures; application mutations execute the real SQL in PGlite.
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { PGlite } from '@electric-sql/pglite';
import { readFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { once } from 'node:events';

const root = new URL('../', import.meta.url);
const origin = 'http://127.0.0.1:3107';
const db = new PGlite();
let browser, server;
const ids = [1, 2].map(n => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`);
const errors = [];
function session(id) {
  const payload = { sub: id, exp: Math.floor(Date.now() / 1000) + 3600, role: 'authenticated' };
  return {
    access_token: `eyJhbGciOiJIUzI1NiJ9.${Buffer.from(JSON.stringify(payload)).toString('base64url')}.test`,
    refresh_token: 'fixture-refresh', token_type: 'bearer', expires_in: 3600,
    user: { id, aud: 'authenticated', email: `${id.slice(-1)}@example.com`, email_confirmed_at: new Date().toISOString(), app_metadata: {}, user_metadata: {}, created_at: new Date().toISOString() }
  };
}
async function pageFor(i, existingContext) {
  const context = existingContext || await browser.newContext();
  const page = await context.newPage();
  page.on('pageerror', e => errors.push(e.message));
  page.on('dialog', d => d.accept());
  await page.route('**/api/config', route => route.fulfill({ json: { url: 'https://fixture.supabase.co', key: 'public-fixture', captchaSiteKey: '' } }));
  await page.route('https://fixture.supabase.co/auth/v1/**', route => {
    const path = new URL(route.request().url()).pathname;
    return route.fulfill({ json: path.endsWith('/user') ? session(ids[i]).user : path.endsWith('/signup') ? { user: session(ids[i]).user, session: null } : path.endsWith('/logout') || path.endsWith('/recover') ? {} : session(ids[i]) });
  });
  await page.route('**/api/action', async route => {
    const { action, data } = route.request().postDataJSON();
    const result = await db.transaction(async tx => {
      await tx.query("select set_config('request.jwt.claim.sub', $1, true)", [ids[i]]);
      await tx.exec('set local role authenticated');
      return (await tx.query('select public.registration_action($1, $2) as result', [action, JSON.stringify(data)])).rows[0].result;
    });
    await route.fulfill({ status: result.error ? 400 : 200, json: result });
  });
  await page.route('**/api/admin', async route => {
    const { action, data } = route.request().postDataJSON();
    try {
      const result = await db.transaction(async tx => {
        await tx.query("select set_config('request.jwt.claim.sub', $1, true)", [ids[i]]);
        await tx.exec('set local role authenticated');
        return (await tx.query('select public.admin_action($1, $2) as result', [action, JSON.stringify(data)])).rows[0].result;
      });
      if (result.email_id) result.email_notice = 'Email remains queued.';
      await route.fulfill({ json: result });
    } catch (error) { await route.fulfill({ status: 403, json: { error: error.message } }); }
  });
  return page;
}
async function status(page, text) {
  try {
    await page.waitForFunction(t => document.querySelector('#message').textContent.includes(t), text, { timeout: 10000 });
  } catch {
    throw new Error(`Expected status '${text}', got '${await page.locator('#message').textContent()}'. Browser errors: ${errors.join('; ')}`);
  }
}
async function login(page) {
  await page.locator('#auth-form input[name=email]').fill('login@example.com');
  await page.locator('#auth-form input[name=password]').fill('test-password');
  await page.getByRole('button', { name: 'Log in', exact: true }).click();
  await status(page, 'Complete your profile');
}
async function profile(page, name) {
  for (const [key, value] of Object.entries({ name, institution: 'Any University', student_number: '1234', student_email: 'different@school.example', discord_username: name }))
    await page.locator(`#profile-form input[name=${key}]`).fill(value);
  assert.equal(await page.locator('input[name=photo_consent]:checked').count(), 0);
  await page.locator('input[name=photo_consent][value=false]').check();
  await page.getByRole('button', { name: 'Save profile', exact: true }).click();
  await status(page, 'Profile saved');
}
try {
  await db.exec(`create role anon; create role authenticated; create schema auth;
    create table auth.users(id uuid primary key, email_confirmed_at timestamptz, email text);
    create function auth.uid() returns uuid language sql as 'select nullif(current_setting(''request.jwt.claim.sub'',true),'''')::uuid';
    grant usage on schema public,auth to authenticated,anon;`);
  await db.exec(await readFile(new URL('../supabase/001_registration.sql', import.meta.url), 'utf8'));
  await db.exec(await readFile(new URL('../supabase/002_photo_consent.sql', import.meta.url), 'utf8'));
  await db.exec(await readFile(new URL('../supabase/003_admin.sql', import.meta.url), 'utf8'));
  await db.exec(await readFile(new URL('../supabase/004_organizer_tools.sql', import.meta.url), 'utf8'));
  for (const id of ids) await db.query('insert into auth.users values ($1,now(),$2)', [id, `${id.slice(-1)}@example.com`]);
  server = spawn(process.execPath, ['server.js'], { cwd: root, env: { ...process.env, PORT: '3107' }, stdio: ['ignore', 'pipe', 'inherit'] });
  await once(server.stdout, 'data');
  browser = await chromium.launch(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH, headless: true } : { channel: 'chrome', headless: true });
  const a = await pageFor(0);
  await a.goto(origin);
  await a.locator('#auth-form input[name=email]').fill('login@example.com');
  await a.locator('#auth-form input[name=password]').fill('test-password');
  await a.getByRole('button', { name: 'Create account', exact: true }).click();
  await status(a, 'Check your login email');
  await login(a); await profile(a, 'Captain');
  await a.reload(); await status(a, 'Account loaded');
  assert.equal(await a.locator('input[name=photo_consent][value=false]').isChecked(), true);
  await a.locator('#profile-details summary').click();
  await a.locator('input[name=photo_consent][value=true]').check();
  await a.getByRole('button', { name: 'Save profile', exact: true }).click();
  await status(a, 'Profile saved');
  await a.reload(); await status(a, 'Account loaded');
  assert.equal(await a.locator('input[name=photo_consent][value=true]').isChecked(), true);
  await a.locator('#create-form input').fill('First team');
  await a.getByRole('button', { name: 'Create team', exact: true }).click();
  await status(a, 'Team created');
  const oldCode = await a.locator('#invite-code').inputValue();
  assert.equal(oldCode.length, 12);
  let b = await pageFor(1);
  await b.goto(`${origin}/?invite=${oldCode}`);
  await login(b);
  // Email verification commonly returns in another tab of the same browser.
  const invitationTab = b;
  b = await pageFor(1, invitationTab.context());
  await b.goto(origin);
  await status(b, 'Complete your profile');
  await invitationTab.close();
  await profile(b, 'Member');
  assert.equal(await b.locator('#join-form input').inputValue(), oldCode);
  await b.getByRole('button', { name: 'Join team', exact: true }).click();
  await status(b, 'You joined');
  assert.equal(await b.locator('#captain').isVisible(), false);
  assert.equal(await b.locator('#roster li').count(), 2);
  await a.reload(); await status(a, 'Account loaded');
  await a.locator('#rename-form input').fill('Renamed team');
  await a.getByRole('button', { name: 'Rename team', exact: true }).click();
  await status(a, 'Team renamed');
  assert.equal(await a.locator('#team-name').textContent(), 'Renamed team');
  await a.getByRole('button', { name: 'Regenerate invitations', exact: true }).click();
  await status(a, 'New invitations');
  assert.notEqual(await a.locator('#invite-code').inputValue(), oldCode);
  await a.getByRole('button', { name: 'Remove', exact: true }).click();
  await status(a, 'Member removed');
  await b.reload(); await status(b, 'Account loaded');
  await b.locator('#join-form input').fill(oldCode);
  await b.getByRole('button', { name: 'Join team', exact: true }).click();
  await status(b, 'Invalid or expired');
  await b.locator('#join-form input').fill(await a.locator('#invite-code').inputValue());
  await b.getByRole('button', { name: 'Join team', exact: true }).click();
  await status(b, 'You joined');
  await a.reload(); await status(a, 'Account loaded');
  await a.getByRole('button', { name: 'Make captain', exact: true }).click();
  await status(a, 'Captaincy transferred');
  assert.equal(await a.locator('#captain').isVisible(), false);
  await a.getByRole('button', { name: 'Leave team', exact: true }).click();
  await status(a, 'You left');
  await b.reload(); await status(b, 'Account loaded');
  assert.equal(await b.locator('#captain').isVisible(), true);
  await b.getByRole('button', { name: 'Leave team', exact: true }).click();
  await status(b, 'You left');
  await a.getByRole('button', { name: 'Log out', exact: true }).click();
  await status(a, 'Logged out');
  await a.locator('#auth-form input[name=email]').fill('login@example.com');
  await a.getByRole('button', { name: 'Send password reset', exact: true }).click();
  await status(a, 'reset link');
  const recovery = session(ids[0]);
  // An email click loads a new document; a same-page hash change would not reinitialize Auth.
  await a.goto('about:blank');
  await a.goto(`${origin}/#access_token=${recovery.access_token}&refresh_token=${recovery.refresh_token}&expires_in=3600&token_type=bearer&type=recovery`);
  await status(a, 'Choose your new password');
  await a.locator('#password-form input').fill('new-test-password');
  await a.getByRole('button', { name: 'Save password', exact: true }).click();
  await status(a, 'Password updated');
  await a.getByRole('button', { name: 'Organizer dashboard', exact: true }).click();
  await status(a, 'Organizer access required');
  assert.equal(await a.locator('#admin-panel').isVisible(), false);
  await db.query('insert into registration_private.admins values ($1)', [ids[0]]);
  await a.getByRole('button', { name: 'Organizer dashboard', exact: true }).click();
  await status(a, 'Organizer dashboard loaded');
  assert.equal(await a.locator('#admin-rows article').count(), 2);
  const registration = a.locator('#admin-rows article').first();
  await registration.locator('select').selectOption('accepted');
  await registration.getByRole('button', { name: 'Save status' }).click();
  await status(a, 'Registration updated');
  assert.equal(await a.locator('#admin-history details').count(), 1);
  await a.locator('#admin-filter').selectOption('accepted');
  assert.equal(await a.locator('#admin-rows article').count(), 1);
  await a.getByRole('button', { name: 'Select visible registrations' }).click();
  await a.locator('#admin-email input').fill('Event details');
  await a.locator('#admin-email textarea').fill('Please bring a laptop.');
  await a.getByRole('button', { name: 'Preview email', exact: true }).click();
  assert.match(await a.locator('#email-preview-text').textContent(), /To \(1 individual emails\)/);
  await a.getByRole('button', { name: 'Send emails', exact: true }).click();
  await status(a, '1/1: Email remains queued');
  await a.waitForFunction(() => document.querySelectorAll('#admin-history details').length === 2);
  await a.setViewportSize({ width: 390, height: 844 });
  assert.equal(await a.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
  await a.getByRole('button', { name: 'Log out', exact: true }).click();
  await status(a, 'Logged out');
  assert.equal(await a.locator('#admin-rows article').count(), 0);
  assert.deepEqual(errors, []);
  console.log('Chrome smoke test passed: participant flows, organizer access denial, acceptance, filtering, email preview/queue, logout data clearing, and mobile layout. Auth and email transport were mocked; SQL was real.');
} finally {
  await browser?.close(); server?.kill(); await db.close();
}
