import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { prepareEmail, sendEmail } from '../lib/email.js';

const env = { BREVO_API_KEY: 'private-test-key', BREVO_SENDER_EMAIL: 'event@example.com', BREVO_REPLY_TO: 'help@example.com' };
const message = { to: 'attendee@example.com', subject: 'DataJam update', text: 'See you soon!' };

test('sends a private single-recipient message using Brevo API credentials', async () => {
  const id = await sendEmail(message, { env, fetchImpl: async (url, options) => {
    assert.equal(url, 'https://api.brevo.com/v3/smtp/email');
    assert.equal(options.headers['api-key'], env.BREVO_API_KEY);
    const body = JSON.parse(options.body);
    assert.deepEqual(body.to, [{ email: message.to }]);
    assert.equal(body.replyTo.email, env.BREVO_REPLY_TO);
    assert.equal(body.textContent, message.text);
    assert.ok(!JSON.stringify(body).includes(env.BREVO_API_KEY));
    return { ok: true, json: async () => ({ messageId: 'test-message' }) };
  } });
  assert.equal(id, 'test-message');
});

test('rejects invalid input and missing credentials before sending', async () => {
  for (const invalid of [{ to: 'a@example.com,b@example.com' }, { subject: 'a\nb' }, { text: ' ' }]) {
    assert.throws(() => prepareEmail({ ...message, ...invalid }, env));
  }
  await assert.rejects(sendEmail(message, { env: { ...env, BREVO_API_KEY: '' } }), /API key/);
});

test('does not retry or expose provider response bodies on failures', async () => {
  let calls = 0;
  await assert.rejects(sendEmail(message, { env, fetchImpl: async () => {
    calls++;
    return { ok: false, status: 429, json: async () => ({ secret: env.BREVO_API_KEY }) };
  } }), /HTTP 429/);
  assert.equal(calls, 1);
  await assert.rejects(sendEmail(message, { env, fetchImpl: async () => { throw new Error('private details'); } }), /status unknown/);
});

test('CLI defaults to preview without an API key or network request', () => {
  const result = spawnSync(process.execPath, ['scripts/send-email.js', '--to', message.to, '--subject', message.subject, '--file', '.env.example'], {
    cwd: new URL('..', import.meta.url), encoding: 'utf8', env: { ...process.env, ...env, BREVO_API_KEY: '' }
  });
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /Preview only/);
});
