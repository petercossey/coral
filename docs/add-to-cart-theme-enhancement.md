# Add To Cart Theme Enhancement

## Purpose

Product cards already render server-side add-to-cart links. This feature should enhance those links with a small AJAX-style interaction while preserving the normal `href` fallback.

This is a Coral theme module, not a Preact component. The markup remains Handlebars-owned, and the JavaScript only intercepts eligible clicks.

## Markup Hook

Product cards render add-to-cart anchors with a Coral-specific hook:

```html
<a
  href="{{add_to_cart_url}}"
  data-coral-add-to-cart
  data-product-id="{{id}}"
>
  Add to cart
</a>
```

The hook is the enhancement boundary, not classes or BigCommerce analytics-style attributes. Keep analytics attributes such as `data-event-type` if the template needs them, but do not enhance from them.

## Goals

- Preserve the server-rendered link as the fallback path.
- Use the REST Storefront Cart API for the enhanced add-to-cart mutation.
- Enhance simple product-card add-to-cart links only.
- Prevent duplicate submission while a request is in flight.
- Keep user feedback minimal for the first pass.
- Route successful cart responses through shared cart state.
- Emit a Coral event after a successful add so future cart features can react.
- Keep the implementation as a plain theme setup module under `assets/js/theme/cart/`.

## Non-Goals

- Do not replace product cards with Preact.
- Do not handle product options, quantity controls, or full product forms in this pass.
- Do not let the add-to-cart module update the cart drawer or header DOM directly.
- Do not introduce Stencil Utils, GraphQL, a broad cart API abstraction, or a generic enhancement registry yet.
- Do not make add-to-cart own notification rendering.
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
- The base layout seeds narrow cart drawer props with `data-cart-id`, `data-cart-quantity`, and `data-cart-subtotal`.
- `assets/js/state/cart.js` owns shared cart state, the known cart ID, and cart summary replacement.

Cart ID policy:

1. Read the known cart ID from cart state with `getCurrentCartId()` rather than querying unrelated DOM.
2. If no cart ID is known, call `POST /api/storefront/carts` with the line item.
3. If a known cart ID add fails because the cart no longer exists or is stale, the error is logged and a recoverable failure moment is emitted. A later cart coordinator can refresh with `GET /api/storefront/carts`, clear stale state, and retry when the UX requires it.

The REST mutation response returns structured cart JSON. The add-to-cart module passes that response to shared cart state before emitting any success event. Shared state owns normalization and durable state replacement; the module does not update header, drawer, or other cart UI directly.

The module calls `replaceCartSummary(cart, { source: 'rest-storefront' })` when the REST response returns a complete cart object. That lets the header cart link and cart drawer render from the same `cartSummary` signal.

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

The module follows the JavaScript guide's theme module pattern:

```text
assets/js/theme/cart/add-to-cart.js
```

It exports a setup function:

```js
export function setupAddToCartButtons({ root = document } = {}) {}
```

`assets/js/theme/global.js` imports and calls the setup function, keeping add-to-cart behavior globally available for product cards on home, category, search, and other listing pages.

The setup queries only:

```js
const selector = 'a[data-coral-add-to-cart]';
```

It ignores non-standard clicks so browser behavior remains intact for new tabs, copy link, keyboard/browser modifiers, and similar interactions.

## Behavior

On a standard click, the module:

1. Validates that the link has a valid numeric product ID and an eligible same-origin `/cart.php?action=add` fallback URL.
2. If the link is not eligible, allows normal navigation.
3. Prevents normal navigation.
4. If the link is already busy, returns.
5. Marks the link busy with a temporary busy label.
6. Reads the known cart ID from Coral cart state if available.
7. If a cart ID exists, requests `POST /api/storefront/carts/{cartId}/items`.
8. If no cart ID exists, requests `POST /api/storefront/carts`.
9. If the response is not OK, throws an error.
10. Parses the JSON response.
11. On success, passes the cart response to shared cart state.
12. Emits an event with the product ID, quantity, fallback URL, cart response, source type, and source element.
13. On failure, logs the error and emits a recoverable failure moment.
14. Restores the link to its idle state and original label.

The eligibility check happens before `event.preventDefault()`. This keeps the enhancement narrow and avoids breaking unusual storefront links. The REST request happens only after the fallback URL has been proven to represent a normal direct add link.

## Link State

Keep state small and local to the element:

- Store a busy marker with `data-coral-busy="true"`.
- Set `aria-busy="true"` and `aria-disabled="true"` while submitting.
- Swap the link text to a busy label such as "Adding..." during the request, and restore the original text afterwards.

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

This event is a notification that the initiating REST mutation completed. It can include the structured cart JSON returned by the Storefront Cart API, but shared cart state owns normalization and durable state replacement. Emit the event after the state update so event listeners see current cart state when they run. Do not include raw fallback URL response HTML because the enhanced path should not fetch `/cart.php`.

The notifications theme module listens for these moments and enqueues shopper feedback, including an "Open cart" action on success. Visible count and amount updates render from `cartSummary`, not from the event payload.

Failure handling emits `cart:item-add-failed` after restoring the local interaction state. Notification modules listen for that recoverable moment; add-to-cart does not render notification UI directly.

Theme-wide cart concerns for later phases:

- A shared cart state module should own durable cart data such as ID, summary, line items, freshness, loading, and errors.
- Mutation modules should pass successful mutation responses to state, then announce the mutation when a moment notification is useful.
- Multiple mutation sources can exist: product cards, product forms, cart drawer quantity controls, remove buttons, coupons, and gift certificates.
- Once multiple mutations exist, cart requests need a concurrency policy so stale refreshes do not overwrite newer state.
- The cart drawer should not reach into product cards or header DOM. It should react to shared state and explicit events.
- The header count should update from normalized cart state, not by guessing from an individual add event.
- If a future success behavior opens the drawer, make that an explicit option or listener rather than a hidden side effect of the add-to-cart module.

## Error Handling

For this foundation, errors can go to the browser console and emit a recoverable failure event. That includes request failures, unexpected response status values, JSON parse failures, and BigCommerce rejection cases.

If the REST request fails, restore the link to its idle state. A future pass can decide whether to navigate to the original `href`, refresh cart state and retry, show richer error copy, or route the shopper to the product page.

The REST response is structured, but the add-to-cart module should not silently mark a failed add as successful. If the API returns validation details for stock limits or required options, log them for now and leave richer visible handling for a later UX pass.

## Accessibility

The baseline anchor is already accessible because it is a real link to the add-to-cart URL.

The enhancement should keep accessibility work minimal:

- Do not remove the `href`.
- Preserve the link text.
- Use `aria-busy` during submission.
- Leave live-region behavior to the shared notification layer.

## Open Questions For Later Phases

- How should rejected adds, stock limits, and required options be represented to shoppers?
- Should failed enhanced requests fall back to full navigation automatically?
- When should the theme introduce a shared cart mutation/refetch coordinator?
- Should product forms use a Coral `FormData` implementation, Stencil Utils, or the REST Storefront Cart API?
- Should the add-to-cart module retry through cart refresh if a known cart ID is stale?

The stable decisions are the module location, template hook, `/cart.php?action=add` fallback behavior, REST Storefront Cart API enhanced mutation, shared cart state update, normal pre-order links, and the `cart:item-added` / `cart:item-add-failed` event topics.
