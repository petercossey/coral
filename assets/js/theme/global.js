import { setupHeaderCart } from './header/header-cart.js';
import { setupHeaderSearch } from './header/header-search.js';

export function setupGlobal(env = {}) {
  setupHeaderCart(env);
  setupHeaderSearch(env);
}
