import { test, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';

let db;
const ids = Array.from({ length: 8 }, (_, i) => `00000000-0000-4000-8000-${String(i + 1).padStart(12, '0')}`);
before(async () => {
  db = new PGlite();
  await db.exec(`
    create role anon; create role authenticated;
    create schema auth;
    create table auth.users (id uuid primary key, email_confirmed_at timestamptz);
    create function auth.uid() returns uuid language sql as
      'select nullif(current_setting(''request.jwt.claim.sub'', true), '''')::uuid';
    grant usage on schema public, auth to authenticated, anon;
  `);
  await db.exec(await readFile(new URL('../supabase/001_registration.sql', import.meta.url), 'utf8'));
  for (const id of ids) await db.query('insert into auth.users values ($1, now())', [id]);
});
after(async () => { await db?.close(); });
beforeEach(async () => {
  await db.exec('truncate registration_private.members, registration_private.teams, registration_private.profiles, registration_private.attempts cascade; update registration_private.settings set max_team_size = 4;');
});
async function call(i, action, payload = {}) {
  // PGlite queues transactions; identity belongs to each transaction, as in PostgREST.
  return db.transaction(async tx => {
    await tx.query("select set_config('request.jwt.claim.sub', $1, true)", [ids[i]]);
    await tx.exec('set local role authenticated');
    const result = await tx.query('select public.registration_action($1, $2::jsonb) as result', [action, JSON.stringify(payload)]);
    return result.rows[0].result;
  });
}
async function profile(i) {
  return call(i, 'profile', { name: `Student ${i}`, institution: 'Any University', student_number: `N-${i}`, student_email: `student${i}@school.example`, discord_username: `student${i}` });
}
async function team() { await profile(0); return (await call(0, 'create', { name: 'Data folks' })).team; }

test('profile gate, validation, verified login, and single-team invariant', async () => {
  assert.equal((await call(0, 'me')).next_step, 'complete_profile');
  assert.match((await call(0, 'create', { name: 'No profile' })).error, /profile/);
  assert.ok((await call(0, 'profile', { name: 'Incomplete' })).error);
  const p = await profile(0);
  assert.equal(p.next_step, 'choose_team');
  assert.equal(p.profile.student_email, 'student0@school.example');
  const created = await call(0, 'create', { name: 'Team' });
  assert.equal(created.team.captain_id, ids[0]);
  assert.equal(created.team.members.length, 1);
  assert.match((await call(0, 'create', { name: 'Second' })).error, /current team/);
  assert.match((await call(0, 'join', { code: created.team.invite_code })).error, /current team/);
  await db.query('update auth.users set email_confirmed_at = null where id = $1', [ids[7]]);
  await assert.rejects(call(7, 'me'), /verified login email/);
  await db.query('update auth.users set email_confirmed_at = now() where id = $1', [ids[7]]);
});

test('capacity holds for competing joins and can be changed to three', async () => {
  const t = await team();
  for (let i = 1; i <= 4; i++) await profile(i);
  const results = await Promise.all([1, 2, 3, 4].map(i => call(i, 'join', { code: t.invite_code })));
  assert.equal(results.filter(r => !r.error).length, 3);
  assert.equal(results.filter(r => r.error === 'This team is full.').length, 1);
  assert.equal((await call(0, 'me')).team.members.length, 4);
  await call(3, 'leave');
  await db.exec('update registration_private.settings set max_team_size = 3');
  assert.equal((await call(4, 'join', { code: t.invite_code })).error, 'This team is full.');
});

test('captain permissions, rotation, removal, transfer, and empty-team deletion', async () => {
  const t = await team();
  await profile(1); await profile(2);
  await call(1, 'join', { code: t.invite_code });
  for (const action of ['rename', 'rotate', 'remove', 'transfer']) {
    assert.match((await call(1, action, { name: 'Hijack', user_id: ids[0] })).error, /Only the captain/);
  }
  assert.match((await call(0, 'leave')).error, /Transfer captaincy/);
  assert.equal((await call(0, 'rename', { name: 'New name' })).team.name, 'New name');
  const rotated = await call(0, 'rotate');
  assert.notEqual(rotated.team.invite_code, t.invite_code);
  assert.match((await call(2, 'join', { code: t.invite_code })).error, /Invalid/);
  assert.match((await call(0, 'transfer', { user_id: ids[2] })).error, /current teammate/);
  const removed = await call(0, 'remove', { user_id: ids[1] });
  assert.notEqual(removed.team.invite_code, rotated.team.invite_code);
  assert.equal((await call(1, 'me')).team, null);
  await call(1, 'join', { code: removed.team.invite_code });
  const transferred = await call(0, 'transfer', { user_id: ids[1] });
  assert.equal(transferred.permissions.manage_team, false);
  assert.equal((await call(1, 'me')).permissions.manage_team, true);
  await call(0, 'leave');
  assert.equal((await call(1, 'leave')).team, null);
  assert.equal((await db.query('select count(*)::int as n from registration_private.teams')).rows[0].n, 0);
});

test('rosters omit private fields; outsiders cannot read tables or invoke anonymously', async () => {
  const t = await team(); await profile(1);
  const joined = await call(1, 'join', { code: t.invite_code });
  assert.deepEqual(Object.keys(joined.team.members[0]).sort(), ['discord_username', 'id', 'name']);
  assert.equal((await call(2, 'me')).team, null);
  await assert.rejects(db.transaction(async tx => {
    await tx.exec('set local role authenticated');
    await tx.exec('select * from registration_private.teams');
  }), /permission denied/);
  await assert.rejects(db.transaction(async tx => {
    await tx.exec('set local role anon');
    await tx.exec("select public.registration_action('me')");
  }), /permission denied/);
});

test('invalid invitations consume a durable rate limit, then recover after window', async () => {
  await profile(0);
  for (let n = 0; n < 10; n++) assert.match((await call(0, 'join', { code: 'wrong' })).error, /Invalid/);
  assert.match((await call(0, 'join', { code: 'wrong' })).error, /Too many/);
  await db.exec("update registration_private.attempts set started_at = now() - interval '16 minutes'");
  assert.match((await call(0, 'join', { code: 'wrong' })).error, /Invalid/);
});
