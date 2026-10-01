export const DRAWER_TRANSITION_MS = 200;
export const CART_DRAWER_TRIGGER_SELECTOR = '[data-cart-drawer-trigger]';

export function prefersReducedMotion(media = globalThis) {
  return Boolean(media.matchMedia?.('(prefers-reduced-motion: reduce)').matches);
}

export function lockDocumentScroll(doc) {
  const documentRef = doc ?? document;
  const view = documentRef.defaultView;
  const root = documentRef.documentElement;
  const { body } = documentRef;
  const scrollY = view?.scrollY ?? root.scrollTop ?? 0;

  const snapshot = {
    documentElementOverflow: root.style.overflow,
    bodyOverflow: body.style.overflow,
    bodyPosition: body.style.position,
    bodyTop: body.style.top,
    bodyWidth: body.style.width,
    scrollY,
  };

  root.style.overflow = 'hidden';
  body.style.overflow = 'hidden';
  body.style.position = 'fixed';
  body.style.top = `-${scrollY}px`;
  body.style.width = '100%';

  return snapshot;
}

export function unlockDocumentScroll(snapshot, doc) {
  if (!snapshot) {
    return;
  }

  const documentRef = doc ?? document;
  const root = documentRef.documentElement;
  const { body } = documentRef;

  root.style.overflow = snapshot.documentElementOverflow;
  body.style.overflow = snapshot.bodyOverflow;
  body.style.position = snapshot.bodyPosition;
  body.style.top = snapshot.bodyTop;
  body.style.width = snapshot.bodyWidth;

  documentRef.defaultView?.scrollTo(0, snapshot.scrollY);
}

export function resolveFocusTarget(
  opener,
  { root = document, fallbackSelector = CART_DRAWER_TRIGGER_SELECTOR } = {},
) {
  if (opener?.isConnected && typeof opener.focus === 'function') {
    return opener;
  }

  const fallback = root.querySelector(fallbackSelector);

  if (fallback && typeof fallback.focus === 'function') {
    return fallback;
  }

  return null;
}

export function restoreFocus(opener, options) {
  const target = resolveFocusTarget(opener, options);
  target?.focus?.();
  return target;
}
