// Fetch wrapper for the B2B GraphQL API with auth and error unwrapping; no UI concerns.
import { getB2BConfig } from './config.js';
import { getB2BToken, invalidateB2BToken } from './auth.js';

export class B2BApiError extends Error {
  constructor(message, { code = null, extensions = null } = {}) {
    super(message);
    this.name = 'B2BApiError';
    this.code = code;
    this.extensions = extensions;
  }
}

// 40101 is the documented invalid/expired-token code; a structurally invalid token
// observed in practice returns "JWT verification failed" with no extensions.
function isAuthError(error) {
  return error?.extensions?.code === 40101 || /jwt verification failed/i.test(error?.message ?? '');
}

async function postQuery(query, variables) {
  const config = getB2BConfig();
  const token = await getB2BToken();
  const response = await fetch(`${config.apiBaseUrl}/graphql`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ query, variables }),
  });

  if (!response.ok) {
    throw new B2BApiError(`B2B API responded ${response.status}`, { code: response.status });
  }

  return response.json();
}

export async function gqlRequest(query, variables = {}) {
  let payload = await postQuery(query, variables);
  let error = payload.errors?.[0];

  if (error && isAuthError(error)) {
    invalidateB2BToken();
    payload = await postQuery(query, variables);
    error = payload.errors?.[0];
  }

  if (error) {
    throw new B2BApiError(error.message ?? 'B2B API request failed', {
      code: error.extensions?.code ?? null,
      extensions: error.extensions ?? null,
    });
  }

  return payload.data;
}
