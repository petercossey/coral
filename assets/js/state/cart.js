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

function getLineItems(cart) {
  const lineItems = cart?.lineItems && typeof cart.lineItems === 'object' ? cart.lineItems : {};

  return [
    ...(Array.isArray(lineItems.physicalItems) ? lineItems.physicalItems : []),
    ...(Array.isArray(lineItems.digitalItems) ? lineItems.digitalItems : []),
    ...(Array.isArray(lineItems.giftCertificates) ? lineItems.giftCertificates : []),
    ...(Array.isArray(lineItems.customItems) ? lineItems.customItems : []),
  ];
}

function getLineItemQuantity(cart) {
  return getLineItems(cart).reduce((total, item) => total + parseQuantity(item?.quantity), 0);
}

function getCurrencyFormatter(currency) {
  const currencyCode = typeof currency?.code === 'string' && currency.code.trim() ? currency.code.trim() : null;

  if (!currencyCode) {
    return null;
  }

  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: currencyCode,
      currencyDisplay: 'narrowSymbol',
    });
  } catch {
    return null;
  }
}

function formatCartAmount(value, currency) {
  if (!Number.isFinite(value)) {
    return '';
  }

  const formatter = getCurrencyFormatter(currency);

  if (formatter) {
    return formatter.format(value);
  }

  const symbol = typeof currency?.symbol === 'string' ? currency.symbol : '';
  const decimalPlaces = Number.isInteger(currency?.decimalPlaces) ? currency.decimalPlaces : 2;

  return `${symbol}${value.toFixed(decimalPlaces)}`;
}

function normalizeNumericPrice(value, currency) {
  return normalizePrice(
    {
      value,
      formatted: formatCartAmount(value, currency),
      currencyCode: currency?.code,
    },
    '',
  );
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
  const hasRestLineItems = summary.lineItems && typeof summary.lineItems === 'object';
  const quantity = summary.quantity ?? (hasRestLineItems ? getLineItemQuantity(summary) : 0);
  const subtotal = Number.isFinite(summary.baseAmount)
    ? normalizeNumericPrice(summary.baseAmount, summary.currency)
    : normalizePrice(summary.subtotal, '$0.00');
  const total = Number.isFinite(summary.cartAmount)
    ? normalizeNumericPrice(summary.cartAmount, summary.currency)
    : normalizePrice(summary.total);

  return {
    id: normalizeCartId(summary.id),
    quantity: parseQuantity(quantity),
    subtotal,
    total,
    items: Array.isArray(summary.items) ? summary.items : getLineItems(summary),
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
