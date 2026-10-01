import { emit } from '../../events.js';
import { clearCartSummary, getCurrentCartId, rememberCartId, replaceCartSummary } from '../../state/cart.js';

const listSelector = '[data-cart-items]';
const formSelector = '[data-cart-item-form]';
const removeSelector = '[data-cart-item-remove]';
const lineMessageSelector = '[data-cart-item-message]';
const pageMessageSelector = '[data-cart-page-message]';
const quantityDisplaySelector = '[data-cart-item-quantity-display]';
const headingSelector = '#cart-heading';
const resultStorageKey = 'coral:cart-page-result';
const resultMaxAge = 30000;

export class CartRequestError extends Error {
  constructor(message, { status, detail = '' } = {}) {
    super(message);
    this.name = 'CartRequestError';
    this.status = status;
    this.detail = detail;
  }
}

function parsePositiveInteger(value) {
  const text = typeof value === 'string' ? value.trim() : String(value ?? '');

  if (!/^\d+$/.test(text)) {
    return null;
  }

  const number = Number.parseInt(text, 10);

  return Number.isSafeInteger(number) && number > 0 ? number : null;
}

// Validates a quantity field value before any request is sent. `min` and `max`
// are the platform purchase limits rendered on the input; a missing max is unlimited.
export function parseQuantityInput(value, { min = 1, max = null } = {}) {
  const quantity = parsePositiveInteger(value);

  if (quantity === null) {
    return { error: 'invalid' };
  }

  if (quantity < Math.max(min ?? 1, 1)) {
    return { error: 'min' };
  }

  if (max && quantity > max) {
    return { error: 'max' };
  }

  return { quantity };
}

function getProblemDetail(responseText) {
  try {
    const problem = JSON.parse(responseText);
    const detail = typeof problem?.detail === 'string' ? problem.detail : problem?.title;

    return typeof detail === 'string' ? detail.trim() : '';
  } catch {
    return '';
  }
}

