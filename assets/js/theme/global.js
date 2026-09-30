import { setupB2BSession } from './b2b/session.js';
import { setupAddToCartButtons } from './cart/add-to-cart.js';
import { setupHeaderCart } from './header/header-cart.js';
import { setupHeaderSearch } from './header/header-search.js';
import { setupNotifications } from './notifications/notifications.js';

export function setupGlobal(env = {}) {
  setupB2BSession();
  setupAddToCartButtons(env);
  setupHeaderCart(env);
  setupHeaderSearch(env);
  setupNotifications(env);
}
