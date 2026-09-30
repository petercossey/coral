// B2B auth cache: one customer-keyed entry in session storage, or in memory for the life
// of the page when storage refuses it. No network, so every page can prune it cheaply.
import { getB2BConfig } from './config.js';

const keyPrefix = 'coral:b2b:';

// Older entries are re-exchanged so permission changes reach the shopper. Matches the
// ~15 minute customer JWT lifetime that drives the Buyer Portal's re-exchange.
const maxAgeMs = 15 * 60 * 1000;

// Entries session storage refuses (blocked or full), kept for the life of the page.
const memory = new Map();

// Every session storage call is guarded on its own: the browser throws on access when it
// blocks storage, and on writes when storage is full. A failed write never disables reads
// or removal, so a previous customer's persisted entry can still be cleared.
const store = {
  get(key) {
    if (memory.has(key)) {
      return memory.get(key);
    }

    try {
      return window.sessionStorage.getItem(key);
    } catch {
      return null;
    }
  },

  set(key, value) {
    try {
      window.sessionStorage.setItem(key, value);
      memory.delete(key);
    } catch {
      // Drop any older persisted copy so it cannot outlive this page's entry.
      store.remove(key);
      memory.set(key, value);
    }
  },

  remove(key) {
    memory.delete(key);

    try {
      window.sessionStorage.removeItem(key);
    } catch {
      // Storage the browser blocks holds nothing to remove.
    }
  },

  keys() {
    const keys = new Set(memory.keys());

    try {
      const storage = window.sessionStorage;

      for (let index = 0; index < storage.length; index += 1) {
        const key = storage.key(index);

        if (key !== null) {
          keys.add(key);
        }
      }
    } catch {
      // Storage the browser blocks holds nothing to list.
    }

    return [...keys];
  },
};

export function getB2BCacheKey(config = getB2BConfig()) {
  return `${keyPrefix}${config.storeHash}:${config.channelId}:${config.customerId}`;
}

function isUsable(entry) {
  return (
    typeof entry?.token === 'string' &&
    entry.token !== '' &&
    Array.isArray(entry.permissions) &&
    Number.isFinite(entry.issuedAt) &&
    Date.now() - entry.issuedAt < maxAgeMs
  );
}

// Returns null for a missing, malformed, empty, or expired entry; callers then re-exchange.
export function readB2BCache(key) {
  try {
    const entry = JSON.parse(store.get(key));

    return isUsable(entry) ? entry : null;
  } catch {
    return null;
  }
}

// Writing the current customer's entry drops every other one.
export function writeB2BCache(key, entry) {
  clearB2BCache({ except: key });
  store.set(key, JSON.stringify({ ...entry, issuedAt: Date.now() }));
}

export function clearB2BCache({ except = null } = {}) {
  for (const key of store.keys()) {
    if (key.startsWith(keyPrefix) && key !== except) {
      store.remove(key);
    }
  }
}

// Drops cached auth that does not belong to the shopper on this page: after logout,
// a customer switch, or B2B being disabled.
export function pruneB2BCache(config = getB2BConfig()) {
  const currentKey = config.enabled && config.customerId ? getB2BCacheKey(config) : null;

  clearB2BCache({ except: currentKey });
}
