// Read-only bridge from Stencil templates to client code; DOM behavior lives in assets/js/theme/.
export function getCoralContext() {
  return window.Coral?.context ?? {};
}

export function getCoralPageType() {
  return window.Coral?.pageType ?? '';
}

export function getContextValue(key, fallback = undefined) {
  if (!key) {
    return fallback;
  }

  const context = getCoralContext();

  return Object.prototype.hasOwnProperty.call(context, key) ? context[key] : fallback;
}
