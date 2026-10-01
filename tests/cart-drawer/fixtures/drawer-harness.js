import { h, render } from 'preact';
import { CartDrawer } from '../../../assets/js/components/cart-drawer/cart-drawer.client.jsx';
import { prefersReducedMotion } from '../../../assets/js/components/cart-drawer/modal.js';
import {
  cartDrawerOpen,
  cartDrawerReady,
  closeCartDrawer,
  openCartDrawer,
} from '../../../assets/js/state/cart.js';

cartDrawerOpen.value = false;
cartDrawerReady.value = false;

render(h(CartDrawer, { cartUrl: '/cart.php' }), document.getElementById('drawer-root'));

window.__coralCartDrawerHarness = {
  openCartDrawer,
  closeCartDrawer,
  isReady: () => cartDrawerReady.value,
  isOpenSignal: () => cartDrawerOpen.value,
  prefersReducedMotion: () => prefersReducedMotion(),
};
