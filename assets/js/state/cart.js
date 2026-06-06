import { signal } from '@preact/signals';

// Shared cart state starts with the only cross-root concern we need today:
// the server-rendered cart link can open the Preact-owned drawer.
export const cartDrawerOpen = signal(false);

export function openCartDrawer() {
  cartDrawerOpen.value = true;
}

export function closeCartDrawer() {
  cartDrawerOpen.value = false;
}
