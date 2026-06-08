import { on } from '../../events.js';
import { openCartDrawer } from '../../state/cart.js';
import { enqueueNotification } from '../../state/notifications.js';

let initialized = false;

function getCartUrl(root) {
  const cartDrawer = root.querySelector('[data-coral-component="cart-drawer"]');

  return cartDrawer?.dataset.cartUrl || '/cart.php';
}

function getQuantityLabel(quantity) {
  return quantity === 1 ? 'Item' : `${quantity} items`;
}

function getAddedMessage(detail) {
  const quantity = Number.parseInt(detail?.quantity, 10);

  if (Number.isFinite(quantity) && quantity > 1) {
    return `${getQuantityLabel(quantity)} added to cart.`;
  }

  return 'Item added to cart.';
}

export function setupNotifications({ root = document } = {}) {
  if (initialized) {
    return;
  }

  initialized = true;

  on('cart:item-added', (event) => {
    const cartUrl = getCartUrl(root);

    enqueueNotification({
      type: 'success',
      message: getAddedMessage(event.detail),
      actions: [
        {
          label: 'Open cart',
          href: cartUrl,
          onSelect: openCartDrawer,
        },
        // Keep the direct cart link available for later if the starter needs a non-drawer action.
        // {
        //   label: 'View cart',
        //   href: cartUrl,
        // },
      ],
    });
  });

  on('cart:item-add-failed', (event) => {
    enqueueNotification({
      type: 'error',
      message: event.detail?.message || 'Unable to add item to cart. Try again.',
    });
  });
}
