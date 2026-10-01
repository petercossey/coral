import assert from 'node:assert/strict';
import { describe, it, beforeEach } from 'node:test';
import {
  cartDrawerOpen,
  cartDrawerReady,
  cartSummary,
  clearCartSummary,
  closeCartDrawer,
  consumeCartDrawerOpener,
  getCurrentCartId,
  openCartDrawer,
  replaceCartSummary,
  setCartDrawerReady,
} from '../../assets/js/state/cart.js';

describe('cart drawer state', () => {
  beforeEach(() => {
    cartDrawerOpen.value = false;
    cartDrawerReady.value = false;
    consumeCartDrawerOpener();
  });

  it('tracks drawer open and ready independently', () => {
    assert.equal(cartDrawerOpen.value, false);
    assert.equal(cartDrawerReady.value, false);

    setCartDrawerReady(true);
    openCartDrawer();

    assert.equal(cartDrawerReady.value, true);
    assert.equal(cartDrawerOpen.value, true);

    closeCartDrawer();
    setCartDrawerReady(false);

    assert.equal(cartDrawerOpen.value, false);
    assert.equal(cartDrawerReady.value, false);
  });

  it('coerces readiness to a boolean', () => {
    setCartDrawerReady(1);
    assert.equal(cartDrawerReady.value, true);

    setCartDrawerReady('');
    assert.equal(cartDrawerReady.value, false);
  });

  it('captures and consumes an explicit opener when opening', () => {
    const opener = {
      focus() {},
    };

    openCartDrawer({ opener });
    assert.equal(consumeCartDrawerOpener(), opener);
    assert.equal(consumeCartDrawerOpener(), null);
  });
});

describe('cart summary state', () => {
  it('forgets a deleted cart so later mutations create a new one', () => {
    replaceCartSummary({ id: 'cart-1', quantity: 2, subtotal: { formatted: '$10.00' } });
    assert.equal(getCurrentCartId(), 'cart-1');

    const summary = clearCartSummary({ source: 'rest-storefront' });

    assert.equal(getCurrentCartId(), null);
    assert.equal(summary.id, null);
    assert.equal(summary.quantity, 0);
    assert.equal(summary.stale, false);
    assert.equal(cartSummary.value, summary);
  });
});
