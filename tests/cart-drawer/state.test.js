import assert from 'node:assert/strict';
import { describe, it, beforeEach } from 'node:test';
import {
  cartDrawerOpen,
  cartDrawerReady,
  closeCartDrawer,
  consumeCartDrawerOpener,
  openCartDrawer,
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
