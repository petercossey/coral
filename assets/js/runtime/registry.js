// Explicit client component registry.
// Keys must match data-coral-component values in Handlebars partials.
// Values stay as dynamic imports so Vite only loads components present on the page.
export const componentRegistry = {
  'cart-drawer': () => import('../components/cart-drawer/cart-drawer.client.jsx'),
  notifications: () => import('../components/notifications/notifications.client.jsx'),
  'search-preview': () => import('../components/search-preview/search-preview.client.jsx'),
};
