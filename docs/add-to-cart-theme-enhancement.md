# Add To Cart Theme Enhancement

## Purpose

Product cards already render server-side add-to-cart links. This feature should enhance those links with a small AJAX-style interaction while preserving the normal `href` fallback.

This is a Coral theme module, not a Preact component. The markup remains Handlebars-owned, and the JavaScript only intercepts eligible clicks.

## Current Markup

Featured product cards currently render add-to-cart anchors like this:

```html
<a
  class="inline-flex shrink-0 items-center justify-center border border-slate-950 px-4 py-2 text-sm font-medium"
  href="/cart.php?action=add&amp;product_id=107"
  data-event-type="product-click"
  data-button-type="add-cart"
  data-product-id="107"
>
  Add to cart
</a>
```

The enhancement should use a Coral-specific hook rather than relying on classes or BigCommerce analytics-style attributes:

```html
<a
  href="{{add_to_cart_url}}"
  data-coral-add-to-cart
  data-product-id="{{id}}"
>
  Add to cart
</a>
```

Keep existing analytics attributes if the template needs them, but do not use them as the enhancement boundary.

## Goals

- Preserve the server-rendered link as the fallback path.
- Use the REST Storefront Cart API for the enhanced add-to-cart mutation.
- Enhance simple product-card add-to-cart links only.
- Prevent duplicate submission while a request is in flight.
- Keep user feedback minimal for the first pass.
- Emit a Coral event after a successful add so future cart features can react.
- Keep the implementation as a plain theme setup module under `assets/js/theme/cart/`.

## Non-Goals

- Do not replace product cards with Preact.
- Do not handle product options, quantity controls, or full product forms in this pass.
- Do not update the cart drawer or header cart count yet.
- Do not introduce Stencil Utils, GraphQL, a broad cart API abstraction, or a generic enhancement registry yet.
- Do not add a full toast, alert, or inline error system yet.
- Do not AJAX-enhance pre-order links yet; leave `pre_order_add_to_cart_url` anchors as normal links.

## Endpoint Decision

Use the existing server-rendered add-to-cart URL only as the progressive-enhancement fallback:

```text
/cart.php?action=add&product_id=<id>
```

BigCommerce documents `/cart.php` add-to-cart URLs as a supported storefront path for adding a product by `product_id`, `sku`, and optional `qty`, and its docs show same-origin JavaScript `GET` requests to those URLs for chained add flows. That confirms the URL can be used programmatically in a hosted storefront, but it is still a storefront URL flow rather than a structured API.

Local testing showed the add operation can succeed while the enhanced `fetch()` still receives a `500` after following a redirect to a post-add `/cart.php?suggest=<id>` page. That means `response.ok` on the final `/cart.php` response is not a reliable signal for add success. The module should not depend on `/cart.php` response status, redirects, HTML, or opaque storefront behavior for the enhanced path.

Use the REST Storefront Cart API for the enhanced mutation instead:

```text
POST /api/storefront/carts
POST /api/storefront/carts/{cartId}/items
```

For a shopper with no known cart ID, create a cart with the desired line item:

```js
await fetch('/api/storefront/carts', {
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
        quantity: 1,
      },
    ],
  }),
});
```

For a shopper with a known cart ID, add the item to the existing cart:

```js
await fetch(`/api/storefront/carts/${cartId}/items`, {
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
        quantity: 1,
      },
    ],
  }),
});
```

Do not intentionally call `POST /api/storefront/carts` when Coral already knows the current cart ID. BigCommerce's docs describe that endpoint as cart creation, while adding to an existing cart requires the cart ID in `/api/storefront/carts/{cartId}/items`. If Coral has no reliable cart ID, creating a cart with the line item is the correct simple path.

Only enhance links that have:

- `data-coral-add-to-cart`
- a valid numeric `data-product-id`
- a same-origin `/cart.php?action=add...` fallback `href`

If the link has no usable product ID, has no usable fallback `href`, points off-origin, uses another cart action, or is a pre-order URL, let the browser follow the link normally.

## Cart Context And State

Do not assume an existing cart is automatically present in `window.Coral.context`. Stencil can expose cart information to templates, but client JavaScript only receives data that templates explicitly seed through `{{inject}}` or data attributes.

