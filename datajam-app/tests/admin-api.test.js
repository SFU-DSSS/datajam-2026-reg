import { test } from 'node:test';
import assert from 'node:assert/strict';
import handler from '../api/admin.js';
function response() {
  return { headers: {}, setHeader(k,v) { this.headers[k] = v; }, status(code) { this.code = code; return this; }, json(body) { this.body = body; } };
}
test('admin API rejects invalid requests before calling providers', async () => {
  for (const [req, status] of [
    [{ method: 'GET', headers: {} }, 405],
    [{ method: 'POST', headers: {}, body: { action: 'list' } }, 401],
    [{ method: 'POST', headers: { authorization: 'Bearer abc' }, body: '{' }, 400],
    [{ method: 'POST', headers: { authorization: 'Bearer abc' }, body: { action: 'claim' } }, 400],
    [{ method: 'POST', headers: { authorization: 'Bearer abc' }, body: { action: 'compose', data: { text: 'x'.repeat(9000) } } }, 413]
  ]) { const res = response(); await handler(req, res); assert.equal(res.code, status); }
});
test('admin API authorizes before sending, persists results, and leaves uncertainty for review', async () => {
  const originalFetch = globalThis.fetch, originalEnv = { ...process.env };
  Object.assign(process.env, { SUPABASE_URL: 'https://example.supabase.co', SUPABASE_ANON_KEY: 'public-key', BREVO_API_KEY: 'secret-key', BREVO_SENDER_EMAIL: 'organizer@example.com' });
  try {
    for (const mode of ['denied','sent','unknown','already-claimed','unconfigured']) {
      const calls = []; let providerCalls = 0;
      if (mode === 'unconfigured') delete process.env.BREVO_API_KEY;
      globalThis.fetch = async (url, options) => {
        const body = JSON.parse(options.body);
        if (url.includes('brevo.com')) {
          providerCalls++;
          assert.equal(options.headers['api-key'], 'secret-key');
          assert.deepEqual(body.to, [{ email: 'participant@example.com' }]);
          if (mode === 'unknown') throw new Error('timeout');
          return { ok: true, json: async () => ({ messageId: 'brevo-123' }) };
        }
        assert.equal(options.headers.Authorization, 'Bearer caller-token');
        calls.push(body);
        if (mode === 'denied') return { ok: false, json: async () => ({ code: 'P0001', message: 'Organizer access required.' }) };
        const result = body.action === 'compose' ? { email_id: 'email-id' }
          : body.action === 'access' ? { is_admin: true }
          : body.action === 'claim' ? { email: mode === 'already-claimed' ? null : { id: 'email-id', recipient: 'participant@example.com', subject: 'Hello', body: 'Welcome' } } : {};
        return { ok: true, json: async () => result };
      };
      const res = response();
      await handler({ method: 'POST', headers: { authorization: 'Bearer caller-token' }, body: { action: 'compose', data: {} } }, res);
      assert.equal(res.code, mode === 'denied' ? 403 : 200);
      assert.equal(providerCalls, ['sent','unknown'].includes(mode) ? 1 : 0);
      if (mode === 'sent') assert.equal(calls.at(-1).payload.state, 'submitted');
      if (mode === 'unknown') assert.equal(calls.at(-1).payload.state, 'unknown');
      if (mode === 'unconfigured') assert.match(res.body.email_notice, /remains queued/);
    }
  } finally { globalThis.fetch = originalFetch; process.env = originalEnv; }
});
