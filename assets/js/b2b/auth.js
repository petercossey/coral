// B2B token manager: returns a valid B2B bearer token and runs the exchange; cache.js stores it.
import { clearB2BCache, getB2BCacheKey, readB2BCache, writeB2BCache } from './cache.js';
import { getB2BConfig } from './config.js';

const authorizeMutation = `
mutation Authorize($bcToken: String!, $channelId: Int!) {
  authorization(authData: { bcToken: $bcToken, channelId: $channelId }) {
    result {
      token
      loginType
      permissions {
        code
        permissionLevel
      }
    }
  }
}`;

let inFlightExchange = null;

export class B2BAuthError extends Error {
  constructor(message, { cause } = {}) {
    super(message, { cause });
    this.name = 'B2BAuthError';
  }
}

async function fetchCurrentCustomerJwt(config) {
  // Request the JSON variant ({ token } / { errors }) rather than the plain-text JWT:
  // the stencil dev server's response cache replays text bodies as consumed streams
  // (empty), while JSON responses are parsed before caching and replay intact.
  const url = `${window.location.origin}/customer/current.jwt?app_client_id=${encodeURIComponent(config.appClientId)}`;
  const response = await fetch(url, {
    credentials: 'same-origin',
    headers: { accept: 'application/json' },
  });

  let payload = null;

  try {
    payload = await response.json();
  } catch {
    // Falls through to the status/shape errors below.
  }

  if (!response.ok) {
    const detail = payload?.errors?.[0]?.detail ?? 'no error detail';
    throw new B2BAuthError(`Current Customer API responded ${response.status}: ${detail}`);
  }

  const jwt = payload?.token;

  if (typeof jwt !== 'string' || !/^[\w-]+\.[\w-]+\.[\w-]+$/.test(jwt)) {
    throw new B2BAuthError('Current Customer API did not return a JWT');
  }

  return jwt;
}

async function exchangeForB2BToken(config, customerJwt) {
  const response = await fetch(`${config.apiBaseUrl}/graphql`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      query: authorizeMutation,
      variables: { bcToken: customerJwt, channelId: config.channelId },
    }),
  });

  if (!response.ok) {
    throw new B2BAuthError(`B2B authorization responded ${response.status}`);
  }

  const payload = await response.json();

  if (payload.errors?.length) {
    throw new B2BAuthError(payload.errors[0].message ?? 'B2B authorization failed');
  }

  const result = payload.data?.authorization?.result;

  if (!result?.token) {
    throw new B2BAuthError('B2B authorization returned no token');
  }

  return result;
}

async function runExchange(config, cacheKey) {
  const customerJwt = await fetchCurrentCustomerJwt(config);
  const result = await exchangeForB2BToken(config, customerJwt);
  const entry = {
    token: result.token,
    loginType: result.loginType ?? null,
    permissions: result.permissions ?? [],
  };

  writeB2BCache(cacheKey, entry);

  return entry;
}

async function getAuthEntry() {
  const config = getB2BConfig();

  if (!config.enabled) {
    throw new B2BAuthError('B2B integration is disabled by theme settings');
  }

  if (!config.customerId) {
    throw new B2BAuthError('B2B token exchange requires a logged-in customer');
  }

  const cacheKey = getB2BCacheKey(config);
  const cached = readB2BCache(cacheKey);

  if (cached) {
    return cached;
  }

  if (!inFlightExchange) {
    inFlightExchange = runExchange(config, cacheKey).finally(() => {
      inFlightExchange = null;
    });
  }

  return inFlightExchange;
}

export async function getB2BToken() {
  const entry = await getAuthEntry();

  return entry.token;
}

export async function getB2BPermissions() {
  const entry = await getAuthEntry();

  return entry.permissions;
}

export function invalidateB2BToken() {
  clearB2BCache();
}