Useful existing Stencil context:

- `{{cart_id}}` is a global cart identifier when a cart exists.
- `cart: true` in page front matter tells Stencil to retrieve cart data for that page.
- The current base layout seeds narrow cart drawer props with `data-cart-id`, `data-cart-quantity`, and `data-cart-subtotal`.
- `assets/js/state/cart.js` owns shared cart state and should be the eventual place to read or replace the known cart summary.

First pass cart ID policy:

1. Prefer a cart ID already seeded into Coral cart state.
2. If the state module does not yet expose a current cart ID, add the smallest state helper needed rather than querying unrelated DOM from the add-to-cart module.
3. If no cart ID is known, call `POST /api/storefront/carts` with the line item.
4. If a known cart ID add fails because the cart no longer exists or is stale, log the error in this pass. A later cart coordinator can refresh with `GET /api/storefront/carts`, clear stale state, and retry when the UX requires it.

The REST mutation response returns structured cart JSON. The add-to-cart module can emit it immediately for future listeners, and shared cart state can normalize it once cart drawer/header updates are introduced.

## Stencil Utils Research

Cornerstone imports `@bigcommerce/stencil-utils` for product form add-to-cart behavior, not for product-card add-to-cart anchors. Its product detail flow calls:

```js
utils.api.cart.itemAdd(new FormData(form), callback);
```

In `stencil-utils`, `itemAdd()` wraps `handleItemAdd()`, which posts `FormData` to the Stencil remote endpoint `/cart/add`. The library also includes cart helpers for cart reads, quantity, updates, content rendering, gift wrapping, coupons, and event hooks.

That is useful for a full product form with options and legacy Cornerstone behavior, but it is more dependency and surface area than Coral needs for a product-card link enhancement. Coral should keep this first pass as native `fetch()` against the REST Storefront Cart API.

Revisit Stencil Utils or a small Coral wrapper only if later product form work needs enough of these behaviors to justify it:

- Submitting option-heavy product forms as `FormData`.
- Matching BigCommerce's remote cart event behavior.
- Reusing built-in cart content rendering helpers.
- Handling locale-aware cart requests beyond what a simple link enhancement needs.

## Other Endpoint Options

### `/cart.php` Add URLs

Keep `/cart.php?action=add...` as the server-rendered fallback URL.

Pros:

- Already provided by Stencil as `add_to_cart_url`.
- Works with no JavaScript.
- Supports `product_id`, `sku`, optional `qty`, optional `couponcode`, and `action=buy`.

Cons:

- It is a storefront URL flow, not a structured JSON API.
- It can redirect to post-add pages such as `/cart.php?suggest=<id>`.
- A successful add can still result in a failed final fetched page in local Stencil.
- It does not provide a clean response shape for shared cart state.

### REST Storefront Cart API

Use this for the enhanced path.

Pros:

- Runs in the shopper's same-origin hosted storefront session.
- Does not require BigCommerce-specific tokens in browser code.
- Returns structured cart JSON.
- Supports create, add, update quantity, remove, delete cart, currency, and cart `version`.
- Aligns with the cart drawer's planned authoritative refresh path.

Cons:

- Requires cart ID handling for existing carts.
- Response shape must be normalized before shared UI such as the drawer or header renders from it.
- Product-card links need a valid `data-product-id`; the enhancement cannot rely solely on the fallback URL.

### GraphQL Storefront API

The Storefront GraphQL API is also out of scope for this first pass. It can mutate carts, but it adds token/authentication concerns and a GraphQL operation layer for a tiny enhancement that already has a supported server-rendered URL fallback.

## Module Shape

The module should follow the JavaScript guide's theme module pattern:

```text
assets/js/theme/cart/add-to-cart.js
```

Export a setup function:

```js
export function setupAddToCartButtons({ root = document } = {}) {}
```

`assets/js/theme/global.js` can import and call the setup function when the feature is implemented. That keeps add-to-cart behavior globally available for product cards on home, category, search, and other listing pages.

The setup should query only:

```js
const selector = 'a[data-coral-add-to-cart]';
```

It should ignore non-standard clicks so browser behavior remains intact for new tabs, copy link, keyboard/browser modifiers, and similar interactions.

## First-Pass Behavior

On a standard click:

