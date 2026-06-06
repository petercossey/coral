// Explicit client component registry.
// Keys must match data-coral-component values in Handlebars partials.
// Values stay as dynamic imports so Vite only loads components present on the page.
export const componentRegistry = {
  'cart-drawer': () => import('../../../templates/components/cart-drawer/cart-drawer.client.jsx'),
  counter: () => import('../../../templates/components/counter/counter.client.jsx'),
};
