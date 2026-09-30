import { pruneB2BCache } from '../../b2b/cache.js';

// Clears a previous shopper's cached B2B token on the first page after logout or a
// customer switch. Storage-only: B2B authorization itself stays lazy and feature-driven.
export function setupB2BSession() {
  pruneB2BCache();
}
