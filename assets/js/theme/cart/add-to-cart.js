import { emit } from '../../events.js';
import { getCurrentCartId, rememberCartId, replaceCartSummary } from '../../state/cart.js';

const selector = 'a[data-coral-add-to-cart]';
const initializedLinks = new WeakSet();
const originalLabels = new WeakMap();
const quantity = 1;

function isStandardClick(event) {
  return event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey;
}

function hasSameWindowTarget(link) {
  return !link.target || link.target === '_self';
}

function getProductId(link) {
  const productId = link.dataset.productId?.trim();

  if (!productId || !/^\d+$/.test(productId)) {
    return null;
  }

  const parsedProductId = Number.parseInt(productId, 10);

  if (!Number.isSafeInteger(parsedProductId) || parsedProductId <= 0) {
    return null;
  }

  return parsedProductId;
}

function getEligibleCartAddUrl(link, productId) {
  const documentWindow = link.ownerDocument?.defaultView;

  if (!documentWindow) {
    return null;
  }

  let url;

  try {
    url = new URL(link.href, documentWindow.location.href);
  } catch {
    return null;
  }

  if (url.origin !== documentWindow.location.origin) {
    return null;
  }

  if (url.pathname !== '/cart.php') {
    return null;
  }

  if (url.searchParams.get('action') !== 'add') {
    return null;
  }

  if (url.searchParams.get('product_id') !== String(productId)) {
    return null;
  }

  return url;
}

function setLinkBusy(link, isBusy) {
  if (isBusy) {
    link.dataset.coralBusy = 'true';
    link.setAttribute('aria-busy', 'true');
    link.setAttribute('aria-disabled', 'true');
    return;
  }

  delete link.dataset.coralBusy;
  link.removeAttribute('aria-busy');
  link.removeAttribute('aria-disabled');
}

function getOriginalLabel(link) {
  if (!originalLabels.has(link)) {
    originalLabels.set(link, link.textContent.trim() || 'Add to cart');
  }

  return originalLabels.get(link);
}

function setLinkAdding(link) {
  getOriginalLabel(link);
  link.textContent = 'Adding...';
}

function resetLinkLabel(link) {
  link.textContent = getOriginalLabel(link);
}

function getCartIdFromResponse(cart) {
  return typeof cart?.id === 'string' && cart.id.trim() ? cart.id.trim() : null;
}

async function parseJsonResponse(response) {
  const responseText = await response.text();

  if (!responseText) {
    return null;
  }

  return JSON.parse(responseText);
}

async function getResponseError(response) {
  const responseText = await response.text();
  const message = `Add to cart request failed with status ${response.status}.`;

  if (!responseText) {
    return new Error(message);
  }

  return new Error(`${message} ${responseText}`);
}

async function postCartLineItem(productId, cartId = null) {
  const url = cartId ? `/api/storefront/carts/${encodeURIComponent(cartId)}/items` : '/api/storefront/carts';
  const response = await fetch(url, {
    method: 'POST',
    credentials: 'same-origin',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      lineItems: [
        {
          productId,
          quantity,
        },
      ],
    }),
  });

  if (!response.ok) {
    throw await getResponseError(response);
  }

  return parseJsonResponse(response);
}

async function addToCart(link, fallbackUrl, productId) {
  const knownCartId = getCurrentCartId();
  const cart = await postCartLineItem(productId, knownCartId);
  const cartId = getCartIdFromResponse(cart) || knownCartId;

  if (cart) {
    replaceCartSummary(cart, { source: 'rest-storefront' });
  } else {
    rememberCartId(cartId);
  }

  emit('cart:item-added', {
    productId,
    quantity,
    fallbackUrl: fallbackUrl.href,
    cart,
    cartId,
    source: 'product-card',
    element: link,
  });
}

function handleClick(event) {
  if (!isStandardClick(event)) {
    return;
  }

  const link = event.currentTarget;
  const productId = getProductId(link);

  if (!productId || !hasSameWindowTarget(link)) {
    return;
  }

  const url = getEligibleCartAddUrl(link, productId);

  if (!url) {
    return;
  }

  event.preventDefault();

  if (link.dataset.coralBusy === 'true') {
    return;
  }

  setLinkBusy(link, true);
  setLinkAdding(link);

  addToCart(link, url, productId)
    .catch((error) => {
      console.error('Unable to add item to cart.', error);
    })
    .finally(() => {
      setLinkBusy(link, false);
      resetLinkLabel(link);
    });
}

export function setupAddToCartButtons({ root = document } = {}) {
  for (const link of root.querySelectorAll(selector)) {
    if (initializedLinks.has(link)) {
      continue;
    }

    initializedLinks.add(link);
    link.addEventListener('click', handleClick);
  }
}
