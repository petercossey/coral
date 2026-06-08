# Cart Drawer Technical Design

## Purpose

The cart drawer should give shoppers a fast cart summary without turning Coral into a client-rendered cart application. The drawer can render richer cart content over time, but the framework should keep server-rendered Handlebars as the baseline and use shared JavaScript state only where separate parts of the theme need to coordinate.

This document records the intended direction before implementation.

## Current Shape

- `templates/layout/base.html` mounts the cart drawer with `data-coral-component="cart-drawer"` and a `data-cart-url` prop.
- `templates/common/header.html` renders the header cart link from the Stencil `cart` object.
- `assets/js/theme/header/header-cart.js` intercepts standard cart-link clicks, calls `openCartDrawer()`, and updates its own count/subtotal from shared cart state.
- `assets/js/state/cart.js` owns `cartDrawerOpen`, the known cart ID, and a normalized `cartSummary`.
- `assets/js/components/cart-drawer/cart-drawer.client.jsx` owns the drawer UI shell and renders the current cart summary.

The existing structure is the right foundation: server-rendered markup can trigger a Preact-owned leaf through shared state.

## Goals

- Show useful cart summary content immediately when the drawer opens.
- Avoid blocking the drawer opening animation on a network request.
- Keep cart data in shared state so header links, product forms, and the drawer can coordinate.
- Let any cart-changing interaction publish cart updates through the same state module.
- Preserve normal links and forms as fallbacks where practical.
- Keep the first implementation small and easy to replace as cart requirements become clearer.

## Non-Goals

- Do not replace the cart page with Preact.
- Do not implement a generic client-side data framework.
- Do not add Stencil Utils, GraphQL, or a new API folder until there is a concrete need.
- Do not implement add, update, remove, coupon, gift certificate, or shipping-estimator behavior in the first cart drawer pass.
- Do not rely on the drawer component as the sole source of cart truth.

## Data Ownership

`assets/js/state/cart.js` should become the cart coordination module. The drawer should consume and request state transitions, but it should not own the cart data source.

Proposed public state and actions:

```js
export const cartDrawerOpen = signal(false);
export const cartSummary = signal(null);
export const cartStatus = signal('idle');
export const cartError = signal(null);

export function openCartDrawer() {}
export function closeCartDrawer() {}
export function seedCartSummary(summary) {}
export function replaceCartSummary(summary, metadata) {}
export function markCartStale(reason) {}
export function ensureCartFresh(options) {}
```

The module can keep private details such as `lastFetchedAt`, `inFlightRefresh`, and any fetch helper. If multiple features later need direct Storefront API access, move transport helpers into a small dedicated module then.

## Initial Server Seed

Stencil can provide immediate cart data at render time, but only data explicitly made available to the client should be assumed by JavaScript.

Important constraints:

- `cart: true` in page front matter tells Stencil to retrieve cart data for that page.
- `{{cart_id}}` is a global cart identifier when a cart exists.
- `window.Coral.context` only contains values explicitly passed through `{{inject}}`.
- The header already renders `cart.quantity` and `cart.sub_total.formatted`.

For the first implementation, prefer simple props on the cart drawer mount:

```html
<div
  data-coral-component="cart-drawer"
  data-cart-url="{{urls.cart}}"
  data-cart-id="{{cart_id}}"
  data-cart-quantity="{{#if cart.quantity}}{{cart.quantity}}{{else}}0{{/if}}"
  data-cart-subtotal="{{#if cart.sub_total.formatted}}{{cart.sub_total.formatted}}{{else}}$0.00{{/if}}"
></div>
```

That keeps the seed narrow and avoids injecting a large cart object. If the drawer needs server-rendered line items before the first fetch, revisit this with a purpose-built `{{inject "cartSummary" ...}}` shape or a small Handlebars partial.

## Normalized Cart Shape

The drawer should not render directly from raw Stencil, REST, or GraphQL response shapes. Normalize into a small internal structure:

```js
{
  id: string | null,
  quantity: number,
  subtotal: {
    value: number | null,
    formatted: string,
    currencyCode: string | null,
  },
  total: {
    value: number | null,
    formatted: string,
    currencyCode: string | null,
  },
  items: [
    {
      id: string,
      type: 'physical' | 'digital' | 'giftCertificate' | 'custom' | 'unknown',
      name: string,
      url: string | null,
      imageUrl: string | null,
      brand: string | null,
      sku: string | null,
      quantity: number,
      options: [{ name: string, value: string }],
      isMutable: boolean,
    },
  ],
  source: 'server' | 'rest-storefront' | 'graphql-storefront' | 'mutation',
  stale: boolean,
  updatedAt: number,
}
```

For the first pass, `items` can remain empty and the drawer can show quantity/subtotal plus a link to the full cart.

Price labels need deliberate mapping. Stencil `cart.sub_total.formatted`, REST `baseAmount`, and REST `cartAmount` are not identical concepts. The drawer should only label a value "Subtotal" when it is using a subtotal-like source, and should label the final cart amount "Total" when that is what the API provides.

## Authoritative Refresh

When richer content is needed, use the REST Storefront Carts API as the default authoritative refresh path:

```js
fetch('/api/storefront/carts', {
  credentials: 'include',
  headers: { Accept: 'application/json' },
});
```

Reasons:

- It runs in the shopper's current hosted storefront session.
- It does not need BigCommerce-specific tokens in browser code.
- It returns cart ID, amounts, currency, version, and line items.
- It supports future add, update, remove, and currency operations.

The drawer should open immediately and request a refresh through shared state:

