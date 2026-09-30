import assert from 'node:assert/strict';
import { beforeEach, test } from 'node:test';
import { resetBrowser, shopper, storage, window } from './browser.js';
import { clearB2BCache, getB2BCacheKey, pruneB2BCache, readB2BCache, writeB2BCache } from '../../assets/js/b2b/cache.js';
import { setupB2BSession } from '../../assets/js/theme/b2b/session.js';

const currentKey = getB2BCacheKey(shopper);
const otherKey = getB2BCacheKey({ ...shopper, customerId: 8 });
const entry = { token: 'b2b-token', permissions: [] };

beforeEach(() => {
  resetBrowser();
  clearB2BCache();
});

test('reads back a fresh entry', () => {
  writeB2BCache(currentKey, entry);

  assert.equal(readB2BCache(currentKey)?.token, 'b2b-token');
});

test('treats malformed, incomplete, empty-token, and expired entries as a miss', () => {
  const fresh = { ...entry, issuedAt: Date.now() };
  const cases = [
    '{not json',
    'null',
    JSON.stringify({ permissions: [], issuedAt: Date.now() }),
    JSON.stringify({ token: 'b2b-token', issuedAt: Date.now() }),
    JSON.stringify({ ...fresh, token: '' }),
    JSON.stringify({ ...fresh, issuedAt: 'yesterday' }),
    JSON.stringify({ ...fresh, issuedAt: Date.now() - 16 * 60 * 1000 }),
  ];

  for (const raw of cases) {
    storage.items.set(currentKey, raw);
    assert.equal(readB2BCache(currentKey), null, raw);
  }
});

test('writing one customer drops every other customer entry', () => {
  storage.items.set(otherKey, JSON.stringify({ ...entry, issuedAt: Date.now() }));
  storage.items.set('unrelated', 'kept');

  writeB2BCache(currentKey, entry);

  assert.equal(storage.items.has(otherKey), false);
  assert.equal(storage.items.get('unrelated'), 'kept');
  assert.notEqual(readB2BCache(currentKey), null);
});

test('falls back to memory when the browser blocks session storage', () => {
  window.blockStorage = true;

  writeB2BCache(currentKey, entry);

  assert.equal(readB2BCache(currentKey)?.token, 'b2b-token');
  assert.doesNotThrow(() => pruneB2BCache());
  assert.doesNotThrow(() => clearB2BCache());
  assert.equal(readB2BCache(currentKey), null);
});

test('clears the previous customer from session storage when writes fail', () => {
  storage.items.set(otherKey, JSON.stringify({ ...entry, issuedAt: Date.now() }));
  storage.fail.write = true;

  writeB2BCache(currentKey, entry);

  assert.equal(storage.items.has(otherKey), false);
  assert.equal(readB2BCache(currentKey)?.token, 'b2b-token');

  window.Coral.b2b = { ...shopper, customerId: null };
  pruneB2BCache();

  assert.equal(readB2BCache(currentKey), null);
});

test('a failed write does not leave an older copy of the same entry persisted', () => {
  storage.items.set(currentKey, JSON.stringify({ ...entry, token: 'older', issuedAt: Date.now() }));
  storage.fail.write = true;

  writeB2BCache(currentKey, entry);

  assert.equal(storage.items.has(currentKey), false);
  assert.equal(readB2BCache(currentKey)?.token, 'b2b-token');
});

test('pruning and invalidation tolerate storage that throws on read, list, and remove', () => {
  writeB2BCache(currentKey, entry);
  Object.keys(storage.fail).forEach((key) => {
    storage.fail[key] = true;
  });

  assert.doesNotThrow(() => setupB2BSession());
  assert.doesNotThrow(() => clearB2BCache());
  assert.equal(readB2BCache(currentKey), null);
});

test('session setup keeps the current customer and clears everyone else', () => {
  writeB2BCache(currentKey, entry);
  storage.items.set(otherKey, JSON.stringify({ ...entry, issuedAt: Date.now() }));

  setupB2BSession();

  assert.equal(storage.items.has(otherKey), false);
  assert.notEqual(readB2BCache(currentKey), null);
});

test('session setup clears all entries after logout or when B2B is disabled', () => {
  for (const b2b of [{ ...shopper, customerId: null }, { ...shopper, enabled: false }]) {
    writeB2BCache(currentKey, entry);
    window.Coral.b2b = b2b;

    setupB2BSession();

    assert.equal(storage.items.has(currentKey), false);
    window.Coral.b2b = { ...shopper };
  }
});

test('session setup clears the previous customer after a customer switch', () => {
  writeB2BCache(currentKey, entry);
  window.Coral.b2b = { ...shopper, customerId: 8 };

  setupB2BSession();

  assert.equal(storage.items.has(currentKey), false);
});