1. Validate that the link has a valid numeric product ID and an eligible same-origin `/cart.php?action=add` fallback URL.
2. If the link is not eligible, allow normal navigation.
3. Prevent normal navigation.
4. If the link is already busy, return.
5. Mark the link busy.
6. Read the known cart ID from Coral cart state if available.
7. If a cart ID exists, request `POST /api/storefront/carts/{cartId}/items`.
8. If no cart ID exists, request `POST /api/storefront/carts`.
9. If the response is not OK, throw an error.
10. Parse the JSON response.
11. On success, emit an event with the product ID, quantity, fallback URL, cart response, source type, and source element.
12. On failure, log the error.
13. Restore the link to its idle state.

The eligibility check happens before `event.preventDefault()`. This keeps the enhancement narrow and avoids breaking unusual storefront links. The REST request happens only after the fallback URL has been proven to represent a normal direct add link.

## Link State

Keep state small and local to the element:

- Store a busy marker with `data-coral-busy="true"` or a private `WeakSet`.
- Set `aria-busy="true"` while submitting.
- Consider disabling repeated activation by setting `aria-disabled="true"` during the request.
- Preserve the original text unless a later design adds a real loading or success label.

Because the source element is an anchor, avoid pretending it is a disabled form button. The important first-pass behavior is duplicate-click prevention and clear internal state.

## Events

Use `assets/js/events.js` so the public browser event is namespaced as `coral:cart:item-added`.

Emit the unprefixed topic:

```js
emit('cart:item-added', {
  productId,
  quantity,
  fallbackUrl,
  cart,
  cartId: cart.id,
  source: 'product-card',
  element: link,
});
```

This event is a notification that the initiating REST mutation completed. It can include the structured cart JSON returned by the Storefront Cart API, but shared cart state should still own normalization and durable state replacement. Do not include raw fallback URL response HTML because the enhanced path should not fetch `/cart.php`.

Future cart drawer or header modules can listen for the event and decide whether to normalize the returned cart, refresh cart state, open the drawer, or update visible counts.

Theme-wide cart concerns for later phases:

- A shared cart state module should own durable cart data such as ID, summary, line items, freshness, loading, and errors.
- Mutation modules should announce successful mutations, but state modules should decide when and how to refresh cart data.
- Multiple mutation sources can exist: product cards, product forms, cart drawer quantity controls, remove buttons, coupons, and gift certificates.
- Once multiple mutations exist, cart requests need a concurrency policy so stale refreshes do not overwrite newer state.
- The cart drawer should not reach into product cards or header DOM. It should react to shared state and explicit events.
- The header count should update from normalized cart state, not by guessing from an individual add event.
- If a future success behavior opens the drawer, make that an explicit option or listener rather than a hidden side effect of the add-to-cart module.

## Error Handling

For the first implementation, errors can go to the browser console. That includes request failures, unexpected response status values, JSON parse failures, and BigCommerce rejection cases.

If the REST request fails, restore the link to its idle state. A future pass can decide whether to navigate to the original `href`, show inline feedback, open a toast, refresh cart state and retry, or route the shopper to the product page.

The REST response is structured, but this phase still does not add a shopper-facing error system. The implementation should not silently mark a failed add as successful. If the API returns validation details for stock limits or required options, log them for now and leave visible handling for a later UX pass.

## Accessibility

The baseline anchor is already accessible because it is a real link to the add-to-cart URL.

The enhancement should keep accessibility work minimal:

- Do not remove the `href`.
- Preserve the link text.
- Use `aria-busy` during submission.
- Avoid injecting live regions until the theme has a real visible success/error pattern.

## Open Questions For Later Phases

- How should rejected adds, stock limits, and required options be represented to shoppers?
- Should failed enhanced requests fall back to full navigation automatically?
- When should the theme introduce a shared cart mutation/refetch coordinator?
- Should product forms use a Coral `FormData` implementation, Stencil Utils, or the REST Storefront Cart API?
- Should the add-to-cart module retry through cart refresh if a known cart ID is stale?

The stable decisions for the first implementation are the module location, template hook, `/cart.php?action=add` fallback behavior, REST Storefront Cart API enhanced mutation, normal pre-order links, and the `cart:item-added` event topic.
