import { setupAddToCartButtons } from './cart/add-to-cart.js';
import { setupHeaderCart } from './header/header-cart.js';
import { setupHeaderSearch } from './header/header-search.js';

export function setupGlobal(env = {}) {
  setupAddToCartButtons(env);
  setupHeaderCart(env);
  setupHeaderSearch(env);
}