1. Open drawer from existing `cartDrawerOpen`.
2. Render server-seeded summary immediately.
3. If state is stale or has never been fetched, start `ensureCartFresh()`.
4. Replace state when the response returns.
5. Show an inline recoverable error if refresh fails, while keeping any known seed data visible.

## Freshness Policy

Start conservative:

- Treat server seed as usable but stale.
- Refresh on first drawer open when a cart ID or nonzero quantity exists.
- Refresh after cart mutations when the mutation response is partial or absent.
- Deduplicate concurrent refreshes with one in-flight promise.
- Do not poll.

Later, if needed, add a simple stale window such as 30 seconds to avoid refetching on repeated open/close interactions.

## Cart Mutations

Any cart-changing feature should update shared cart state, regardless of where the interaction lives.

Examples:

- Product add-to-cart module receives a mutation response.
- Drawer removes an item.
- Drawer changes item quantity.
- Cart page updates an item and wants the header count to stay accurate.

Mutation handling should follow this rule:

- If the response contains a complete cart, normalize it and call `replaceCartSummary()`.
- If the response contains only partial cart data, update the known fields, call `markCartStale()`, and refresh when appropriate.
- If a mutation fails because of cart version or stale state, refresh and show the original error in the initiating UI.

REST Storefront cart responses include a `version` field that can support optimistic concurrency for future updates. Preserve it in private state once drawer mutations are implemented.

## API Options

### REST Storefront API

Use this as the default for the cart drawer refresh and likely drawer mutations.

Pros:

- Native to hosted storefront sessions.
- No browser-exposed GraphQL token.
- Direct cart operations.
- Good fit for a minimal Stencil starter.

Cons:

- Response shape differs from Stencil `cart`.
- Rich product joins are limited to what cart line items expose.

### GraphQL Storefront API

Keep this available for future needs, but do not start here.

Pros:

- Flexible selection set.
- Can fetch related storefront data in the graph.
- Supports cart and checkout operations.

Cons:

- Requires passing `{{settings.storefront_api.token}}` into browser code.
- Adds a query/mutation layer earlier than Coral needs.
- Overkill for a basic cart summary.

### Stencil Utils

Consider this when Coral adds classic AJAX product forms or server-rendered cart fragments.

Pros:

- Established BigCommerce theme abstraction.
- Provides cart add, update, remove, quantity, and rendered-content helpers.
- Matches Cornerstone's preview-cart style.

Cons:

- Adds a dependency and older theme conventions.
- Encourages HTML-fragment replacement instead of normalized state.
- Less aligned with Coral's small native-module direction.

## Drawer Responsibilities

The Preact drawer should:

- Render open/closed state.
- Render current cart summary state.
- Trigger `ensureCartFresh()` on open when the state module says refresh is needed.
- Call exported cart actions for future item mutations.
- Keep links to cart and checkout as normal anchors.
- Show loading and error states without hiding known cart data.

The drawer should not:

- Fetch raw APIs directly.
- Parse raw REST or GraphQL response shapes.
- Own cart mutation concurrency.
- Update unrelated DOM such as the header cart count directly.

## Header Responsibilities

The header cart link should remain server-rendered and progressively enhanced.

Near-term:

- It continues to display server-rendered quantity and subtotal.
- It opens the drawer through `openCartDrawer()`.
- It can read `cartSummary` and update its count/subtotal after client-side cart changes.
- It should update only its own markup rather than letting the drawer or mutation modules reach into the header DOM.

## Events

Use state for current cart values. Use events for moments other modules may observe.

Possible future topics:

- `cart:seeded`
- `cart:refreshed`
- `cart:stale`
- `cart:item-added`
- `cart:item-updated`
- `cart:item-removed`

Do not add these events until at least one non-state consumer needs them.

## Implementation Plan

### Phase 1: Static Summary From Server Seed

- Add seed props to the drawer mount in `templates/layout/base.html`.
- Expand `assets/js/state/cart.js` with `cartSummary` and `seedCartSummary()`.
- Seed cart state from `cart-drawer.client.jsx` props during mount.
- Render quantity, subtotal, empty state, and cart link in the drawer.
- Keep item rows out of scope.

### Phase 2: Refresh On Open

- Add `ensureCartFresh()` to `assets/js/state/cart.js`.
- Fetch `/api/storefront/carts` with `credentials: 'include'`.
- Normalize REST cart response.
- Render loading and error states in the drawer.
- Keep known server seed visible while refresh is pending.

### Phase 3: Cart-Aware Theme Interactions

- Add product add-to-cart theme modules only when the relevant server-rendered markup exists.
- Route successful add-to-cart responses into shared cart state.
- Open the drawer on successful add when requested by markup.
- Keep non-JavaScript form submission fallback.

### Phase 4: Drawer Mutations

- Add quantity and remove controls to drawer item rows.
- Use REST Storefront cart item endpoints.
- Preserve and send cart `version` when available.
- Refresh after conflict or partial mutation responses.

## Open Questions

- Should the first drawer show only subtotal, or subtotal plus a "calculated at checkout" note?
- Should checkout links appear in the drawer before the theme has checkout URL handling finalized?
- Should cart line items be fetched on every first open, or only after the first cart-changing interaction?
- How should the drawer represent gift certificates and custom items in the minimal UI?
- When a cart becomes empty through API removal, should the drawer keep showing an empty state or redirect/reload on cart pages?

## Decision Summary

Build the cart drawer around shared cart state. Seed that state from server-rendered Stencil data for immediate display, then use REST Storefront as the first authoritative refresh path when richer cart content is needed. Keep GraphQL and Stencil Utils as future options, not first-pass dependencies.
