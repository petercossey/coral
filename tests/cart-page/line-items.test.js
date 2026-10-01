import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  CartRequestError,
  createLineItemMutations,
  parseQuantityInput,
} from '../../assets/js/theme/cart/cart-page.js';

const optionLine = { itemId: 'line-b', productId: 77, variantId: 7 };

function jsonResponse(status, body) {
  return {
    ok: status >= 200 && status < 300,
    status,
    text: async () => (body === null ? '' : JSON.stringify(body)),
  };
}

function deferred() {
  let resolve;
  const promise = new Promise((done) => {
    resolve = done;
  });

  return { promise, resolve };
}

function recordingFetch(respond) {
  const calls = [];
  const fetch = async (url, init) => {
    calls.push({ url, method: init.method, body: init.body ? JSON.parse(init.body) : null });
    return respond(calls.length);
  };

  return { calls, fetch };
}

describe('cart page quantity validation', () => {
  it('accepts positive whole numbers', () => {
    assert.deepEqual(parseQuantityInput('2'), { quantity: 2 });
    assert.deepEqual(parseQuantityInput(' 12 '), { quantity: 12 });
  });

  it('rejects blank, non-integer, and non-positive values', () => {
    for (const value of ['', '   ', '0', '-1', '1.5', '1e2', 'abc', undefined]) {
      assert.deepEqual(parseQuantityInput(value), { error: 'invalid' }, `value ${JSON.stringify(value)}`);
    }
  });

  it('applies platform purchase limits', () => {
    assert.deepEqual(parseQuantityInput('1', { min: 2, max: 5 }), { error: 'min' });
    assert.deepEqual(parseQuantityInput('6', { min: 2, max: 5 }), { error: 'max' });
    assert.deepEqual(parseQuantityInput('5', { min: 2, max: 5 }), { quantity: 5 });
    assert.deepEqual(parseQuantityInput('500', { min: 1, max: null }), { quantity: 500 });
  });
});

describe('cart page line item mutations', () => {
  it('updates the addressed line with its product and variant', async () => {
    const { calls, fetch } = recordingFetch(() => jsonResponse(200, { id: 'cart-1' }));
    const mutations = createLineItemMutations({ cartId: 'cart-1', fetch });

    const result = await mutations.update(optionLine, 2);

    assert.deepEqual(result, { cart: { id: 'cart-1' } });
    assert.deepEqual(calls, [
      {
        url: '/api/storefront/carts/cart-1/items/line-b',
        method: 'PUT',
        body: { lineItem: { productId: 77, quantity: 2, variantId: 7 } },
      },
    ]);
  });

  it('removes the addressed line and reports a deleted cart as no cart', async () => {
    const { calls, fetch } = recordingFetch(() => jsonResponse(204, null));
    const mutations = createLineItemMutations({ cartId: 'cart-1', fetch });

    assert.deepEqual(await mutations.remove(optionLine), { cart: null });
    assert.deepEqual(calls, [{ url: '/api/storefront/carts/cart-1/items/line-b', method: 'DELETE', body: null }]);
  });

  it('ignores mutations while one is pending and stays locked after success', async () => {
    const pending = deferred();
    const { calls, fetch } = recordingFetch(() => pending.promise);
    const mutations = createLineItemMutations({ cartId: 'cart-1', fetch });

    const first = mutations.update(optionLine, 2);

    assert.equal(mutations.isLocked(), true);
    assert.equal(await mutations.update(optionLine, 3), null);
    assert.equal(await mutations.remove({ itemId: 'line-a', productId: 111 }), null);

    pending.resolve(jsonResponse(200, { id: 'cart-1' }));
    await first;

    assert.equal(calls.length, 1);
    // The page reloads after success, so no later mutation can start first.
    assert.equal(mutations.isLocked(), true);
    assert.equal(await mutations.update(optionLine, 1), null);
  });

  it('releases the lock and surfaces the platform detail after a rejection', async () => {
    const { calls, fetch } = recordingFetch((count) =>
      count === 1
        ? jsonResponse(422, { status: 422, title: 'Unprocessable', detail: 'Not enough stock.' })
        : jsonResponse(200, { id: 'cart-1' }),
    );
    const mutations = createLineItemMutations({ cartId: 'cart-1', fetch });

    await assert.rejects(mutations.update(optionLine, 99), (error) => {
      assert.ok(error instanceof CartRequestError);
      assert.equal(error.status, 422);
      assert.equal(error.detail, 'Not enough stock.');
      return true;
    });

    assert.equal(mutations.isLocked(), false);
    assert.deepEqual(await mutations.update(optionLine, 2), { cart: { id: 'cart-1' } });
    assert.equal(calls.length, 2);
  });

  it('releases the lock after a network failure', async () => {
    const mutations = createLineItemMutations({
      cartId: 'cart-1',
      fetch: async () => {
        throw new TypeError('Failed to fetch');
      },
    });

    await assert.rejects(mutations.remove(optionLine), TypeError);
    assert.equal(mutations.isLocked(), false);
  });
});
