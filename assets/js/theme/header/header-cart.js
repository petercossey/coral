import { openCartDrawer } from '../../state/cart.js';

const triggerSelector = '[data-cart-drawer-trigger]';
const drawerSelector = '[data-coral-component="cart-drawer"]';

function isStandardClick(event) {
  return event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey;
}

export function setupHeaderCart({ root = document } = {}) {
  if (!document.querySelector(drawerSelector)) {
    return;
  }

  for (const link of root.querySelectorAll(triggerSelector)) {
    link.addEventListener('click', (event) => {
      if (!isStandardClick(event)) {
        return;
      }

      event.preventDefault();
      openCartDrawer();
    });
  }
}
