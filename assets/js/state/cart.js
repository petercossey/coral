import { signal } from '@preact/signals';

export const cartDrawerOpen = signal(false);
export const cartSummary = signal(null);
const currentCartId = signal(null);

function normalizeCartId(value) {
  if (typeof value !== 'string') {
    return null;
  }

  const cartId = value.trim();

  return cartId || null;
}

function parseQuantity(value) {
  const quantity = Number.parseInt(value, 10);

  if (!Number.isFinite(quantity) || quantity < 0) {
    return 0;
  }

  return quantity;
}

function normalizePrice(price, fallback = '') {
  const source = price && typeof price === 'object' ? price : {};

  return {
    value: Number.isFinite(source.value) ? source.value : null,
    formatted: typeof source.formatted === 'string' && source.formatted.trim() ? source.formatted.trim() : fallback,
    currencyCode: typeof source.currencyCode === 'string' && source.currencyCode.trim() ? source.currencyCode.trim() : null,
  };
}

function normalizeCartSummary(summary = {}, metadata = {}) {
  const subtotal = normalizePrice(summary.subtotal, '$0.00');

  return {
    id: normalizeCartId(summary.id),
    quantity: parseQuantity(summary.quantity),
    subtotal,
    total: normalizePrice(summary.total),
    items: Array.isArray(summary.items) ? summary.items : [],
    source: metadata.source || summary.source || 'server',
    stale: metadata.stale ?? summary.stale ?? true,
    updatedAt: metadata.updatedAt || Date.now(),
  };
}

export function openCartDrawer() {
  cartDrawerOpen.value = true;
}

export function closeCartDrawer() {
  cartDrawerOpen.value = false;
}

export function getCurrentCartId() {
  return currentCartId.value || normalizeCartId(cartSummary.value?.id);
}

export function rememberCartId(cartId) {
  const normalizedCartId = normalizeCartId(cartId);

  if (normalizedCartId) {
    currentCartId.value = normalizedCartId;
  }

  return currentCartId.value;
}

export function seedCartSummary(summary) {
  const currentSummary = cartSummary.value;

  if (currentSummary && currentSummary.source !== 'server') {
    return currentSummary;
  }

  cartSummary.value = normalizeCartSummary(summary, {
    source: 'server',
    stale: true,
  });
  rememberCartId(cartSummary.value.id);

  return cartSummary.value;
}

export function replaceCartSummary(summary, metadata = {}) {
  cartSummary.value = normalizeCartSummary(summary, {
    stale: false,
    ...metadata,
  });
  rememberCartId(cartSummary.value.id);

  return cartSummary.value;
}