async function requestLineItem(fetchImpl, method, cartId, itemId, body = null) {
  const url = `/api/storefront/carts/${encodeURIComponent(cartId)}/items/${encodeURIComponent(itemId)}`;
  const response = await fetchImpl(url, {
    method,
    credentials: 'same-origin',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const responseText = await response.text();

  if (!response.ok) {
    throw new CartRequestError(`Cart line item ${method} failed with status ${response.status}.`, {
      status: response.status,
      detail: getProblemDetail(responseText),
    });
  }

  // Removing the last line deletes the cart and returns 204 with no body.
  return responseText ? JSON.parse(responseText) : null;
}

// Cart line mutations share one lock so a page never has two in flight, and an
// older response cannot land after a newer one. A failed request releases the
// lock; a successful one keeps it because the page reloads to render the result.
export function createLineItemMutations({ cartId, fetch: fetchImpl = globalThis.fetch?.bind(globalThis) } = {}) {
  let locked = false;

  async function run(request) {
    if (locked) {
      return null;
    }

    locked = true;

    try {
      return { cart: await request() };
    } catch (error) {
      locked = false;
      throw error;
    }
  }

  return {
    isLocked() {
      return locked;
    },
    update(line, quantity) {
      const lineItem = { productId: line.productId, quantity };

      // Option-bearing lines are rejected without their variant ID.
      if (line.variantId) {
        lineItem.variantId = line.variantId;
      }

      return run(() => requestLineItem(fetchImpl, 'PUT', cartId, line.itemId, { lineItem }));
    },
    remove(line) {
      return run(() => requestLineItem(fetchImpl, 'DELETE', cartId, line.itemId));
    },
  };
}

function readLine(form) {
  const itemId = form.dataset.itemId?.trim();
  const productId = parsePositiveInteger(form.dataset.productId);
  const quantity = parsePositiveInteger(form.dataset.quantity);
  const input = form.elements.namedItem('quantity');
  const removeButton = form.querySelector(removeSelector);

  if (!itemId || !productId || !quantity || !(input instanceof HTMLInputElement) || !removeButton) {
    return null;
  }

  return {
    form,
    input,
    removeButton,
    updateButton: form.querySelector('[type="submit"]'),
    message: form.querySelector(lineMessageSelector),
    itemId,
    productId,
    variantId: parsePositiveInteger(form.dataset.variantId),
    quantity,
    min: parsePositiveInteger(input.min) ?? 1,
    max: parsePositiveInteger(input.max),
  };
}

function getMessages(list) {
  const { dataset } = list;

  return {
    quantityInvalid: dataset.messageQuantityInvalid,
    updating: dataset.messageUpdating,
    removing: dataset.messageRemoving,
    updated: dataset.messageUpdated,
    updateError: dataset.messageUpdateError,
    removeError: dataset.messageRemoveError,
    changedError: dataset.messageChangedError,
  };
}

function setMessage(element, text = '') {
  if (element) {
    element.textContent = text;
  }
}

function getValidationMessage(line, error, messages) {
  if (error === 'min') {
    return line.input.dataset.messageQuantityMin || messages.quantityInvalid;
  }

  if (error === 'max') {
    return line.input.dataset.messageQuantityMax || messages.quantityInvalid;
  }

  return messages.quantityInvalid;
}

function getFailureMessage(error, fallback, messages) {
  // 404: the cart or line no longer exists, for example after a change in another tab.
  if (error?.status === 404) {
    return messages.changedError;
  }

  // 4xx rejections carry the platform's reason, such as an inventory limit.
  if (error?.status >= 400 && error.status < 500 && error.detail) {
    return `${fallback} ${error.detail}`;
  }

  return fallback;
}

// Controls stay focusable while busy so keyboard focus is not lost; activation
// is ignored through the shared mutation lock.
function setLinesBusy(lines, activeLine, isBusy) {
  for (const line of lines) {
    for (const button of [line.updateButton, line.removeButton]) {
      if (isBusy) {
        button?.setAttribute('aria-disabled', 'true');
      } else {
        button?.removeAttribute('aria-disabled');
      }
    }

    line.input.readOnly = isBusy;
  }

  if (isBusy) {
    activeLine.form.setAttribute('aria-busy', 'true');
  } else {
    activeLine.form.removeAttribute('aria-busy');
  }
}

function storeResult(result) {
  try {
    window.sessionStorage.setItem(resultStorageKey, JSON.stringify({ ...result, at: Date.now() }));
  } catch {
    // Feedback after reload is optional; the reloaded cart still shows the result.
  }
}

function takeStoredResult() {
  try {
    const value = window.sessionStorage.getItem(resultStorageKey);
    window.sessionStorage.removeItem(resultStorageKey);
    const result = value ? JSON.parse(value) : null;

    return result && Date.now() - result.at < resultMaxAge ? result : null;
  } catch {
    return null;
  }
}

function announceLater(element, text) {
  // Set live-region text after the reloaded page settles so it is announced.
  window.setTimeout(() => setMessage(element, text), 100);
}

function restoreResult(root, lines, messages) {
  const result = takeStoredResult();

  if (!result) {
    return;
  }

  const line = result.action === 'updated' ? lines.find((entry) => entry.itemId === result.itemId) : null;

  if (line) {
    line.input.focus();
    announceLater(line.message, messages.updated);
    return;
  }

  if (result.action === 'removed') {
    const pageMessage = root.querySelector(pageMessageSelector);

    root.querySelector(headingSelector)?.focus();
    announceLater(pageMessage, pageMessage?.dataset.messageRemoved);
  }
}

function reloadCartPage() {
  window.location.reload();
}

function handleUpdate(line, context) {
  const { lines, messages, mutations } = context;

  if (mutations.isLocked()) {
    return;
  }

  const result = parseQuantityInput(line.input.value, line);

  if (result.error) {
    line.input.setAttribute('aria-invalid', 'true');
    setMessage(line.message, getValidationMessage(line, result.error, messages));
    line.input.focus();
    return;
  }

  line.input.removeAttribute('aria-invalid');

  if (result.quantity === line.quantity) {
    setMessage(line.message);
    return;
  }

  setLinesBusy(lines, line, true);
  setMessage(line.message, messages.updating);

  mutations
    .update(line, result.quantity)
    .then(({ cart }) => {
      if (cart) {
        replaceCartSummary(cart, { source: 'rest-storefront' });
      }

      emit('cart:item-updated', { itemId: line.itemId, quantity: result.quantity, cart, source: 'cart-page' });
      storeResult({ action: 'updated', itemId: line.itemId });
      reloadCartPage();
    })
    .catch((error) => {
      console.error('Unable to update cart item.', error);
      line.input.value = String(line.quantity);
      setLinesBusy(lines, line, false);
      setMessage(line.message, getFailureMessage(error, messages.updateError, messages));
    });
}

function handleRemove(line, context) {
  const { lines, messages, mutations } = context;

  if (mutations.isLocked()) {
    return;
  }

  line.input.removeAttribute('aria-invalid');
  setLinesBusy(lines, line, true);
  setMessage(line.message, messages.removing);

  mutations
    .remove(line)
    .then(({ cart }) => {
      if (cart) {
        replaceCartSummary(cart, { source: 'rest-storefront' });
      } else {
        clearCartSummary({ source: 'rest-storefront' });
      }

      emit('cart:item-removed', { itemId: line.itemId, cart, source: 'cart-page' });
      storeResult({ action: 'removed', itemId: line.itemId });
      reloadCartPage();
    })
    .catch((error) => {
      console.error('Unable to remove cart item.', error);
      line.input.value = String(line.quantity);
      setLinesBusy(lines, line, false);
      setMessage(line.message, getFailureMessage(error, messages.removeError, messages));
    });
}

export function setupCartPage({ root = document } = {}) {
  const list = root.querySelector(listSelector);
  const cartId = list ? rememberCartId(list.dataset.cartId) || getCurrentCartId() : null;

  if (!list || !cartId) {
    // An emptied cart still restores focus and feedback for the removal that emptied it.
    restoreResult(root, [], {});
    return;
  }

  const messages = getMessages(list);

  const lines = [...list.querySelectorAll(formSelector)].map(readLine).filter(Boolean);
  const context = {
    lines,
    messages,
    mutations: createLineItemMutations({ cartId }),
  };

  for (const line of lines) {
    line.form.addEventListener('submit', (event) => {
      event.preventDefault();
      handleUpdate(line, context);
    });
    line.removeButton.addEventListener('click', () => handleRemove(line, context));

    line.form.closest('li')?.querySelector(quantityDisplaySelector)?.setAttribute('hidden', '');
    line.form.hidden = false;
  }

  restoreResult(root, lines, messages);
}

export default setupCartPage;
