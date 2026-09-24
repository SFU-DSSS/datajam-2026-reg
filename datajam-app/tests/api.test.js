import { test } from 'node:test';
import assert from 'node:assert/strict';
import handler from '../api/action.js';
function response() {
  return { headers: {}, setHeader(k,v) { this.headers[k] = v; }, status(s) { this.code = s; return this; }, json(v) { this.body = v; }, end() {} };
}
test('API rejects unauthenticated, invalid, and oversized requests', async () => {
  for (const [req, status] of [
    [{ method: 'GET', headers: {} }, 405],
    [{ method: 'POST', headers: {}, body: { action: 'me' } }, 401],
    [{ method: 'POST', headers: { authorization: 'Bearer abc' }, body: '{' }, 400],
    [{ method: 'POST', headers: { authorization: 'Bearer abc' }, body: { action: 'delete-everything' } }, 400],
    [{ method: 'POST', headers: { authorization: 'Bearer abc' }, body: { action: 'profile', data: { name: 'a'.repeat(9000) } } }, 413]
  ]) { const res = response(); await handler(req, res); assert.equal(res.code, status); }
});
test('API forwards caller token, maps errors, and restricts CORS allowlist', async () => {
  const oldFetch = globalThis.fetch;
  const previous = { ...process.env };
  process.env.SUPABASE_URL = 'https://example.supabase.co';
  process.env.SUPABASE_ANON_KEY = 'public-key';
  process.env.ALLOWED_ORIGINS = 'https://frontend.example';
  try {
    globalThis.fetch = async (url, options) => {
      assert.equal(options.headers.Authorization, 'Bearer caller-token');
      assert.deepEqual(JSON.parse(options.body), { action: 'join', payload: { code: 'abc' } });
      return { ok: true, json: async () => ({ error: 'Too many attempts. Try again in 15 minutes.' }) };
    };
    const req = { method: 'POST', headers: { authorization: 'Bearer caller-token', origin: 'https://frontend.example' }, body: { action: 'join', data: { code: 'abc' } } };
    const res = response(); await handler(req, res);
    assert.equal(res.code, 429);
    assert.equal(res.headers['Access-Control-Allow-Origin'], 'https://frontend.example');
    req.headers.origin = 'https://untrusted.example';
    const other = response(); await handler(req, other);
    assert.equal(other.headers['Access-Control-Allow-Origin'], undefined);
  } finally { globalThis.fetch = oldFetch; process.env = previous; }
});
