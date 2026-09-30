import assert from 'node:assert/strict';
import { beforeEach, test } from 'node:test';
import { installFetch, resetBrowser, shopper, storage, window } from './browser.js';
import { getB2BPermissions, getB2BToken, invalidateB2BToken } from '../../assets/js/b2b/auth.js';
import { getB2BCacheKey } from '../../assets/js/b2b/cache.js';
import { gqlRequest } from '../../assets/js/b2b/client.js';
import { setupB2BSession } from '../../assets/js/theme/b2b/session.js';

const authError = { errors: [{ message: 'Token expired', extensions: { code: 40101 } }] };

beforeEach(() => {
  resetBrowser();
  invalidateB2BToken();
});

test('reuses the cached token instead of exchanging again', async () => {
  const calls = installFetch();

  assert.equal(await getB2BToken(), 'b2b-token-1');
  assert.equal(await getB2BToken(), 'b2b-token-1');
  assert.equal(calls.authorize, 1);
});

test('deduplicates concurrent exchanges', async () => {
  const calls = installFetch();

  const tokens = await Promise.all([getB2BToken(), getB2BToken(), getB2BToken()]);

  assert.deepEqual(tokens, ['b2b-token-1', 'b2b-token-1', 'b2b-token-1']);
  assert.equal(calls.jwt, 1);
  assert.equal(calls.authorize, 1);
});

test('re-exchanges when the cached entry is malformed or has an empty token', async () => {
  const key = getB2BCacheKey(shopper);

  for (const raw of ['{not json', JSON.stringify({ token: '', permissions: [], issuedAt: Date.now() })]) {
    const calls = installFetch();
    storage.items.set(key, raw);

    assert.equal(await getB2BToken(), 'b2b-token-1');
    assert.equal(calls.authorize, 1);
  }
});

test('authorizes without persistent storage and reuses the in-memory token', async () => {
  const calls = installFetch();
  window.blockStorage = true;

  assert.equal(await getB2BToken(), 'b2b-token-1');
  assert.equal(await getB2BToken(), 'b2b-token-1');
  assert.equal(calls.authorize, 1);
  assert.doesNotThrow(() => invalidateB2BToken());
});

test('authorizes when session storage is full', async () => {
  const calls = installFetch();
  storage.fail.write = true;

  assert.equal(await getB2BToken(), 'b2b-token-1');
  assert.equal(await getB2BToken(), 'b2b-token-1');
  assert.equal(calls.authorize, 1);
});

test('makes no network requests for guests or when B2B is disabled', async () => {
  const calls = installFetch();

  for (const b2b of [{ ...shopper, customerId: null }, { ...shopper, enabled: false }]) {
    window.Coral.b2b = b2b;

    setupB2BSession();
    await assert.rejects(getB2BToken(), { name: 'B2BAuthError' });
    await assert.rejects(getB2BPermissions(), { name: 'B2BAuthError' });
    await assert.rejects(gqlRequest('query { ok }'), { name: 'B2BAuthError' });
  }

  assert.equal(calls.total, 0);
});

test('recovers from an invalid token with one reauthorization', async () => {
  const calls = installFetch({ queryResponses: [authError, { data: { ok: true } }] });

  assert.deepEqual(await gqlRequest('query { ok }'), { ok: true });
  assert.equal(calls.authorize, 2);
  assert.deepEqual(calls.bearers, ['Bearer b2b-token-1', 'Bearer b2b-token-2']);
});

test('stops after one reauthorization when the retry is also rejected', async () => {
  const calls = installFetch({ queryResponses: [authError, authError] });

  await assert.rejects(gqlRequest('query { ok }'), { name: 'B2BApiError', code: 40101 });
  assert.equal(calls.authorize, 2);
  assert.equal(calls.query, 2);
});
