import { effect } from '@preact/signals';
import { cartSummary, openCartDrawer } from '../../state/cart.js';

const triggerSelector = '[data-cart-drawer-trigger]';
const drawerSelector = '[data-coral-component="cart-drawer"]';
const countSelector = '[data-cart-link-count]';
const subtotalSelector = '[data-cart-link-subtotal]';
const countUpdateClass = 'is-cart-count-updating';
const initializedLinks = new WeakSet();
const previousQuantities = new WeakMap();

function isStandardClick(event) {
  return event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey;
}

function getItemLabel(quantity) {
  return quantity === 1 ? '1 item' : `${quantity} items`;
}

function shouldAnimateCount(element) {
  const documentWindow = element.ownerDocument?.defaultView;

  return !documentWindow?.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
}

function handleCountAnimationEnd(event) {
  event.currentTarget.classList.remove(countUpdateClass);
}

function animateCartCount(countElement) {
  if (!shouldAnimateCount(countElement)) {
    return;
  }

  countElement.classList.remove(countUpdateClass);
  countElement.removeEventListener('animationend', handleCountAnimationEnd);

  void countElement.offsetWidth;

  countElement.classList.add(countUpdateClass);
  countElement.addEventListener('animationend', handleCountAnimationEnd, { once: true });
}

function updateCartLink(link, summary) {
  if (!summary) {
    return;
  }

  const quantity = summary.quantity ?? 0;
  const subtotal = summary.subtotal?.formatted || '$0.00';
  const previousQuantity = previousQuantities.get(link);
  const countElement = link.querySelector(countSelector);
  const subtotalElement = link.querySelector(subtotalSelector);

  if (countElement) {
    countElement.textContent = String(quantity);

    if (previousQuantity !== undefined && previousQuantity !== quantity) {
      animateCartCount(countElement);
    }
  }

  if (subtotalElement) {
    subtotalElement.textContent = subtotal;
  }

  previousQuantities.set(link, quantity);
  link.setAttribute('aria-label', `Open cart, ${getItemLabel(quantity)}, ${subtotal} subtotal`);
}

function setupCartSummaryRender(link) {
  effect(() => {
    updateCartLink(link, cartSummary.value);
  });
}

export function setupHeaderCart({ root = document } = {}) {
  if (!document.querySelector(drawerSelector)) {
    return;
  }

  for (const link of root.querySelectorAll(triggerSelector)) {
    if (initializedLinks.has(link)) {
      continue;
    }

    initializedLinks.add(link);
    setupCartSummaryRender(link);

    link.addEventListener('click', (event) => {
      if (!isStandardClick(event)) {
        return;
      }

      event.preventDefault();
      openCartDrawer();
    });
  }
}
