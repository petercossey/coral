// Minimal browser globals for running the B2B SDK under `node --test`.
export class FakeStorage {
  constructor() {
    this.items = new Map();
    this.fail = { read: false, write: false, list: false, remove: false };
  }

  get length() {
    if (this.fail.list) throw new Error('SecurityError');
    return this.items.size;
  }

  key(index) {
    if (this.fail.list) throw new Error('SecurityError');
    return [...this.items.keys()][index] ?? null;
  }

  getItem(key) {
    if (this.fail.read) throw new Error('SecurityError');
    return this.items.get(key) ?? null;
  }

  setItem(key, value) {
    if (this.fail.write) throw new Error('QuotaExceededError');
    this.items.set(key, String(value));
  }

  removeItem(key) {
    if (this.fail.remove) throw new Error('SecurityError');
    this.items.delete(key);
  }
}

export const storage = new FakeStorage();

export const shopper = { enabled: true, storeHash: 'abc123', channelId: 1, customerId: 7 };

export const window = {
  location: { origin: 'https://store.example' },
  Coral: { b2b: { ...shopper } },
  blockStorage: false,
  get sessionStorage() {
    if (this.blockStorage) throw new Error('SecurityError');
    return storage;
  },
};

globalThis.window = window;

// Puts the page back to a logged-in shopper with healthy, empty storage.
export function resetBrowser() {
  window.Coral.b2b = { ...shopper };
  window.blockStorage = false;
  storage.items.clear();
  Object.keys(storage.fail).forEach((key) => {
    storage.fail[key] = false;
  });
}

export function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
}

// Routes fetch to the Current Customer API, the B2B authorization mutation, and other
// B2B queries. Tokens are numbered by exchange so tests can tell exchanges apart.
export function installFetch({ queryResponses = [] } = {}) {
  const calls = { total: 0, jwt: 0, authorize: 0, query: 0, bearers: [] };

  globalThis.fetch = async (url, options = {}) => {
    calls.total += 1;

    if (String(url).includes('/customer/current.jwt')) {
      calls.jwt += 1;
      return jsonResponse({ token: 'header.payload.signature' });
    }

    const body = JSON.parse(options.body);

    if (body.query.includes('mutation Authorize')) {
      calls.authorize += 1;
      await Promise.resolve();
      return jsonResponse({
        data: { authorization: { result: { token: `b2b-token-${calls.authorize}`, permissions: [] } } },
      });
    }

    calls.bearers.push(options.headers.authorization);
    const response = queryResponses[calls.query] ?? { data: { ok: true } };
    calls.query += 1;
    return jsonResponse(response);
  };

  return calls;
}
