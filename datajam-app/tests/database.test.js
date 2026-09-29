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
    create table auth.users (id uuid primary key, email_confirmed_at timestamptz, email text);
    create function auth.uid() returns uuid language sql as
      'select nullif(current_setting(''request.jwt.claim.sub'', true), '''')::uuid';
    grant usage on schema public, auth to authenticated, anon;
  `);
  await db.exec(await readFile(new URL('../supabase/001_registration.sql', import.meta.url), 'utf8'));
  for (const id of ids) await db.query('insert into auth.users values ($1, now(), $2)', [id, `${id}@example.com`]);
  await db.query(`insert into registration_private.profiles values ($1, 'Existing attendee', 'University', '123', 'old@example.com', 'old')`, [ids[0]]);
  await db.exec(await readFile(new URL('../supabase/002_photo_consent.sql', import.meta.url), 'utf8'));
  const upgraded = await call(0, 'me');
  assert.equal(upgraded.profile.photo_consent, null);
  assert.equal(upgraded.profile.photo_consent_updated_at, null);
  assert.equal(upgraded.next_step, 'complete_profile');
  assert.match((await call(0, 'create', { name: 'Pending consent' })).error, /photo consent/);
  await db.exec(await readFile(new URL('../supabase/003_admin.sql', import.meta.url), 'utf8'));
  await db.exec(await readFile(new URL('../supabase/004_organizer_tools.sql', import.meta.url), 'utf8'));
});
after(async () => { await db?.close(); });
beforeEach(async () => {
  await db.exec('truncate registration_private.admin_events, registration_private.admins, registration_private.members, registration_private.teams, registration_private.profiles, registration_private.attempts cascade; update registration_private.settings set max_team_size = 4;');
});
async function call(i, action, payload = {}, admin = false) {
  // PGlite queues transactions; identity belongs to each transaction, as in PostgREST.
  return db.transaction(async tx => {
    await tx.query("select set_config('request.jwt.claim.sub', $1, true)", [ids[i]]);
    await tx.exec('set local role authenticated');
    const result = await tx.query(`select public.${admin ? 'admin_action' : 'registration_action'}($1, $2::jsonb) as result`, [action, JSON.stringify(payload)]);
    return result.rows[0].result;
  });
}
const adminCall = (i, action, payload) => call(i, action, payload, true);
test('admin access is database-controlled and private tables cannot be changed by participants', async () => {
  assert.equal((await adminCall(0, 'access')).is_admin, false);
  for (const action of ['list','decision','compose','claim','finish','accept_all','team_create','team_assign','team_remove','team_delete','team_transfer','team_rename','team_rotate']) await assert.rejects(adminCall(0, action), /Organizer access/);
  for (const table of ['admins', 'decisions', 'emails', 'admin_events']) await assert.rejects(db.transaction(async tx => {
    await tx.exec('set local role authenticated');
    await tx.exec(`select * from registration_private.${table}`);
  }), /permission denied/);
  await assert.rejects(db.transaction(async tx => {
    await tx.exec('set local role anon'); await tx.exec("select public.admin_action('access')");
  }), /permission denied/);
  await db.query('insert into registration_private.admins values ($1)', [ids[7]]);
  assert.equal((await adminCall(7, 'access')).is_admin, true);
  await db.query('delete from registration_private.admins where user_id = $1', [ids[7]]);
  await assert.rejects(adminCall(7, 'list'), /Organizer access/);
});
test('admin decisions queue one acceptance, use verified login email, and claim each email once', async () => {
  await db.query('insert into registration_private.admins values ($1)', [ids[7]]);
  await team();
  const list = await adminCall(7, 'list');
  assert.equal(list.registrations[0].status, 'pending');
  assert.equal(list.registrations[0].team_name, 'Data folks');
  await assert.rejects(adminCall(7, 'decision', { user_id: ids[0], status: 'bad' }), /Invalid status/);
  const first = await adminCall(7, 'decision', { user_id: ids[0], status: 'accepted' });
  const second = await adminCall(7, 'decision', { user_id: ids[0], status: 'accepted' });
  assert.equal(first.email_id, second.email_id);
  await adminCall(7, 'decision', { user_id: ids[0], status: 'waitlisted' });
  assert.equal((await adminCall(7, 'claim', { id: first.email_id })).email, null);
  assert.equal((await adminCall(7, 'list')).emails[0].state, 'cancelled');
  assert.equal((await adminCall(7, 'decision', { user_id: ids[0], status: 'accepted' })).email_id, first.email_id);
  const claims = await Promise.all([adminCall(7, 'claim', { id: first.email_id }), adminCall(7, 'claim', { id: first.email_id })]);
  assert.equal(claims.filter(r => r.email).length, 1);
  const email = claims.find(r => r.email).email;
  assert.equal(email.recipient, `${ids[0]}@example.com`);
  await adminCall(7, 'finish', { id: email.id, state: 'submitted', message_id: 'brevo-id' });
  assert.equal((await adminCall(7, 'decision', { user_id: ids[0], status: 'accepted' })).email_id, null);
  assert.equal((await adminCall(7, 'list')).emails.length, 1);
  // Participant profile updates cannot set or reset the admission decision.
  await profile(0);
  assert.equal((await adminCall(7, 'list')).registrations[0].status, 'accepted');
});
test('manual email request IDs are idempotent and unknown sends cannot be claimed again', async () => {
  await db.query('insert into registration_private.admins values ($1)', [ids[7]]); await profile(0);
  const payload = { id: ids[1], user_id: ids[0], subject: 'Event details', text: 'Hello!' };
  await adminCall(7, 'compose', payload); await adminCall(7, 'compose', payload);
  await assert.rejects(adminCall(7, 'compose', { ...payload, text: 'Different' }), /already used/);
  await assert.rejects(adminCall(7, 'compose', { ...payload, subject: 'Bad\nsubject' }), /Provide a subject/);
  await adminCall(7, 'claim', { id: payload.id });
  await adminCall(7, 'finish', { id: payload.id, state: 'unknown', detail: 'Network timeout' });
  assert.equal((await adminCall(7, 'claim', { id: payload.id })).email, null);
  assert.equal((await adminCall(7, 'list')).emails.length, 1);
});
async function profile(i) {
  return call(i, 'profile', { name: `Student ${i}`, institution: 'Any University', student_number: `N-${i}`, student_email: `student${i}@school.example`, discord_username: `student${i}`, photo_consent: false });
}
async function team() { await profile(0); return (await call(0, 'create', { name: 'Data folks' })).team; }

test('accept all changes only pending applications, detects stale counts and queues once', async () => {
  await db.query('insert into registration_private.admins values ($1)', [ids[7]]);
  for (let i = 0; i < 5; i++) await profile(i);
  await adminCall(7, 'decision', { user_id: ids[1], status: 'rejected' });
  await adminCall(7, 'decision', { user_id: ids[2], status: 'waitlisted' });
  await adminCall(7, 'decision', { user_id: ids[3], status: 'accepted' });
  await assert.rejects(adminCall(7, 'accept_all', { expected_count: 3 }), /Applications changed/);
  assert.equal((await call(0, 'me')).admission_status, 'pending');
  const result = await adminCall(7, 'accept_all', { expected_count: 2 });
  assert.equal(result.accepted_count, 2);
  assert.equal(result.email_ids.length, 2);
  assert.equal((await call(0, 'me')).admission_status, 'accepted');
  assert.equal((await call(1, 'me')).admission_status, 'rejected');
  assert.equal((await call(2, 'me')).admission_status, 'waitlisted');
  assert.equal((await call(7, 'me')).is_admin, true);
  assert.equal((await call(0, 'me')).is_admin, false);
  assert.equal((await adminCall(7, 'accept_all', { expected_count: 0 })).accepted_count, 0);
  const list = await adminCall(7, 'list');
  assert.equal(list.emails.length, 3);
  assert.equal(list.queued_emails.length, 3);
  assert.ok(list.events.some(e => e.action === 'accept_all'));
  for (const fn of ['registration_action_base','admin_action_base']) await assert.rejects(db.transaction(async tx => {
    await tx.exec('set local role authenticated');
    await tx.exec(`select public.${fn}('me')`);
  }), /permission denied/);
});

test('organizer team edits enforce capacity, captain membership, consent and atomic moves', async () => {
  await db.query('insert into registration_private.admins values ($1)', [ids[7]]);
  for (let i = 0; i < 6; i++) await profile(i);
  const a = await adminCall(7, 'team_create', { name: 'Alpha', user_id: ids[0] });
  const b = await adminCall(7, 'team_create', { name: 'Beta', user_id: ids[2] });
  await adminCall(7, 'team_assign', { team_id: a.team_id, user_id: ids[1] });
  await assert.rejects(adminCall(7, 'team_assign', { team_id: b.team_id, user_id: ids[0] }), /Transfer captaincy/);
  await assert.rejects(adminCall(7, 'team_remove', { team_id: a.team_id, user_id: ids[0] }), /Transfer captaincy/);
  await assert.rejects(adminCall(7, 'team_transfer', { team_id: a.team_id, user_id: ids[3] }), /current team member/);
  await assert.rejects(adminCall(7, 'team_create', { name: 'Duplicate', user_id: ids[1] }), /without a team/);
  await db.query('update registration_private.profiles set photo_consent = null where id = $1', [ids[5]]);
  await assert.rejects(adminCall(7, 'team_assign', { team_id: a.team_id, user_id: ids[5] }), /photo preference/);
  await db.exec('update registration_private.settings set max_team_size = 2');
  await assert.rejects(adminCall(7, 'team_assign', { team_id: a.team_id, user_id: ids[3] }), /full/);
  const oldCode = (await call(0, 'me')).team.invite_code;
  await adminCall(7, 'team_assign', { team_id: b.team_id, user_id: ids[1] });
  assert.notEqual((await call(0, 'me')).team.invite_code, oldCode);
  await assert.rejects(adminCall(7, 'team_assign', { team_id: b.team_id, user_id: ids[0] }), /full/);
  assert.equal((await call(0, 'me')).team.id, a.team_id);
  await adminCall(7, 'team_transfer', { team_id: b.team_id, user_id: ids[1] });
  assert.equal((await call(1, 'me')).permissions.manage_team, true);
  await adminCall(7, 'team_remove', { team_id: b.team_id, user_id: ids[2] });
  assert.equal((await call(2, 'me')).team, null);
  await adminCall(7, 'team_assign', { team_id: b.team_id, user_id: ids[0] });
  assert.equal((await adminCall(7, 'list')).teams.length, 1);
  await adminCall(7, 'team_rename', { team_id: b.team_id, name: 'New Beta' });
  assert.equal((await call(0, 'me')).team.name, 'New Beta');
  const code = (await call(0, 'me')).team.invite_code;
  await adminCall(7, 'team_rotate', { team_id: b.team_id });
  assert.notEqual((await call(0, 'me')).team.invite_code, code);
  await adminCall(7, 'team_delete', { team_id: b.team_id });
  assert.equal((await call(0, 'me')).team, null);
  assert.equal((await call(1, 'me')).team, null);
  assert.equal((await adminCall(7, 'list')).registrations.length, 6);
  const events = (await adminCall(7, 'list')).events;
  assert.ok(events.every(e => e.actor === ids[7]));
  assert.ok(events.some(e => e.action === 'team_assign'));
});

test('photo consent requires an explicit boolean, preserves opt-out, and permits changes', async () => {
  const data = { name: 'Student', institution: 'University', student_number: '123', student_email: 'student@example.com', discord_username: 'student' };
  for (const value of [undefined, null, 'false', 'true', 0, 1, {}, []]) {
    const result = await call(0, 'profile', { ...data, photo_consent: value });
    assert.match(result.error, /consent/);
    assert.equal((await call(0, 'me')).profile, null);
  }
  const optedOut = await call(0, 'profile', { ...data, photo_consent: false });
  assert.equal(optedOut.profile.photo_consent, false);
  assert.ok(optedOut.profile.photo_consent_updated_at);
  const unchanged = await call(0, 'profile', { ...data, name: 'New name', photo_consent: false });
  assert.equal(unchanged.profile.photo_consent_updated_at, optedOut.profile.photo_consent_updated_at);
  assert.ok(!(await call(0, 'create', { name: 'Opt-out team' })).error);
  const optedIn = await call(0, 'profile', { ...data, photo_consent: true });
  assert.equal(optedIn.profile.photo_consent, true);
  assert.notEqual(optedIn.profile.photo_consent_updated_at, optedOut.profile.photo_consent_updated_at);
  assert.equal((await call(0, 'me')).profile.photo_consent, true);
  assert.equal((await call(0, 'profile', { ...data, photo_consent: false })).profile.photo_consent, false);
});

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
