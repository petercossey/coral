// Dev-only console diagnostic for the B2B SDK. Not referenced by any template and
// not part of the Vite build; the stencil dev server serves theme assets as-is, so
// load it from the browser console on a logged-in page:
//   await import('/assets/js/b2b/diagnostic.js')
//   await CoralB2BDiagnostic.run()
import { getB2BConfig } from './config.js';
import { getB2BCacheKey, getB2BPermissions, getB2BToken, invalidateB2BToken } from './auth.js';
import { getCustomerOrders } from './orders.js';

function report(step, ok, detail) {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${step}`, detail ?? '');

  return ok;
}

async function run() {
  const results = [];
  const config = getB2BConfig();

  console.log('B2B config', config);
  results.push(report('config: customerId present', Boolean(config.customerId), config.customerId));

  invalidateB2BToken();

  const token = await getB2BToken();
  results.push(report('exchange: B2B token issued', Boolean(token), `${token.slice(0, 16)}…`));

  const permissions = await getB2BPermissions();
  results.push(
    report('exchange: permissions returned', permissions.length > 0, `${permissions.length} codes`),
  );

  const cacheKey = getB2BCacheKey();
  const cachedToken = await getB2BToken();
  results.push(
    report(
      'cache: second call reuses customer-keyed entry',
      cachedToken === token && Boolean(window.sessionStorage.getItem(cacheKey)),
      cacheKey,
    ),
  );

  const orders = await getCustomerOrders({ first: 5 });
  results.push(
    report('orders: customerOrders query', typeof orders.totalCount === 'number', `totalCount ${orders.totalCount}`),
  );

  const entry = JSON.parse(window.sessionStorage.getItem(cacheKey));
  window.sessionStorage.setItem(cacheKey, JSON.stringify({ ...entry, token: 'corrupted-token' }));

  const retried = await getCustomerOrders({ first: 5 });
  const refreshedEntry = JSON.parse(window.sessionStorage.getItem(cacheKey));
  results.push(
    report(
      'retry: auth failure invalidates and re-exchanges once',
      typeof retried.totalCount === 'number' && refreshedEntry.token !== 'corrupted-token',
      undefined,
    ),
  );

  const ok = results.every(Boolean);

  console.log(ok ? 'B2B diagnostic passed' : 'B2B diagnostic FAILED');

  return ok;
}

window.CoralB2BDiagnostic = { run };
console.log('CoralB2BDiagnostic loaded; call CoralB2BDiagnostic.run() while logged in.');
