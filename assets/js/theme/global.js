import { setupHeaderCart } from './header/header-cart.js';

export function setupGlobal(env = {}) {
  setupHeaderCart(env);
}
